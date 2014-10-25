var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var XrefService = function(instance) {
  'use strict';

  function get(args, callbackOutside) {
    var specifiedEntityReference;
      
    // normalize the provided entity reference
    return instance.entityReferenceService.get(args)
    // get the BridgeDB path to get xrefs for the entity reference
    .map(function(entityReference) {
      specifiedEntityReference = entityReference;
      var path = '/' + encodeURIComponent(entityReference.organism) + '/xrefs/' + encodeURIComponent(entityReference.bridgedbSystemCode) + '/' + encodeURIComponent(entityReference.identifier);
      return instance.config.apiUrlStub + path;
    })
    // enrich and format the xrefs
    .flatMap(function(source) {
      return highland(request({
        url: source,
        withCredentials: false
      })
      .pipe(tsv));
    })
    .map(function(array) {
      return array;
    })
    // TODO find out whether this also filters out the end event
    .errors(function (err, push) {
      console.log(err);
      console.log('in xrefService.get()');
      console.log(this.toString());
      console.log(this);
      // do nothing. this just filters out errors.
    })
    .map(function(array) {
      return {
        identifier: array[0],
        db: array[1]
      };
    })
    .flatMap(instance.entityReferenceService.enrich)
    .map(function(entityReference) {
      return entityReference;
    });
  }

  function getBridgedbApiPathByEntityReference(args, callback) {
    instance.entityReferenceService.get(args)
    .each(function(entityReference) {
      return callback(null, '/' + encodeURIComponent(entityReference.organism) + '/xrefs/' + encodeURIComponent(entityReference.bridgedbSystemCode) + '/' + encodeURIComponent(entityReference.identifier));
    });
  }

  function getNestedForDisplay(args, callback) {
    var label = args.label;
    var description = args.description;
    var specifiedIdentifier, specifiedDb;

    get(args, function(err, entityReferenceXrefs) {
      var specifiedEntityReference = _.find(entityReferenceXrefs, {'specified': true});
      specifiedDb = specifiedEntityReference.db;
      specifiedIdentifier = specifiedEntityReference.identifier;
      if (err || _.isNull(entityReferenceXrefs)) { //BridgeDb Error
        console.log(err);
        console.log('in xrefService.getNestedForDisplay()');
        console.log(this.toString());
        console.log(this);
        //For unannotated nodes, without db or identifier
        var annotationData = {
          'header': label,
          'description': description,
          'listItems': ['Missing identifier and db']
        };
        return callback('No entityReferenceXrefs returned. Is BridgeDB down?', annotationData);
      }

      var currentDataSourceRow;
      var listItems;

      highland(entityReferenceXrefs).flatMap(function(entityReferenceXref){ 
        return instance.metadataService.getByDb(entityReferenceXref.db).map(function(metadataForDb) {
          var listItem = {};
          listItem.title = entityReferenceXref.db;
          listItem.text = entityReferenceXref.identifier;
          listItem.priority = metadataForDb.priority;
          if (metadataForDb.hasOwnProperty('linkoutPattern')) {
            if (metadataForDb.linkoutPattern !== '' && metadataForDb.linkoutPattern !== null) {
              listItem.uri = metadataForDb.linkoutPattern.replace('$id', listItem.text);
            }
          }
          return listItem;
        });
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
      /*
      .map(function(listItems) {
        var d3 = require('d3');
        return d3.nest()
        .key(function(d) { return d.title; })
        .entries(listItems);
      })
      //*/
      .map(highland.group('title'))
      .each(function(listItems) {
        highland(listItems)
        .map(highland.pairs)
        .sequence()
        .map(function(pair) {
          return {
            key: pair[0],
            values: pair[1]
          };
        })
        .collect()
        .map(function(listItems) {
          // handle case where either 0 or 1 result is returned by bridgedb webservice. This would most likely happen if BridgeDB is down.
          if (listItems.length < 2) {
            var uri = '';
            instance.metadataService.getByDb(specifiedDb).each(function(metadata) {
              if (metadata.hasOwnProperty('linkoutPattern')) {
                if (metadata.linkoutPattern !== '' && metadata.linkoutPattern !== null) {
                  uri = metadata.linkoutPattern.replace('$id', specifiedIdentifier);
                }
              }
              listItems = [{'key': specifiedDb, 'values':[{'priority': '1','text': specifiedIdentifier,'title': specifiedDb,'uri':uri}]}];
            });
          } else {
            // We want the identifier that was specified by the pathway creator for this data node to be listed first.
            var specifiedListItem = _.remove(listItems, function(element) {
              return (element.key === specifiedDb);
            })[0];

            var specifiedXRefId = _.remove(specifiedListItem.values, function(element) {
              return (element.text === specifiedIdentifier);
            })[0];

            specifiedListItem.values.unshift(specifiedXRefId);

            listItems.unshift(specifiedListItem);
          }

          return listItems;
        })
        .each(function(nestedListItems) {
          /*
          console.log('612nestedListItems2');
          console.log(nestedListItems2);
          var compare1 = _.xor(nestedListItems[0], nestedListItems2[0]);
          console.log('compare1');
          console.log(compare1);

          // dev only
          //var diff = require('deep-diff').diff;
          var pvjsonDiffs = diff(nestedListItems, nestedListItems2);
          var pvjsonDiffs1 = diff({a:1}, {a:2});
          console.log('compare2');
          console.log(pvjsonDiffs);
          console.log(JSON.stringify(pvjsonDiffs, null, '  '));
          //*/
          var annotationData = {
            'header': label,
            'description': description,
            'listItems': nestedListItems
          };
          return callback(null, annotationData);
        });
      });
    });
  }

  /**
   * map
   *
   * @param args
   *  targetNamespace required. This namespace is the Miriam/identifiers.org namespace.
   * @param callback
   * @return Array containing IRIs to target database
   */
  function map(args, callback) {
    var targetNamespace = args.targetNamespace;
    if (!targetNamespace) {
      return callback('targetNamespace missing');
    }
    get(args, function(err, entityReferenceXrefs) {
      if (err) {
        console.log(err);
        console.log('in xrefService.map()');
        console.log(this.toString());
        console.log(this);
      }
      var targetReferences = entityReferenceXrefs.filter(function(entityReferenceXref) {
        return entityReferenceXref.namespace === targetNamespace;
      });
      if (targetReferences.length > 0) {
        var targetIds = targetReferences.map(function(targetReference) {
          return targetReference.id;
        });
        return callback(null, targetIds);
      } else {
        return callback('No entity references available for targetNamespace "' + targetNamespace + '"');
      }
    });
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
    get:get,
    getNestedForDisplay:getNestedForDisplay,
    exists:exists
  };
};

exports = module.exports = XrefService;
