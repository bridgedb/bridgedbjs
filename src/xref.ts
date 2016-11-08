/// <reference path="../index.d.ts" />

/* @module Xref */

import * as _ from 'lodash';
import csv from 'csv-streamify';
import httpErrors from './http-errors';
import hyperquest from 'hyperquest';
import Rx from 'rx-extra';
var RxNode = Rx.RxNode;

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

  var config = instance.config;
  var options = instance.options || {};

  /**
   * Get all xrefs available from BridgeDb for the provided entity reference.
   * Currently limited to biopax:UnificationXrefs and biopax:RelationshipXrefs.
   *
   * @param {String|Object|String[]|Object[]|Observable} input entity reference(s)
   * @param {Object} [options]
   * @return {Observable<EntityReference>} entityReferenceSource containing enriched
   *                              {@link EntityReference|EntityReferences}.
   */
  function get(input: entityReference, options?): Rx.Observable<entityReference> {
    // First: from on the input entity reference(s), get the correct BridgeDb webservice
    // endpoint(s) required to get xrefs.
    // NOTE: entityReference.enrich handles the different forms of input.
    var normalizedEntityReferenceSource = instance.entityReference.enrich(input)
    .shareReplay();

    // This section gets, enriches and formats the xrefs
    var fullEntityReferenceSource: Rx.Observable<entityReference> = Rx.Observable.catch(
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
        .map(function(array): entityReferenceEnrichInput {
					return {
						identifier: array[0],
						isDataItemIn: {
							conventionalName: array[1]
						}
					};
        })
        //.flatMap(instance.entityReference.enrich)
        .flatMap(function(xref: entityReferenceEnrichInput): entityReference {
          return instance.entityReference.enrich(xref, {
            context: false, organism: false, xrefs: false
          });
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
  }

  /**
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {String|Organism} entityReference.organism map, the name or the IRI
   * @param {Object} entityReference.organism.nameLanguageMap
   * @param {String} entityReference.organism.nameLanguageMap.la
   * @param {Datasource} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.systemCode
   * @return {String} iri IRI (URL) for getting Xrefs from BridgeDb webservices
   */
  function _getBridgeDbIriByEntityReference(entityReference: entityReference): BridgeDbXrefsIri {
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

export default Xref;
