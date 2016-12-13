/// <reference path="../index.d.ts" />

/* @module Xref */

import csv from 'csv-streamify';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/dom/ajax';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/throw';

import 'rx-extra/add/operator/throughNodeStream';

var csvOptions = {objectMode: true, delimiter: '\t'};

/**
 * Used internally to create a new Xref instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var Xref = function(instance) {
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
  function get(input: EntityReference, options?): Observable<entityReference> {
    // First: from on the input entity reference(s), get the correct BridgeDb webservice
    // endpoint(s) required to get xrefs.
    // NOTE: entityReference.enrich handles the different forms of input.
    var normalizedEntityReferenceSource = instance.entityReference.enrich(input)
    .shareReplay();

    // This section gets, enriches and formats the xrefs
    var fullEntityReferenceSource: Observable<entityReference> = Observable.catch(
        normalizedEntityReferenceSource
        .mergeMap(function(normalizedEntityReference) {
          var sourceUrl = _getBridgeDbIriByEntityReference(normalizedEntityReference);
					return Observable.ajax(sourceUrl)
					.map((ajaxResponse): string => ajaxResponse.xhr.responseText);
        })
        .do(null, function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from XHR request';
          console.error(err.message);
          console.error(err.stack);
        })
        .throughNodeStream(csv(csvOptions))
        .do(null, function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from csv parsing';
          console.error(err.message);
          console.error(err.stack);
        })
        .map(function(array): EntityReferenceEnrichInput {
					return {
						identifier: array[0],
						isDataItemIn: {
							conventionalName: array[1]
						}
					};
        })
        //.mergeMap(instance.entityReference.enrich)
        .mergeMap(function(xref: EntityReferenceEnrichInput): EntityReference {
          return instance.entityReference.enrich(xref, {
            context: false, organism: false, xrefs: false
          });
          //return instance.entityReference.normalize(xref);
        })
        .do(null, function(err) {
          err.message = (err.message || '') + ' observed in ' +
            'BridgeDb.Xref.get from entityReference.enrich';
          console.error(err.message);
          console.error(err.stack);
        }),
//        .mergeMap(instance.addContext)
//        .do(null, function(err) {
//          err.message = (err.message || '') + ' observed in ' +
//            'BridgeDb.Xref.get after adding context';
//          console.error(err.message);
//          console.error(err.stack);
//        }),
        Observable.throw(
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
    .do(null, function(err) {
      err.message = (err.message || '') +
        ' BridgeDb.Xref.get fullEntityReferenceSource failed.';
      console.error(err.message);
      console.error(err.stack);
    })
//    .timeout(
//        timeout,
//        Observable.throw(new Error(timeoutErrorMessage))
//    )
    .catch(function(err) {
      err.message = (err.message || '') +
        ' for fullEntityReferenceSource.';
      console.error(err.message);
      console.error(err.stack);
      // if we can at least expand the user input, we return that.
      return normalizedEntityReferenceSource
      .do(null, function(err) {
        err.message = (err.message || '') +
          ' BridgeDb.Xref.get normalizedEntityReferenceSource failed.';
        console.error(err.message);
        console.error(err.stack);
      })
      .timeout(
          500,
          Observable.throw(new Error('BridgeDb.Xref.get normalizedEntityReferenceSource timed out.'))
      );
    })
    .catch(function(err) {
      err.message = (err.message || '') +
        ' for normalizedEntityReferenceSource. ' +
        ' BridgeDb.Xref.get 100% failed; returning input.';
      console.error(err.message);
      console.error(err.stack);
      // if we can't expand, we at least return exactly what the user provided.
      return Observable.of(input);
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
  function _getBridgeDbIriByEntityReference(entityReference: EntityReference): BridgeDbXrefsIri {
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
