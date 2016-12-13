/// <reference path="../index.d.ts" />

/* @module Organism */

import csv from 'csv-streamify';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/throw';

import 'rx-extra/add/operator/throughNodeStream';

var csvOptions = {objectMode: true, delimiter: '\t'};

/**
 * Used internally to create a new Organism instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var Organism = function(instance) {
  var config = instance.config;

  /**
   * @private
   *
   * Get all organisms currently supported by BridgeDb.
   *
   * @return {Observable<organism>} organism
   */
  function _getAll(): Observable<organism> {
    var path = 'contents';
    var sourceUrl: string = config.baseIri + path;

		return Observable.ajax(sourceUrl)
    .map((ajaxResponse): string => ajaxResponse.xhr.responseText)
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ' in BridgeDb.Organism._getAll from XHR request.';
      console.error(err.message);
      console.error(err.stack);
    })
    .throughNodeStream(csv(csvOptions))
    .map(function(array: [organism, organism]): organism {
      return array[1]; // latin name
    })
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ' in BridgeDb.Organism._getAll';
      throw err;
    })
    .timeout(
        4 * 1000,
        Observable.throw(new Error('BridgeDb.Organism._getAll timed out.'))
    );
  }

  /**
   * @private
   *
   * If the organism is not specified but the BridgeDb system code and
   * entity reference identifier are, we can identify the species by
   * trying species until we find one that exists for the system code
   * and identifier.
   *
   * @param systemCode
   * @param identifier
   * @return {Observable<organism>} organismObservable
   */
  function _getBySystemCodeAndIdentifier(systemCode: string, identifier: string): Observable<organism> {
    return _getAll()
    // TODO sort organisms by number of pathways at WikiPathways.
    // Get that data as part of build step for this library.
    .mergeMap(function(organism) {
      return instance.entityReference.exists(systemCode, identifier, organism)
      .mergeMap(function(exists) {
        if (exists) {
          return Observable.of(organism);
        } else {
          return Observable.empty();
        }
      });
    })
    .first()
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ' in BridgeDb.Organism._getBySystemCodeAndIdentifier';
      throw err;
    });
  }

  /**
   * @private
   *
   * Each BridgeDb instance has one organism associated with it. This
   * function gets the organism once and then always returns that organism.
   *
   * @param {String} systemCode
   * @param {String} identifier
   * @return {Observable<organism>} organism
   */
  function _getInstanceOrganism(systemCode?: string, identifier?: string): Observable<organism> {
    var timeout = 6 * 1000;
    var organism = instance.organism;
    var organismSource = instance.organismSource;
    var source;
    if (organism) {
      return Observable.of(organism)
      .do(null, function(err) {
        err.message = (err.message || '') + 'in BridgeDb.Organism._getInstanceOrganism (cached)';
        throw err;
      });
    } else if (organismSource) {
      return organismSource
      .do(null, function(err) {
        err.message = (err.message || '') + 'in BridgeDb.Organism._getInstanceOrganism (getting)';
        throw err;
      })
      .timeout(
          timeout,
          Observable.throw(new Error('BridgeDb.organism._getInstanceOrganism timed out.'))
      );
    }

    organismSource = _getBySystemCodeAndIdentifier(systemCode, identifier)
    .do(function(organism) {
      instance.organism = organism;
    }, function(err) {
      err.message = err.message || '';
      err.message += ' in BridgeDb.Organism._getInstanceOrganism';
      throw err;
    });

    instance.organismSource = organismSource.share();

    return organismSource
    .do(null, function(err) {
      err.message = (err.message || '') + 'in BridgeDb.Organism._getInstanceOrganism';
      throw err;
    })
    .timeout(
        timeout,
        Observable.throw(new Error('BridgeDb.organism._getInstanceOrganism timed out.'))
    );
  }

  /**
   * @private
   *
   * Set the current organism for this instance so we don't have to look it up every time.
   *
   * @param {String} organism The single organism for this bridgedbjs instance as the full Latin or English name.
	 *  															 If you need to work with another organism, create another bridgedbjs
	 *  															 instance.
   */
  function _setInstanceOrganism(organism: organism): void {
    instance.organism = organism;
  }

  return {
    _getBySystemCodeAndIdentifier: _getBySystemCodeAndIdentifier,
    _getInstanceOrganism: _getInstanceOrganism,
    _setInstanceOrganism: _setInstanceOrganism
  };
};

export default Organism;
