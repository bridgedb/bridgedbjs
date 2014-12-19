/* @module Organism */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var JsonldMatcher = require('./jsonld-matcher.js');
var Utils = require('./utils.js');

/**
 * Used internally to create a new Organism instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
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
   * @return {Stream<Object>} organism
   * @return {Object} organism['@context'] JSON-LD context. You can ignore this.
   * @return {Object[]} organism.name
   * @return {String} organism.name.en English name, when available.
   * @return {String} organism.name.la Full Latin name.
   */
  var getAll = function() {
    function init() {
      var path = '/contents';
      var source = instance.config.baseIri + path;

      return highland(request({
        url: source,
        withCredentials: false
      })
      .pipe(csv(csvOptions)))
      .map(function(array) {
        var names = {};
        var englishName = array[0];
        var latinName = array[1];

        // Note: I intentionally used 'null' as a string, not a native value,
        // because BridgeDb returns the string value
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
      });
    }

    return Utils._runOnceGlobal('organisms', init);
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
   * @return {Stream<Object>} organism
   * @return {Object} organism['@context'] JSON-LD context. You can ignore this if
   *                                                  you don't care about semantics.
   * @return {Stream<Object>} organism
   * @return {Object[]} organism.name
   * @return {String} organism.name.en English name, when available.
   * @return {String} organism.name.la Full Latin name.
   */
  var _getByBridgeDbSystemCodeAndIdentifier =
    function(bridgeDbSystemCode, identifier) {
    var exists = highland.curry(instance.entityReference.exists,
        bridgeDbSystemCode, identifier);

    return getAll()
    // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
    .flatFilter(function(organism) {
      return exists(organism.name.la);
    })
    .head();
  };

  /**
   * Identifies the organism for the provided entity reference and returns all
   * the data BridgeDb has about that organism, which currently is the Latin name
   * and, when available, the English name.
   *
   * @param {Object} entityReference See bridgeDb.entityReference.enrich for information
   *                                  on acceptable entity reference inputs.
   * @return {Stream<Object>} organism
   * @return {Object[]} organism.name
   * @return {String} organism.name.en English name, when available.
   * @return {String} organism.name.la Full Latin name.
   */
  function getByEntityReference(entityReference) {
    // TODO as part of the build process, query all species like this:
    // http://webservice.bridgedb.org/Human/sourceDataSources
    // http://webservice.bridgedb.org/Human/targetDataSources
    // to get a listing of which datasets go with which species.
    // Save that data as a JSON file.
    // Then use those limitations in this query.

    return instance.entityReference.enrich(entityReference, {
      bridgeDbXrefsUrl: false,
      dataset: true,
      organism: false
    })
    .flatMap(function(entityReference) {
      var organism = entityReference.organism;
      if (!!organism) {
        return highland([organism]).map(_normalize);
      }

      var bridgeDbSystemCode = entityReference.inDataset.bridgeDbSystemCode ||
        _.isArray(entityReference.alternatePrefix) &&
        entityReference.alternatePrefix[0];

      var identifier = entityReference.identifier;

      if (!!bridgeDbSystemCode && !!identifier) {
        return _getByBridgeDbSystemCodeAndIdentifier(
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
   * @param {Object|String} input
   * @param {Object} [inputType='Organism']
   * @return {Stream<String>} organismNameNormalized Full Latin name.
   * @return {String}
   */
  function _getInstanceOrganismName(input, inputType) {
    function initMethod() {
      if (!_.isEmpty(instance.organismNameNonNormalized)) {
        return _setInstanceOrganismName(instance.organismNameNonNormalized);
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

    return Utils._runOncePerInstance(
        instance,
        'organismNameNormalized',
        initMethod
    );
  }

  /**
   * @private
   *
   * Normalize organism.
   *
   * @param {String|Object} organism - Can be name in Latin (full like "Escherichia coli"
   *      or abbreviated like "E. coli") or English. In the future, we might include IRIs for organisms.
   * @return {Stream<Object>} organism
   * @return {Object[]} organism.name
   * @return {String} organism.name.en English name, when available.
   * @return {String} organism.name.la Full Latin name.
   */
  function _normalize(organism) {
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
      JsonldMatcher._normalizeText(organismIdentifier);

    return getAll()
    .find(function(organism) {
      var names = organism.name;
      var latinName = names.la;
      var latinNameComponents = latinName.split(' ');
      var latinNameAbbreviated = latinNameComponents[0][0] +
        latinNameComponents[1];
      var englishName = names.en;
      return JsonldMatcher._normalizeText(latinName) ===
        normalizedOrganismIdentifier ||
        JsonldMatcher._normalizeText(latinNameAbbreviated) ===
          normalizedOrganismIdentifier ||
        JsonldMatcher._normalizeText(englishName) ===
          normalizedOrganismIdentifier;
    })
    .head();
  }

  /**
   * @private
   *
   * Convert organism to Latin name.
   *
   * @param {String} organismIdentifier - Can be name in Latin (full like "Escherichia coli"
   *      or abbreviated like "E. coli") or English. In the future, we might include IRIs for organisms.
   * @return {Stream<String>} organismLatinName Full name in Latin
   * @return {String}
   */
  function _convertToLatinName(organismIdentifier) {
    return _normalize(organismIdentifier).map(function(organism) {
      // returns either the organism name or false
      return !!organism.name && !!organism.name.la && organism.name.la;
    });
  }

  /**
   * @private
   *
   * Set the current organism for this instance so we don't have to look it up every time.
   *
   * @param {String|Object} organism The single organism for this bridgedbjs instance. It is
   *                                 preferably the full Latin name. If you need to work
   *                                 with another organism, create another bridgedbjs instance.
   * @param {Boolean} normalize Normalize the provided organism to ensure it matches what
   *                                 the BridgeDb API expects.
   * @return {Stream<String>} Normalized organism name. Note that if args.normalize is set to false,
   *                          the returned value will be whatever was provided as args.organism.
   */
  function _setInstanceOrganismName(organism, normalize) {
    normalize = normalize || true;

    if (normalize) {
      var initMethod = highland.partial(_convertToLatinName, organism);
      return Utils._runOncePerInstance(
          instance,
          // TODO why can't I set this to instanceOrganismName?
          // There appears to be a conflict with having the same name
          // here and in _getInstanceOrganismName(), so for now, I'm
          // setting this to _setInstanceOrganismName, but I don't know
          // why I need to.
          'setInstanceOrganismName',
          initMethod
      );
    } else {
      instance.organismNameNonNormalized = organism;
      return highland([organism]);
    }
  }

  return {
    createEntityReferenceToOrganismTransformationStream:
      createEntityReferenceToOrganismTransformationStream,
    getAll:getAll,
    getByEntityReference:getByEntityReference,
    _getInstanceOrganismName:_getInstanceOrganismName,
    _setInstanceOrganismName:_setInstanceOrganismName
  };
};

exports = module.exports = Organism;
