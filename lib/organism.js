/* @module Organism */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

/**
 * Used internally to create a new Organism instance
 * @class
 * @protected
 * @alias organism
 * @memberof bridgedb
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
   * @return {Stream<array>} organisms
   * @return {object[]} organisms.organism
   * @return {object} organisms.organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {object[]} organisms.organism.name
   * @return {string} organisms.organism.en English name, when available
   * @return {string} organisms.organism.la Latin name
   */
  var getAll = function() {
    return Utilities.runOnce('organisms',
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
        '@context': {
          name: {'@id': 'biopax:name', '@container': '@language'}
        },
        name: names
      };
    })
    .collect();
  };

  /**
   * If the organism is not specified but the BridgeDb system code and
   * entity reference identifier are, we can identify the species by
   * trying species until we find one that exists for the system code
   * and identifier.
   *
   * @param {object} args
   * @return {Stream<object>} organism
   * @return {object} organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {object[]} organism.name
   * @return {string} organism.en English name, when available
   * @return {string} organism.la Latin name
   */
  function get(args) {
    args = args || {};
    var entityReference = args.entityReference;
    var bridgeDbSystemCode = args.bridgeDbSystemCode;
    var identifier = args.identifier;
    var by;
    if (!!bridgeDbSystemCode && !!identifier) {
      by = highland.curry(
          getByBridgeDbSystemCodeAndIdentifier,
          bridgeDbSystemCode,
          identifier
      );
    } else if (!!entityReference) {
      by = highland.curry(getByEntityReference, entityReference);
    }

    return by;
  }

  /**
   * Each BridgeDb instance has one organism name associated with it. This
   * function determines the organism name once and then always returns that organism name.
   *
   * @param {object} args
   * @return {Stream<string>} organism full name in Latin
   * @return {string}
   */
  function getInstanceOrganismName(args) {
    var initMethod = get(args)
    .map(function(organism) {
      // returns either the organism name or false
      return !!organism.name && !!organism.name.la && organism.name.la;
    });

    return Utilities.runOncePerInstance(
        instance,
        'organismName',
        initMethod
    );
  }

  /**
   * If the organism is not specified but the BridgeDb system code and
   * entity reference identifier are, we can identify the species by
   * trying species until we find one that exists for the system code
   * and identifier.
   *
   * @private
   *
   * @param bridgeDbSystemCode
   * @param identifier
   * @return {Stream<object>} organism
   * @return {object} organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {object[]} organism.name
   * @return {string} organism.en English name, when available
   * @return {string} organism.la Latin name
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
   * @param {object} entityReference
   * @param {string} entityReference.bridgeDbSystemCode
   * @param {string} entityReference.identifier - the identifier for the entity reference, e.g. '4292' for Entrez Gene.
   * @return {Stream<object>} organism
   * @return {string} organism.english English name, when available
   * @return {string} organism.latin Latin name
   */
  function getByEntityReference(entityReference) {
    // TODO as part of the build process, query all species like this:
    // http://webservice.bridgedb.org/Human/sourceDataSources
    // http://webservice.bridgedb.org/Human/targetDataSources
    // to get a listing of which data sources go with which species.
    // Save that data as a JSON file.
    // Then use those limitations in this query.

    return instance.dataSource.getByEntityReference(
      entityReference
    )
    .flatMap(function(dataSource) {
      var organism = dataSource.organism;
      if (!!organism) {
        return highland([organism]);
      }

      var bridgeDbSystemCode = dataSource.bridgeDbSystemCode ||
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
   * Take organism as specified by user and return organism as specified by BridgeDb
   *
   * @param {string} organismIdentifier - Can be Latin or English name. In the future, we might include IRIs for organisms.
   * @return {Stream<string>} organismName Latin organism name as used at BridgeDb
   * @return {string}
   */
  function normalize(organismIdentifier) {
    var normalizedOrganismIdentifier =
      Utilities.normalizeText(organismIdentifier);
    return getAll().sequence()
    .find(function(organism) {
      var names = organism.name;
      var latinName = names.la;
      var latinNameComponents = latinName.split(' ');
      var latinNameAbbreviated = latinNameComponents[0][0] +
        latinNameComponents[1];
      var englishName = names.en;
      return Utilities.normalizeText(latinName) ===
        normalizedOrganismIdentifier ||
        Utilities.normalizeText(latinNameAbbreviated) ===
          normalizedOrganismIdentifier ||
        Utilities.normalizeText(englishName) === normalizedOrganismIdentifier;
    })
    .map(function(organism) {
      // returns either the organism name or false
      return !!organism.name && !!organism.name.la && organism.name.la;
    });
  }

  /**
   * @private
   *
   * Set the current organism for this instance so we don't have to look it up every time.
   *
   * @param {string} providedOrganism Organism full name in Latin, e.g., Homo sapiens
   */
  function setInstanceOrganismName(providedOrganism) {
    getAll().find(function(organism) {
      return !!organism.name && !!organism.name.la &&
        (organism.name.la === providedOrganism);
    })
    .map(function(organism) {
      instance.organismName = organism.name.la;
    });
  }

  return {
    createEntityReferenceToOrganismTransformationStream:
      createEntityReferenceToOrganismTransformationStream,
    get:get,
    getAll:getAll,
    getByEntityReference:getByEntityReference,
    normalize:normalize,
    getInstanceOrganismName:getInstanceOrganismName,
    setInstanceOrganismName:setInstanceOrganismName
  };
};

exports = module.exports = Organism;
