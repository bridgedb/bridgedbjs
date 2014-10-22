var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var tsvParser = require('csv-parser')({
  separator: '\t'
});
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var Utilities = require('./utilities.js');

var Xref = function(instance) {

  function get(args, callbackOutside) {
    var specifiedEntityReference;
      
    var xrefLoaded = new EventEmitter();
    var xrefLoadedStream = highland('load', xrefLoaded);

    // normalize the provided entity reference
    return instance.entityReferenceService.get(args)
    // get the BridgeDB path to get xrefs for the entity reference
    .map(function(entityReference) {
      console.log('entityReference528');
      console.log(entityReference);
      specifiedEntityReference = entityReference;
      return '/' + encodeURIComponent(entityReference.organism.latin) + '/xrefs/' + encodeURIComponent(entityReference.bridgedbSystemCode) + '/' + encodeURIComponent(entityReference.identifier);
    })
    // enrich and format the xrefs
    .flatMap(function(path) {
      var xrefs = [];
      var source = instance.config.apiUrlStub + path;
      var headers = ['identifier', 'db'].join('\t') + '\n';

      var tsvStream = highland([headers]).concat(
        request({
          url: source,
          withCredentials: false
        }, function(error, response, body) {
          var args = {};
          response = response;
          args.error = error;
          args.body = body;
          args.source = source;
          httpErrors(args);
          tsvStream.end();
          tsvParser.end();
        })
      )
      // TODO find out whether this also filters out the end event
      .errors(function (err, push) {
        // do nothing. this just filters out errors.
      })
      .pipe(tsvParser);

      // process rows of TSV data returned from request
      return highland('data', tsvStream)
      .consume(function(err, xref, push, next) {
        if (err) {
          // pass errors along the stream and consume next value
          push(err);
          next();
        } else if (xref === highland.nil) {
          // pass nil (end event) along the stream
          push(null, xref);
          push(null, highland.nil);
        } else {
          /*
          instance.metadataService.getByDb(searchResult.db).flatMap(function(metadataRow) {
            return enrich(searchResult, metadataRow);
          })
          .each(function(enrichedSearchResult) {
            console.log('enrichedSearchResult515');
            console.log(enrichedSearchResult);
            push(null, enrichedSearchResult);
          });
          //*/
          /*
          instance.metadataService.getByDb(xref.db).each(function(metadataRow) {
            var enrichedSearchResult = enrich(xref, metadataRow);
            console.log('xref112');
            console.log(xref);
            push(null, enrichedSearchResult);
          });
          //*/
          //*
          instance.metadataService.getByDb(xref.db).each(function(metadataRow) {
            instance.entityReferenceService.enrich(xref, metadataRow).each(function(enrichedXref) {
              console.log('enrichedXref112');
              console.log(enrichedXref);
              push(null, enrichedXref);
            });
          });
          //*/
        }
      });
      /*
      .map(function(enrichedXref) {
        searchResults.push(searchResult);
        return searchResults;
      })
      .flatMap(function(xref) {
        console.log('xref527');
        console.log(xref);
        return instance.entityReferenceService.enrich(xref)
        .map(function(xref) {
          if (xref.id === specifiedEntityReference.id) {
            xref.specified = true;
          }
          return xref;
        })
        .flatMap(function(xref) {
          xrefs.push(xref);
          xrefLoaded.emit('load', xref);
          return xref;
        });
      });
      //*/

      //return xrefLoadedStream;
      /*
      highland('end', tsvStream).each(function(endValue) {
        if (_.isEmpty(xrefs)) {
          instance.entityReferenceService.enrich(specifiedEntityReference).each(function(xrefs) {
            tsvParser.end();
            tsvStream.end();
            //return callbackOutside(null, xrefs);
          });
        } else {
          console.log('xrefs525');
          console.log(xrefs);
          tsvParser.end();
          tsvStream.end();
          //return callbackOutside(null, xrefs);
        }
      });
      //*/
    });

    //*/
  }

  function getBridgedbApiPathByEntityReference(args, callback) {
    instance.entityReferenceService.get(args)
    .each(function(entityReference) {
      return callback(null, '/' + encodeURIComponent(entityReference.organism.latin) + '/xrefs/' + encodeURIComponent(entityReference.bridgedbSystemCode) + '/' + encodeURIComponent(entityReference.identifier));
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

exports = module.exports = Xref;
