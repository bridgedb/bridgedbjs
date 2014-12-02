/* @module Organism */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utils = require('./utils.js');

/**
 * Used internally to create a new Organism instance
 * @class
 * @protected
 * @alias organism
 * @memberof bridgeDb
 * @param {object} instance
 */
var Organism = function(instance) {
  'use strict';

  /**
   * Create a Node.js/Highland stream through which entity references
   * can be piped to return their associated organism.
   *
   * @return {Stream} entityReferenceToOrganismTransformationStream
   */
  var createEntityReferenceToOrganismTransformationStream = function() {
    return highland.pipeline(function(sourceStream) {
      return highland(sourceStream).flatMap(getByEntityReference);
    });
  };

  /**
   * Get all organisms currently supported by BridgeDb.
   *
   * @return {Stream<object>} organism
   * @return {object} organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {object[]} organism.name
   * @return {string} organism.name.en English name, when available.
   * @return {string} organism.name.la Unabbreviated Latin name.
   */
  var getAll = function() {
    return Utils.runOnce('organisms',
        getAllFromRemoteSource);
  };

  var getAllFromRemoteSource = function() {
    var path = '/contents';
    var source = instance.config.apiUrlStub + path;

    return highland(request({
      url: source,
      withCredentials: false
    })
    .pipe(csv(csvOptions)))
    .map(function(array) {
      var names = {};
      var englishName = array[0];
      var latinName = array[1];

      // Note: I intentionally used 'null' as
      // a string, not a native value, because
      // BridgeDb returns the string value
      if (englishName !== 'null') {
        names.en = englishName;
      }
      if (latinName !== 'null') {
        names.la = latinName;
      }

      return {
        '@context': [
          {
            name: {
              '@id': 'biopax:name',
              '@container': '@language'
            }
          },
          'http://test2.wikipathways.org/v2/contexts/organism.jsonld'
        ],
        name: names
      };
    })
    .collect();
  };

  /**
   * @private
   *
   * If the organism is not specified but the BridgeDb system code and
   * entity reference identifier are, we can identify the species by
   * trying species until we find one that exists for the system code
   * and identifier.
   *
   * @param bridgeDbSystemCode
   * @param identifier
   * @return {Stream<object>} organism
   * @return {object} organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {Stream<object>} organism
   * @return {object[]} organism.name
   * @return {string} organism.name.en English name, when available.
   * @return {string} organism.name.la Unabbreviated Latin name.
   */
  var getByBridgeDbSystemCodeAndIdentifier =
    function(bridgeDbSystemCode, identifier) {
    var exists = highland.curry(instance.entityReference.exists,
        bridgeDbSystemCode, identifier);

    return getAll()
    // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
    .sequence()
    .flatFilter(function(organism) {
      return exists(organism.name.la);
    })
    .head()
    .map(function(organism) {
      return organism;
    });
  };

  /**
   * Identifies the organism for the provided entity reference and returns all
   * the data BridgeDb has about that organism, which currently is the Latin name
   * and, when available, the English name.
   *
   * @param {object} entityReference See bridgeDb.entityReference.enrich for information
   *                                  on acceptable entity reference inputs.
   * @return {Stream<object>} organism
   * @return {object[]} organism.name
   * @return {string} organism.name.en English name, when available.
   * @return {string} organism.name.la Unabbreviated Latin name.
   */
  function getByEntityReference(entityReference) {
    // TODO as part of the build process, query all species like this:
    // http://webservice.bridgedb.org/Human/sourceDataSources
    // http://webservice.bridgedb.org/Human/targetDataSources
    // to get a listing of which data sources go with which species.
    // Save that data as a JSON file.
    // Then use those limitations in this query.

    return instance.entityReference.enrich(entityReference, {
      bridgeDbXrefsUrl: false,
      dataSource: true,
      organism: false
    })
    .flatMap(function(entityReference) {
      var organism = entityReference.organism;
      if (!!organism) {
        return highland([organism]).map(normalize);
      }

      var bridgeDbSystemCode = entityReference.bridgeDbSystemCode ||
        _.isArray(entityReference.alternatePrefix) &&
        entityReference.alternatePrefix[0];

      var identifier = entityReference.identifier;

      if (!!bridgeDbSystemCode && !!identifier) {
        return getByBridgeDbSystemCodeAndIdentifier(
          bridgeDbSystemCode, identifier);
      } else {
        console.warn('Cannot get organism by entityReference.');
        return entityReference;
      }
    });
  }

  /**
   * @private
   *
   * Each BridgeDb instance has one organism name associated with it. This
   * function gets the organism name once and then always returns that organism name.
   *
   * @param {object|string} input
   * @param {object} [inputType='Organism']
   * @return {Stream<string>} organismName Unabbreviated Latin name.
   * @return {string}
   */
  function getInstanceOrganismName(input, inputType) {
    function initMethod() {
      inputType = inputType || 'Organism';
      if (inputType === 'Organism') {
        return convertToLatinName(input)
        .map(function(organismLatinName) {
          setInstanceOrganismName(organismLatinName);
          return organismLatinName;
        });
      } else if (inputType === 'EntityReference') {
        return getByEntityReference(input)
        .map(function(organism) {
          // returns either the organism name or false
          return !!organism.name && !!organism.name.la && organism.name.la;
        });
      } else {
        throw new Error('Unknown inputType: ' + inputType);
      }
    }

    return Utils.runOncePerInstance(
        instance,
        'organismName',
        initMethod
    );
  }

  /**
   * Normalize organism.
   *
   * @param {string|object} organism - Can be name in Latin (full like "Escherichia coli"
   *      or abbreviated like "E. coli") or English. In the future, we might include IRIs for organisms.
   * @return {Stream<object>} organism
   * @return {object[]} organism.name
   * @return {string} organism.name.en English name, when available.
   * @return {string} organism.name.la Unabbreviated Latin name.
   */
  function normalize(organism) {
    var organismIdentifier;
    if (_.isString(organism)) {
      organismIdentifier = organism;
    } else if (_.isPlainObject(organism)) {
      organismIdentifier = organism.name || organism.latin || organism.english;
    }

    if (!organismIdentifier) {
      console.log(organism);
      throw new Error('Cannot normalize above provided organism.');
    }

    var normalizedOrganismIdentifier =
      Utils.normalizeText(organismIdentifier);
    return getAll().sequence()
    .find(function(organism) {
      var names = organism.name;
      var latinName = names.la;
      var latinNameComponents = latinName.split(' ');
      var latinNameAbbreviated = latinNameComponents[0][0] +
        latinNameComponents[1];
      var englishName = names.en;
      return Utils.normalizeText(latinName) ===
        normalizedOrganismIdentifier ||
        Utils.normalizeText(latinNameAbbreviated) ===
          normalizedOrganismIdentifier ||
        Utils.normalizeText(englishName) === normalizedOrganismIdentifier;
    })
    .head();
  }

  /**
   * @private
   *
   * Convert organism to Latin name.
   *
   * @param {string} organismIdentifier - Can be name in Latin (full like "Escherichia coli"
   *      or abbreviated like "E. coli") or English. In the future, we might include IRIs for organisms.
   * @return {Stream<string>} organismName Full name in Latin
   * @return {string}
   */
  function convertToLatinName(organismIdentifier) {
    return normalize(organismIdentifier).map(function(organism) {
      // returns either the organism name or false
      return !!organism.name && !!organism.name.la && organism.name.la;
    });
  }

  /**
   * @private
   *
   * Set the current organism for this instance so we don't have to look it up every time.
   *
   * @param {string} organismLatinName Organism name.
   */
  function setInstanceOrganismName(organismLatinName) {
    instance.organismName = organismLatinName;
  }

  return {
    createEntityReferenceToOrganismTransformationStream:
      createEntityReferenceToOrganismTransformationStream,
    getAll:getAll,
    getByEntityReference:getByEntityReference,
    getInstanceOrganismName:getInstanceOrganismName,
    setInstanceOrganismName:setInstanceOrganismName
  };
};

exports = module.exports = Organism;
