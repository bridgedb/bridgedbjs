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
   * @return {object[]} organisms.availableOrganism
   * @return {string} organisms.availableOrganism.english English name, when available
   * @return {string} organisms.availableOrganism.latin Latin name
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
      return {
        english: array[0],
        latin: array[1]
      };
    })
    .map(function(organism) {

      // remove empty properties

      organism = _.omit(organism, function(value) {
        // Note: I intentionally used 'null' as
        // a string, not a native value, because
        // BridgeDb returns the string value
        return value === 'null';
      });

      return organism;
    })
    .collect();
  };

  /**
   * If the organism is not specified but the BridgeDb system code and
   * entity reference identifier are, we can identify the species by
   * trying species until we find one that exists for the system code
   * and identifier.
   *
   * @private
   *
   * @param bridgedbSystemCode
   * @param identifier
   * @return {Stream<object>} organismStream
   * @return {object} organismStream.organism
   * @return {string} organismStream.organism.english English name, when available
   * @return {string} organismStream.organism.latin Latin name
   */
  var getByBridgeDbSystemCodeAndIdentifierByCheckingAvailableOrganisms =
    function(bridgedbSystemCode, identifier) {
    var exists = highland.curry(instance.entityReference.exists,
        bridgedbSystemCode, identifier);

    var initMethod = function() {
      return getAll()
      // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
      .sequence()
      .flatFilter(function(organism) {
        return exists(organism.latin);
      })
      .head()
      .map(function(organism) {
        return organism;
      });
    };

    return Utilities.runOncePerInstance(instance, 'organisms', initMethod);
  };

  /**
   * Identifies the organism for the provided entity reference and returns all
   * the data BridgeDb has about that organism, which currently is the Latin name
   * and, when available, the English name.
   * @param {object} entityReference
   * @param {string} entityReference.bridgedbSystemCode
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

      var bridgedbSystemCode = dataSource.bridgedbSystemCode ||
        _.isArray(entityReference.alternatePrefix) &&
        entityReference.alternatePrefix[0];

      var identifier = entityReference.identifier;

      if (!!bridgedbSystemCode && !!identifier) {
        return getByBridgeDbSystemCodeAndIdentifierByCheckingAvailableOrganisms(
          bridgedbSystemCode, identifier);
      } else {
        console.warn('Cannot get organism by entityReference.');
        return entityReference;
      }
    });
  }

  /**
   * Take organism as specified by user and return organism as specified by BridgeDb
   *
   * @param {string} input - Can be Latin or English name. In the future, we might include IRIs for organisms.
   * @return {Stream<string>} organismName Latin organism name as used at BridgeDb
   * @return {string}
   */
  function normalize(input) {
    var normalizedInput = Utilities.normalizeText(input);
    return getAll().sequence()
    .find(function(organism) {
      var latinName = organism.latin;
      var latinNameComponents = organism.latin.split(' ');
      var latinNameAbbreviated = latinNameComponents[0][0] +
        latinNameComponents[1];
      var englishName = organism.english;
      return Utilities.normalizeText(latinName) === normalizedInput ||
        Utilities.normalizeText(latinNameAbbreviated) === normalizedInput ||
        Utilities.normalizeText(englishName) === normalizedInput;
    })
    .map(function(organism) {
      return !!organism.latin && organism.latin;
    });
  }

  /**
   * @private
   *
   * @param {string} providedOrganism Organism Latin name
   */
  function set(providedOrganism) {
    getAll().find(function(organism) {
      return organism.latin === providedOrganism;
    })
    .map(function(organism) {
      instance.organism = organism;
    });
  }

  return {
    createEntityReferenceToOrganismTransformationStream:
      createEntityReferenceToOrganismTransformationStream,
    getAll:getAll,
    getByEntityReference:getByEntityReference,
    normalize:normalize,
    set:set
  };
};

exports = module.exports = Organism;
