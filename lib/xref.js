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
 * @alias xref
 * @memberof bridgeDb
 * @param {object} instance
 */
var Xref = function(instance) {
  'use strict';

  /**
   * Get all xrefs available from BridgeDb for the provided entity reference.
   * Currently limited to biopax:UnificationXrefs and biopax:RelationshipXrefs,
   * returned as biopax:EntityReferences.
   *
   * @param {string|object|stream} input
   * @param {object} [options]
   * @param {string} [options.format] Can be set equal to "display"
   * @return {Stream<object>|Stream<array>} entityReference When options.format is not set, returns
   *                          entity reference as formatted by bridgeDb.entityReference.enrich().
   *                          When options.format is set to "display," returns a set of entity references
   *                          as formatted by bridgeDb.xref.formatAllForDisplay().
   * @return {string} entityReference.identifier
   * @return {string} entityReference.PLUS_ALL_OTHER_PROPERTIES_AVAILABLE
   */
  function get(input, options) {
    instance.options = options || {};
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
      // enrich and format the xrefs
      .flatMap(function(normalizedEntityReference) {
        var source = getBridgeDbUrlByEntityReference(normalizedEntityReference);
        return highland(
          request({
            url: source,
            withCredentials: false
          })
          .pipe(csv(csvOptions))
        );
      })
      .errors(function(err, push) {
        console.log(err);
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
      .flatMap(instance.entityReference.enrich)
      .collect()
      .flatMap(function(entityReferences) {
        if (options.format === 'display') {
          return formatAllForDisplay({
            specifiedEntityReference: specifiedEntityReference,
            label: options.label,
            description: options.description,
            entityReferences: entityReferences
          });
        }

        return entityReferences.map(instance.addContext);
      });
    });
  }

  /**
   * @private
   *
   * @param {object} entityReference
   * @param {string} entityReference.organism Organism name in Latin or English
   * @param {Array<string>} entityReference.alternatePrefix The first element must be the BridgeDb systemCode
   * @param {string} entityReference.identifier
   * @return {string} url URL for getting Xrefs from BridgeDb webservices
   */
  function getBridgeDbUrlByEntityReference(entityReference) {
    var bridgeDbSystemCode = entityReference.alternatePrefix[0];
    var path = '/' + encodeURIComponent(entityReference.organism) + '/xrefs/' +
      encodeURIComponent(bridgeDbSystemCode) + '/' +
      encodeURIComponent(entityReference.identifier);
    return instance.config.apiUrlStub + path;
  }

  /**
   * @private
   *
   * Format Xrefs for display in a details panel.
   *
   * @param {object} args
   * @param {array} args.entityReferences
   * @param {object} args.specifiedEntityReference
   * @param {string} args.label
   * @param {string} args.description
   * @return {Stream<array>} xrefsStream
   * @return {object[]} xrefsStream.entityReference formatted for display
   * @return {string} xrefsStream.entityReference.label
   * @return {string} xrefsStream.entityReference.description
   * @return {object[]} xrefsStream.entityReference.listItem
   * @return {string} xrefsStream.entityReference.listItem.title
   * @return {string} xrefsStream.entityReference.listItem.text
   * @return {boolean} xrefsStream.entityReference.listItem.isPrimary
   * @return {string} xrefsStream.entityReference.listItem.uri when available
   */
  function formatAllForDisplay(args) {
    var entityReferenceStream = highland(args.entityReferences);
    var specifiedEntityReference = args.specifiedEntityReference;
    var label = args.label;
    var description = args.description;
    return entityReferenceStream.errors(function(err, push) {
      console.log(err);
      console.log('in xref.formatAllForDisplay()');
      //For unannotated nodes, without db or identifier
      return {
        'header': label,
        'description': description,
        'listItems': ['Missing identifier and db']
      };
      //return 'No entityReferenceXrefs returned. Is BridgeDb down?';
    })
    .map(function(entityReference) {
      var identifier = entityReference.identifier;
      var listItem = {};
      listItem.title = entityReference.db;
      listItem.text = identifier;
      listItem.isPrimary = entityReference.isPrimary;
      if (entityReference.hasOwnProperty('urlPattern')) {
        listItem.uri =
          entityReference.urlPattern.replace('$id', identifier);
      }
      return listItem;
    })
    .collect()
    .map(function(listItems) {
      return listItems.sort(function(a, b) {
        // two-factor sort: primary key is "isPrimary" and secondary key is "title," which in this case is the db
        if (a.isPrimary === b.isPrimary) {
          var x = a.title.toLowerCase();
          var y = b.title.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        }
        return b.isPrimary - a.isPrimary;
      });
    })
    .sequence()
    .group('title')
    .flatMap(highland.pairs)
    .reduce([], function(listItems, pair) {
      listItems.push({
        key: pair[0],
        values: pair[1]
      });
      return listItems;
    })
    .map(function(listItems) {
      // TODO is this needed? It seems as if it should be handled before this stage.
      //
      // Here we handle case where either 0 or 1 result is returned by BridgeDb webservice. This would most likely happen if BridgeDb is down.
      if (listItems.length < 2) {
        var uri = '';
        if (specifiedEntityReference.hasOwnProperty('urlPattern')) {
          uri = specifiedEntityReference.urlPattern.replace(
            '$id',
            specifiedEntityReference.identifier
          );
        }
        listItems = [{
          'key': specifiedEntityReference.db,
          'values':[{
            'isPrimary': true,
            'text': specifiedEntityReference.identifier,
            'title': specifiedEntityReference.db,
            'uri':uri}]
        }];
      } else {
        // We want the identifier that was specified by the pathway creator for this data node to be listed first.
        var specifiedListItem = _.remove(listItems, function(element) {
          return (element.key === specifiedEntityReference.db);
        })[0];

        var specifiedXRefId =
          _.remove(specifiedListItem.values, function(element) {
          return (element.text === specifiedEntityReference.identifier);
        })[0];

        specifiedListItem.values.unshift(specifiedXRefId);

        listItems.unshift(specifiedListItem);
      }

      return listItems;
    })
    .collect();
  }

  return {
    createStream:createStream,
    getBridgeDbUrlByEntityReference:getBridgeDbUrlByEntityReference,
    get:get
  };
};

exports = module.exports = Xref;
