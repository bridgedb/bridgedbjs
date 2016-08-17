/* @module Xref */

var _ = require('lodash');
var csv = require('csv-streamify');
var httpErrors = require('./http-errors.js');
var hyperquest = require('hyperquest');
var Rx = require('rx-extra');
var RxNode = Rx.RxNode;

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
   * @param {String|Object|String[]|Object[]|Observable} input entity reference(s)
   * @return {Observable<EntityReference>} entityReferenceSource containing enriched
   *                              {@link EntityReference|EntityReferences}.
   */
  function get(input, options) {
    // First: from on the input entity reference(s), get the correct BridgeDb webservice
    // endpoint(s) required to get xrefs.
    // NOTE: entityReference.enrich handles the different forms of input.
    var normalizedEntityReferenceSource = instance.entityReference.enrich(input)
    .shareReplay();

    // This section gets, enriches and formats the xrefs
    var fullEntityReferenceSource = Rx.Observable.catch(
        normalizedEntityReferenceSource
        .flatMap(function(normalizedEntityReference) {
          var sourceIri = _getBridgeDbIriByEntityReference(normalizedEntityReference);
          // TODO this is actually pausable
          return RxNode.fromUnpausableStream(
              hyperquest(sourceIri, {
                withCredentials: false
              })
          );
        })
        .doOnError(function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from XHR request';
          console.error(err.message);
          console.error(err.stack);
        })
        .streamThrough(csv(csvOptions))
        .doOnError(function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from csv parsing';
          console.error(err.message);
          console.error(err.stack);
        })
        .map(function(array) {
          var result = {};
          result.identifier = array[0];
          result.conventionalName = array[1];
          return result;
        })
        //.flatMap(instance.entityReference.enrich)
        .flatMap(function(xref) {
          return instance.entityReference.enrich(xref, {
            context: false, organism: false, xrefs: false
          })
          .doOnNext(function(enriched) {
            console.log('enriched');
            console.log(enriched);
          })
          //return instance.entityReference.normalize(xref);
        })
        .doOnError(function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from entityReference.enrich';
          console.error(err.message);
          console.error(err.stack);
        }),
//        .flatMap(instance.addContext)
//        .doOnError(function(err) {
//          err.message = (err.message || '') + ' observed in ' +
//            'BridgeDb.Xref.get after adding context';
//          console.error(err.message);
//          console.error(err.stack);
//        }),
        Rx.Observable.throw(
            new Error('BridgeDb.Xref.get failed to get xrefs from fullEntityReferenceSource')
        )
    );

    // TODO this seems really long. Can we make it 20s?
    //var timeout = 45 * 1000; // ms
    var timeout = 20 * 1000; // ms
    var timeoutErrorMessage = 'BridgeDb.Xref.get timed out after ' + timeout;
    // TODO how do we both catch (to return an alternate)
    // but also still display the error in the console?
    return fullEntityReferenceSource
    .doOnError(function(err) {
      err.message = (err.message || '') +
        ' BridgeDb.Xref.get fullEntityReferenceSource failed.';
      console.error(err.message);
      console.error(err.stack);
    })
//    .timeout(
//        timeout,
//        Rx.Observable.throw(new Error(timeoutErrorMessage))
//    )
    .catch(function(err) {
      err.message = (err.message || '') +
        ' for fullEntityReferenceSource.';
      console.error(err.message);
      console.error(err.stack);
      // if we can at least expand the user input, we return that.
      return normalizedEntityReferenceSource
      .doOnError(function(err) {
        err.message = (err.message || '') +
          ' BridgeDb.Xref.get normalizedEntityReferenceSource failed.';
        console.error(err.message);
        console.error(err.stack);
      })
      .timeout(
          500,
          Rx.Observable.throw(new Error('BridgeDb.Xref.get normalizedEntityReferenceSource timed out.'))
      );
    })
    .catch(function(err) {
      err.message = (err.message || '') +
        ' for normalizedEntityReferenceSource. ' +
        ' BridgeDb.Xref.get 100% failed; returning input.';
      console.error(err.message);
      console.error(err.stack);
      // if we can't expand, we at least return exactly what the user provided.
      return Rx.Observable.return(input);
    });

//    return Rx.Observable.catch(
//      // TODO once batch mode is working for the API, re-enable this.
//      // Right now, it's too slow.
//        fullEntityReferenceSource
//        .doOnError(function(err) {
//          err.message = (err.message || '') +
//            ' BridgeDb.Xref.get fullEntityReferenceSource failed.';
//      console.error(err.message);
//      console.error(err.stack);
//        })
//        .timeout(
//            timeout,
//            Rx.Observable.throw(new Error(timeoutErrorMessage))
//        )
//        .doOnError(function(err) {
//          err.message = (err.message || '') +
//            ' BridgeDb.Xref.get fullEntityReferenceSource timed out.';
//      console.error(err.message);
//      console.error(err.stack);
//        }),
//        // if we can at least expand the user input, we return that.
//        normalizedEntityReferenceSource
//        .doOnError(function(err) {
//          err.message = (err.message || '') +
//            ' BridgeDb.Xref.get normalizedEntityReferenceSource failed.';
//      console.error(err.message);
//      console.error(err.stack);
//        })
//        .timeout(
//            timeout + 50,
//            Rx.Observable.throw(new Error(timeoutErrorMessage + '; returning normalized input.'))
//        )
//        .doOnError(function(err) {
//          err.message = (err.message || '') +
//            ' BridgeDb.Xref.get normalizedEntityReferenceSource timed out.';
//      console.error(err.message);
//      console.error(err.stack);
//        }),
//        // if we can't expand, we at least return exactly what the user provided.
//        Rx.Observable.return(input)
//        .concat(
//            Rx.Observable.throw(
//                new Error('BridgeDb.Xref.get 100% failed; returning input.')
//            )
//            .doOnError(function(err) {
//              err.message = (err.message || '') +
//                ' BridgeDb.Xref.get 100% failed; returning input.';
//      console.error(err.message);
//      console.error(err.stack);
//            })
//        )
//    );
  }

  /**
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {String|Organism} entityReference.organism map, the name or the IRI
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
