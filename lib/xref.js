/* @module Xref */

var _ = require('lodash');
var csv = require('csv-streamify');
var httpErrors = require('./http-errors.js');
var hyperquest = require('hyperquest');
var Rx = require('rx');
var RxNode = require('rx-node');

var csvOptions = {objectMode: true, delimiter: '\t'};

var DATASOURCES_HEADERS_NS = [
  'https://github.com/bridgedb/BridgeDb/blob/master/',
  'org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#'
].join('');

/**
 * Used internally to create a new Xref instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var Xref = function(instance) {
  'use strict';

  var config = instance.config;
  var options = instance.options || {};

  /**
   * Get all xrefs available from BridgeDb for the provided entity reference.
   * Currently limited to biopax:UnificationXrefs and biopax:RelationshipXrefs.
   *
   * @param {String|Object} input
   * @return {Observable<EntityReference>} entityReferenceSource of enriched
   *                              {@link EntityReference|EntityReferences}.
   */
  function get(input, options) {
    // get the BridgeDb path to get xrefs for the entity reference
    var normalizedEntityReferenceSource = instance.entityReference.enrich(input)
    .map(function(normalizedEntityReference) {
      return normalizedEntityReference;
    })
    .shareReplay();

    // This section gets, enriches and formats the xrefs
    var additionalEntityReferenceSource = Rx.Observable.catch(
        normalizedEntityReferenceSource
        .flatMap(function(normalizedEntityReference) {
          var sourceIri = _getBridgeDbIriByEntityReference(normalizedEntityReference);
//          return RxNode.fromReadableStream(
//            hyperquest(sourceIri, {
//              withCredentials: false
//            })
//          );
          return RxNode.fromReadableStream(
            hyperquest(sourceIri, {
              withCredentials: false
            })
            // TODO catch errors here. Rx.Observable.catch won't
            // insert itself between these two.
            .pipe(csv(csvOptions))
          );
        })
        //.pipe(csv(csvOptions))
        /*
        .let(function(source) {
          var stream = RxNode..pipe(csv(csvOptions))
          return RxNode.fromReadableStream(
            // TODO catch errors here. Rx.Observable.catch won't
            // insert itself between these two.
          );
        })
        //*/
        .doOnError(function(err) {
          var message = err.message || '';
          message += ' in BridgeDb.Xref.get';
          console.error(message);
        })
        .map(function(array) {
          var result = {};
          result.identifier = array[0];
          // jscs: disable
          result.datasource_name = array[1];
          // jscs: enable
          return result;
        })
        .flatMap(instance.entityReference.enrich)
        .flatMap(instance.addContext)
        .doOnError(function(err) {
          var message = err.message || '';
          message += ' in BridgeDb.Xref.get';
          console.error(message);
        }),
        Rx.Observable.throw(new Error('BridgeDb.Xref.get failed to get more.'))
    );

    //return additionalEntityReferenceSource;

    // TODO If BridgeDb webservices are down, we
    // should just return the data the user provided.
    return Rx.Observable.catch(
    //*
        normalizedEntityReferenceSource
        .concat(
            additionalEntityReferenceSource
            .timeout(
                50000,
                Rx.Observable.throw(new Error('BridgeDb.Xref.get timed out.'))
            )
        ),
        Rx.Observable.return(input)
        .concat(Rx.Observable.throw(new Error('BridgeDb.Xref.get failed somewhere.')))
    );
    //*/
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
   * @param {String} entityReference.isDataItemIn.systemCode
   * @return {String} iri IRI (URL) for getting Xrefs from BridgeDb webservices
   */
  function _getBridgeDbIriByEntityReference(entityReference) {
    var systemCode = entityReference.isDataItemIn.systemCode;
    var path = encodeURIComponent(entityReference.organism.nameLanguageMap.la) +
      '/xrefs/' + encodeURIComponent(systemCode) + '/' +
      encodeURIComponent(entityReference.identifier);
    return config.baseIri + path;
  }

  return {
    _getBridgeDbIriByEntityReference: _getBridgeDbIriByEntityReference,
    get: get
  };
};

exports = module.exports = Xref;
