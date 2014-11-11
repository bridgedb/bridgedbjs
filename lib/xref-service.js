var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

var XrefService = function(instance) {
  'use strict';

  /**
   * get
   *
   * @param {string|object|stream} input
   * @param {object} [options]
   * @return
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

  var createStream = function() {
    return highland.pipeline(function(sourceStream) {
      var options = instance.options || {};
      var specifiedEntityReference;
      // normalize the provided entity reference
      return highland(sourceStream).flatMap(instance.entityReferenceService.get)
      // get the BridgeDB path to get xrefs for the entity reference
      .map(function(normalizedEntityReference) {
        console.log('normalizedEntityReference');
        console.log(normalizedEntityReference);
        specifiedEntityReference = normalizedEntityReference;
        var path = '/' + encodeURIComponent(specifiedEntityReference.organism) + '/xrefs/' + encodeURIComponent(specifiedEntityReference.alternatePrefix[0]) + '/' + encodeURIComponent(specifiedEntityReference.identifier);
        return instance.config.apiUrlStub + path;
      })
      // enrich and format the xrefs
      .flatMap(function(source) {
        return highland(request({
          url: source,
          withCredentials: false
        })
        .pipe(csv(csvOptions)));
      })
      .map(function(array) {
        return array;
      })
      .errors(function (err, push) {
        console.log(err);
        console.log('in xrefService.get()');
        // TODO what happens if BridgeDB webservices are down?
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
      .flatMap(instance.entityReferenceService.enrich)
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
  };

  function getBridgedbApiPathByEntityReference(args, callback) {
    instance.entityReferenceService.get(args)
    .each(function(entityReference) {
      return callback(null, '/' + encodeURIComponent(entityReference.organism) + '/xrefs/' + encodeURIComponent(entityReference.bridgedbSystemCode) + '/' + encodeURIComponent(entityReference.identifier));
    });
  }

  function formatAllForDisplay(args) {
    var entityReferenceStream = highland(args.entityReferences);
    var specifiedEntityReference = args.specifiedEntityReference;
    var label = args.label;
    var description = args.description;
    return entityReferenceStream.errors(function (err, push) {
      console.log(err);
      console.log('in xrefService.formatAllForDisplay()');
      //For unannotated nodes, without db or identifier
      return {
        'header': label,
        'description': description,
        'listItems': ['Missing identifier and db']
      };
      //return 'No entityReferenceXrefs returned. Is BridgeDB down?';
    })
    .map(function(entityReference) {
      var identifier = entityReference.identifier;
      var listItem = {};
      listItem.title = entityReference.db;
      listItem.text = identifier;
      listItem.priority = entityReference.priority;
      if (entityReference.hasOwnProperty('linkoutPattern')) {
        listItem.uri = entityReference.linkoutPattern.replace('$id', identifier);
      }
      return listItem;
    })
    .collect()
    .map(function(listItems) {
      return listItems.sort(function(a, b) {
        // two-factor sort: primary key is "priority" and secondary key is "title," which in this case is the db
        if (a.priority === b.priority) {
          var x = a.title.toLowerCase(),
            y = b.title.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        }
        return b.priority - a.priority;
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
      // handle case where either 0 or 1 result is returned by bridgedb webservice. This would most likely happen if BridgeDB is down.
      if (listItems.length < 2) {
        var uri = '';
        if (specifiedEntityReference.hasOwnProperty('linkoutPattern')) {
          uri = specifiedEntityReference.linkoutPattern.replace('$id', specifiedEntityReference.identifier);
        }
        listItems = [{'key': specifiedEntityReference.db, 'values':[{'priority': '1','text': specifiedEntityReference.identifier,'title': specifiedEntityReference.db,'uri':uri}]}];
      } else {
        // We want the identifier that was specified by the pathway creator for this data node to be listed first.
        console.log('specifiedEntityReference');
        console.log(specifiedEntityReference);
        var specifiedListItem = _.remove(listItems, function(element) {
          return (element.key === specifiedEntityReference.db);
        })[0];

        var specifiedXRefId = _.remove(specifiedListItem.values, function(element) {
          return (element.text === specifiedEntityReference.identifier);
        })[0];

        specifiedListItem.values.unshift(specifiedXRefId);

        listItems.unshift(specifiedListItem);
      }

      return listItems;
    })
    .collect();
  }

  function exists(bridgedbSystemCode, identifier, organism, callbackOutside) {
    var path = '/' + encodeURIComponent(organism) + '/xrefExists/' + bridgedbSystemCode + '/' + identifier;
    var source = instance.config.apiUrlStub + path;

    highland(request({
      url: source,
      withCredentials: false
    })).each(function(str) {
      return callbackOutside(null, str.toString() === 'true');
    });
  }

  return {
    createStream:createStream,
    get:get,
    exists:exists
  };
};

exports = module.exports = XrefService;
