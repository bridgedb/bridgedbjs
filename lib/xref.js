/* @module Xref */

var _ = require('lodash');
var csv = require('csv-streamify');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var hyperquest = require('hyperquest');
var RxNode = require('rx-node');

var csvOptions = {objectMode: true, delimiter: '\t'};

/**
 * Used internally to create a new Xref instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var Xref = function(instance) {
  'use strict';

  /**
   * Get all xrefs available from BridgeDb for the provided entity reference.
   * Currently limited to biopax:UnificationXrefs and biopax:RelationshipXrefs.
   *
   * @param {String|Object|Stream} input
   * @return {Stream<EntityReference>} entityReferenceStream Stream of enriched
   *                              {@link EntityReference|EntityReferences}.
   */
  function get(input, options) {
    // TODO this seems bad to be polluting the instance namespace like this.
    var inputStream;
    if (_.isString(input) || _.isPlainObject(input)) {
      inputStream = highland([input]);
    } else if (_.isArray(input)) {
      inputStream = highland(input);
    } else if (highland.isStream(input)) {
      inputStream = input;
    }

    return inputStream.pipe(createStream());
  }

  /**
   * @private
   *
   * Create a Node.js/Highland stream through which entity references
   * can be piped to return all the xrefs available for each entity reference.
   *
   * @return {Stream} entityReferenceToXrefsSetTransformationStream
   */
  function createStream() {
    return highland.pipeline(function(sourceStream) {
      var options = instance.options || {};
      var specifiedEntityReference;
      // normalize the provided entity reference
      return highland(sourceStream)
        .flatMap(instance.entityReference.enrich)
        // get the BridgeDb path to get xrefs for the entity reference
        .map(function(normalizedEntityReference) {
          // TODO this method of setting the specified entity reference seems wrong.
          // Check whether it's correct.
          specifiedEntityReference = normalizedEntityReference;
          return normalizedEntityReference;
        })
        // The rest of this function enriches and formats the xrefs
        .flatMap(function(normalizedEntityReference) {
          var source =
              _getBridgeDbIriByEntityReference(normalizedEntityReference);

          return highland(
            hyperquest(source, {
              withCredentials: false
            })
            .pipe(csv(csvOptions))
          );
        })
        .errors(function(err, push) {
          console.error('in bridgedb.xref.createStream()');
          push(err);
          // TODO what happens if BridgeDb webservices are down?
          // We should just return the data the user provided.
          //return specifiedEntityReference;
          //return push(specifiedEntityReference);
        })
        .map(function(array) {
          return {
            identifier: array[0],
            bridgeDbDatasourceName: array[1]
          };
        })
        // Strange that we need to do this collect/sequence, but
        // if we don't, the stream never ends, meaning we can't
        // do the collect after the enrich step.
        .collect()
        .sequence()
        .flatMap(instance.entityReference.enrich)
        .collect()
        .map(function(entityReferences) {
          if (_.isEmpty(entityReferences)) {
            entityReferences = [specifiedEntityReference];
          }
          return entityReferences;
        })
        .sequence()
        .flatMap(instance.addContext);
    });
  }

  /**
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {Organism} entityReference.organism
   * @param {Object} entityReference.organism.nameLanguageMap
   * @param {String} entityReference.organism.nameLanguageMap.la
   * @param {Dataset} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.bridgeDbSystemCode
   * @return {String} iri IRI (URL) for getting Xrefs from BridgeDb webservices
   */
  function _getBridgeDbIriByEntityReference(entityReference) {
    var bridgeDbSystemCode = entityReference.isDataItemIn.bridgeDbSystemCode;
    var path = encodeURIComponent(entityReference.organism.nameLanguageMap.la) +
      '/xrefs/' + encodeURIComponent(bridgeDbSystemCode) + '/' +
      encodeURIComponent(entityReference.identifier);
    return instance.config.baseIri + path;
  }

  return {
    createStream: createStream,
    _getBridgeDbIriByEntityReference: _getBridgeDbIriByEntityReference,
    get: get
  };
};

exports = module.exports = Xref;
