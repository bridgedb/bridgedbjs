/* @module Xref */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utils = require('./utils.js');

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
    instance.options = options || {};
    instance.options.format = instance.options.format || 'data';
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
          request({
            url: source,
            withCredentials: false
          })
          .pipe(csv(csvOptions))
        );
      })
      .errors(function(err, push) {
        console.log(err.toString());
        console.log('in xref.createStream()');
        // TODO what happens if BridgeDb webservices are down?
        // We should just return the data the user provided.
        //return specifiedEntityReference;
        //return push(specifiedEntityReference);
      })
      .map(function(array) {
        return {
          identifier: array[0],
          db: array[1]
        };
      })
      // Strange that we need to do this collect/sequence, but
      // if we don't, the stream never ends, meaning we can't
      // do the collect after the enrich step.
      .collect()
      .sequence()
      .flatMap(instance.entityReference.enrich)
      .collect()
      .flatMap(function(entityReferences) {
        return entityReferences.map(instance.addContext);
      });
    });
  }

  /**
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {Organism} entityReference.organism
   * @param {Dataset} entityReference.isDataItemIn
   * @param {Array<String>} entityReference.isDataItemIn.alternatePrefix The first element must be the BridgeDb systemCode.
   * @return {String} iri IRI (URL) for getting Xrefs from BridgeDb webservices
   */
  function _getBridgeDbIriByEntityReference(entityReference) {
    var bridgeDbSystemCode = entityReference.isDataItemIn.alternatePrefix[0];
    var path = encodeURIComponent(entityReference.organism.name.la) +
      '/xrefs/' + encodeURIComponent(bridgeDbSystemCode) + '/' +
      encodeURIComponent(entityReference.identifier);
    return instance.config.baseIri + path;
  }

  return {
    createStream:createStream,
    _getBridgeDbIriByEntityReference:_getBridgeDbIriByEntityReference,
    get:get
  };
};

exports = module.exports = Xref;
