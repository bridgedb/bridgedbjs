/* @module DetailsPanel */

// TODO split this out into its own repo.

var _ = require('lodash');
var highland = require('highland');

/**
 * Used internally to create a new DetailsPanel instance
 * @class
   * @private
 */
var DetailsPanel = function() {
  'use strict';

  /**
   * @private
   * Additional details about a given concept or thing, formatted for display in a details panel, e.g.,
   *                  {@link http://www.biopax.org/release/biopax-level3.owl#Xref|biopax:Xrefs} for an {@link EntityReference}.
   * @typedef {Object} DetailsPanelData
   * @property {String} label
   * @property {String} description
   * @property {DetailsPanelListItem[]} listItems Such as sets of Xrefs grouped by dataset.
  */

  /**
   * @private
   * List element with one or more subelements, e.g., Xrefs for one dataset.
   * @typedef {Object} DetailsPanelListItem
   * @property {String} key Title of the list element, e.g., "WikiPathways"
   * @property {DetailsPanelListItemValue[]} values
  */

  /**
   * @private
   * Used to create an HTML string for one or more identifiers/links.
   * @typedef {Object} DetailsPanelListItemValue Set of identifiers, each with a linkout when available, such as for
   *                                             a specific Xref.
   * @property {String} text Displayed value, e.g., "WP1"
   * @property {String} [uri] (when available) Link to the main human-readable description/page about that identifier.
   *                          Sometimes called a "linkout.". See {@link http://www.w3.org/2001/XMLSchema#anyURI|xsd:anyURI}.
   *                          Example: {@link http://wikipathways.org/index.php/Pathway:WP1}
  */

  /**
   * @private
   *
   * Get all xrefs available from BridgeDb for the provided entity reference.
   * Currently limited to biopax:UnificationXrefs and biopax:RelationshipXrefs.
   *
   * @param {String|Object|Stream} input
   * @param {Object} [options]
   * @param {String} [options.format='data'] Can be set equal to "data" or "display"
   * @return {Stream<EntityReference>|Stream<DetailsPanelData>} result When options.format is "data", returns stream of
   *                          enriched {@link EntityReference|EntityReferences}.
   *                          When options.format is "display", returns stream of {@link DetailsPanelData}, consisting
   *                          of sets of entity reference linkouts grouped by dataset.
   */
  function get(input, options) {
    if (options.format === 'display') {
      return _formatAllForDisplay({
        specifiedEntityReference: specifiedEntityReference,
        label: options.label,
        description: options.description,
        entityReferences: entityReferences
      });
    }
  }

  /**
   * @private
   *
   * Add label (header) and description.
   *
   * TODO THIS ISN'T DONE YET, SO IT PROBABLY DOESN'T WORK.
   *
   * @param {Object} args
   * @param {Stream} args.inputStream
   * @param {Object} args.primaryResource
   * @param {String} args.label
   * @param {String} args.description
   * @return {Stream<DetailsPanelData>} result {@link DetailsPanelData}
   */
  function getNested(args) {
    console.log('args');
    console.log(args);
    var inputStream = args.inputStream;
    var primaryResource = args.primaryResource;
    var label = args.label;
    var description = args.description;

    var result = {
      'header': label,
      'description': description
    };

    return formatAllForDisplay(args)
    .errors(function(err, push) {
      console.log(err);
      console.log('in xref._formatAllForDisplay()');
      //For unannotated nodes, without db or identifier
      result.listItems = ['Missing identifier and/or db'];
      return result;
    })
    .map(function(listItems) {
      result.listItems = listItems;
      return result;
    });
  }

  /**
   * @private
   *
   * Format one or more resources for display in a details panel.
   *
   * @param {Object} args
   * @param {Stream} args.inputStream
   * @param {Object} args.specifiedResource
   * @return {DetailsPanelListItem[]} result Collection of {@link DetailsPanelListItem|DetailsPanelListItems}
   */
  function formatAllForDisplay(args) {
    console.log('args');
    console.log(args);
    var inputStream = args.inputStream;
    var specifiedEntityReference = args.specifiedResource;
    return inputStream.errors(function(err, push) {
      console.log(err);
      console.log('in DetailsPanel.formatAllForDisplay()');
      // TODO this is only half thought out
      //For unannotated nodes, without db or identifier
      return inputStream;
      //return 'No entityReferenceXrefs returned. Is BridgeDb down?';
    })
    .map(function(entityReference) {
      var identifier = entityReference.identifier;
      var listItem = {};
      listItem.title = entityReference.db;
      listItem.text = identifier;
      listItem._isPrimary = entityReference._isPrimary;
      /*
      if (entityReference.hasOwnProperty('urlPattern')) {
        listItem.uri =
          entityReference.urlPattern.replace('$id', identifier);
      }
      //*/
      var uri = _([entityReference['@id']])
      .concat(entityReference['owl:sameAs'])
      .compact()
      .filter(function(thisUri) {
        return thisUri.indexOf('http') > -1;
      })
      .last();

      if (!!uri) {
        listItem.uri = uri;
      }

      return listItem;
    })
    .collect()
    .map(function(listItems) {
      return listItems.sort(function(a, b) {
        // two-factor sort: primary key is "_isPrimary" and secondary key is "title," which in this case is the db
        if (a._isPrimary === b._isPrimary) {
          var x = a.title.toLowerCase();
          var y = b.title.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        }
        return b._isPrimary - a._isPrimary;
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
    /*
     * TODO Use JsonldMatcher to find the specified entity reference
     *      and put it first.
    .map(function(listItems) {
      console.log('listItems');
      console.log(listItems);
      // TODO is this needed? It seems as if it should be handled before this stage.

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
            '_isPrimary': true,
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
    //*/
    .collect();
  }

  return {
    formatAllForDisplay:formatAllForDisplay
  };
};

exports = module.exports = DetailsPanel;
