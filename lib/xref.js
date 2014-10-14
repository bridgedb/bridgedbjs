var _ = require('lodash');
var async = require('async');
var config = require('./config.js');
var CorsProxy = require('./cors-proxy.js');
var csv = require('csv');
var d3 = require('d3');
var EventEmitter = require('events').EventEmitter;
var tsvParser = require('csv-parser')({
      separator: '\t'
    });
var highland = require('highland');
var http = require('http');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var Utilities = require('./utilities.js');

var Xref = function(instance) {
  var providedDbId, providedDbName;

  function get(args, callbackOutside) {
    getBridgedbApiHostAndPathByEntityReference(args, function(err, hostAndPath) {
      /*
      var options = CorsProxy.convertOptions({
        host: hostAndPath.host,
        path: hostAndPath.path,
        port: '80',
        withCredentials: false//,
        //headers: {'custom': 'Custom Header'}
      });
      //*/

      var source = instance.config.apiUrlStub + hostAndPath.path;

      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          var enrichXref = function(xref, enrichXrefCallback) {
            instance.metadataService.getByDbName(xref.dbName, function(err, metadataRow) {
              if (!!metadataRow.type) {
                xref.type = metadataRow.type;
              }
              if (!!metadataRow.namespace) {
                xref.namespace = metadataRow.namespace;
                xref.id = 'http://identifiers.org/' + metadataRow.namespace + '/' + xref.dbId;
              }
              return enrichXrefCallback(null, xref);
            });
          };

          // if no results returned from BridgeDB, just return the provided data, formatted for display
          if (_.isEmpty(str)) {
            var xrefs = enrichXref({dbName: providedDbName, dbId: providedDbId}, function(err, enrichedXref) {
              return callbackOutside(null, [enrichedXref]);
            });
          } else {
            csv().from.string(
              str,
              {
                delimiter: '\t',
                columns: ['dbId', 'dbName']
              }
            ).to.array(function(xrefs){
              async.map(xrefs, enrichXref, function(err, enrichedXrefs) {
                callbackOutside(null, enrichedXrefs);
              });
            });
          }
        });
      };

      var req = http.request(source, callback);
      req.end();
    });
  }

  function getBridgedbApiHostAndPathByEntityReference(args, callback) {
    var result = {};
    result.host = config.default.host;
    if (!!args.bridgedbUri) {
      var bridgedbUriComponents = args.bridgedbUri.split(result.host);
      result.path = bridgedbUriComponents[bridgedbUriComponents.length - 1];

      var bridgedbPathComponents = result.path.split('/');
      var systemCode = bridgedbPathComponents[3];

      instance.metadataService.getBySystemCode(systemCode, function(err, metadataRow) {
        providedDbName = metadataRow.dbName;

        var dbId = bridgedbPathComponents[4];
        providedDbId = dbId;

        return callback(null, result);
      });
    } else if (!!args.organism && (!!args.systemCode || !!args.dbName) && typeof args.dbId !== 'undefined') {
      providedDbName = args.dbName;
      providedDbId = args.dbId;
      if (!!args.systemCode) {
        result.path = '/' + encodeURIComponent(args.organism) + '/xrefs/' + encodeURIComponent(args.systemCode) + '/' + encodeURIComponent(args.dbId);
        return callback(null, result);
      } else {
        instance.metadataService.getBridgedbSystemCode(args.dbName, function(err, systemCode) {
          result.path = '/' + encodeURIComponent(args.organism) + '/xrefs/' + encodeURIComponent(systemCode) + '/' + encodeURIComponent(args.dbId);
          return callback(null, result);
        });
      }
    } else {
      var entityReferenceIdCandidates = [
        args.entityReference,
        args.id,
        args['@id'],
        args.identifier,
        args.identifiers,
        args.iri,
        args.uri,
        args.identifiersId
      ];

      var identifiersIdResults = _.filter(entityReferenceIdCandidates, function(entityReferenceIdCandidate) {
        var entityReferenceIdCandidateIsValid = false;
        if (!!entityReferenceIdCandidate) {
          entityReferenceIdCandidateIsValid = entityReferenceIdCandidate.indexOf('identifiers.org') > -1;
        }
        return entityReferenceIdCandidateIsValid;
      });
      if (!!identifiersIdResults && identifiersIdResults.length > 0) {
        var identifiersId = identifiersIdResults[0];
        var identifiersUriComponents = identifiersId.split('identifiers.org');
        var identifiersPath = identifiersUriComponents[identifiersUriComponents.length - 1];

        var identifiersPathComponents = identifiersPath.split('/');
        var identifiersNamespace = identifiersPathComponents[1];

        instance.metadataService.getByIdentifiersNamespace(identifiersNamespace, function(err, metadataForIdentifiersNamespace) {
          var dbName = metadataForIdentifiersNamespace.dbName;
          providedDbName = dbName;

          var dbId = identifiersPathComponents[2];
          providedDbId = dbId;

          instance.metadataService.getBridgedbSystemCode(dbName, function(err, systemCode) {
            //instance.organismService.getByIdentifier(identifiersId).each(function(organism) {
            instance.organismService.getByIdentifier(identifiersId, function(err, organism) {

              /* TODO add this error catcher
              if (err || !organism) {
                return callback('Could not find BridgeDB reference matching provided entityReference "' + identifiersId + '"');
              }
              //*/

              result.path = '/' + encodeURIComponent(organism.latin) + '/xrefs/' + encodeURIComponent(systemCode) + '/' + encodeURIComponent(dbId);
              return callback(null, result);
            });
          });
        });
      } else {
        throw new Error('Not enough data specified to identify desired entity reference.');
      }
    }
  }

  function getNestedForDisplay(args, callback) {
    var label = args.label,
        description = args.description;

    get(args, function(err, entityReferenceXrefs) {
      if (err || _.isNull(entityReferenceXrefs)) { //BridgeDb Error
        //For unannotated nodes, without dbName or dbId
        var annotationData = {
          'header': label,
          'description': description,
          'listItems': ['Missing dbId and dbName']
        };
        callback('No entityReferenceXrefs returned. Is BridgeDB down?', annotationData);
      }

      var currentDataSourceRow;
      var listItems;

      var createListItem = function(entityReferenceXref, mapCallback){ 
        var listItem = {};
        listItem.title = entityReferenceXref.dbName;
        listItem.text = entityReferenceXref.dbId;
        instance.metadataService.getByDbName(entityReferenceXref.dbName, function(err, metadataForDbName) {
          listItem.priority = metadataForDbName.priority;
          if (metadataForDbName.hasOwnProperty('linkoutPattern')) {
            if (metadataForDbName.linkoutPattern !== '' && metadataForDbName.linkoutPattern !== null) {
              listItem.uri = metadataForDbName.linkoutPattern.replace('$id', listItem.text);
            }
          }
          return mapCallback(null, listItem);
        });
      };

      async.map(entityReferenceXrefs, createListItem, function(err, listItems){
        listItems.sort(function(a, b) {
          // two-factor sort: primary key is "priority" and secondary key is "title," which in this case is the dbName
          if (a.priority === b.priority) {
            var x = a.title.toLowerCase(),
              y = b.title.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
          }
          return b.priority - a.priority;
        });

        var nestedListItems = d3.nest()
        .key(function(d) { return d.title; })
        .entries(listItems);

        // handle case where either 0 or 1 result is returned by bridgedb webservice. This would most likely happen if BridgeDB is down.
        if (nestedListItems.length < 2) {
          var uri = '';
          instance.metadataService.getByDbName(providedDbName, function(err, metadata) {
            if (metadata.hasOwnProperty('linkoutPattern')) {
              if (metadata.linkoutPattern !== '' && metadata.linkoutPattern !== null) {
                uri = metadata.linkoutPattern.replace('$id', providedDbId);
              }
            }
            nestedListItems = [{'key': providedDbName, 'values':[{'priority': '1','text': providedDbId,'title': providedDbName,'uri':uri}]}];
          });
        } else {
          // We want the identifier that was specified by the pathway creator for this data node to be listed first.
          var specifiedListItem = _.remove(nestedListItems, function(element) {return (element.key === providedDbName);})[0];

          var specifiedXRefId = _.remove(specifiedListItem.values, function(element) {return (element.text === providedDbId);})[0];
          specifiedListItem.values.unshift(specifiedXRefId);

          nestedListItems.unshift(specifiedListItem);
        }

        var annotationData = {
          'header': label,
          'description': description,
          'listItems': nestedListItems
        };
        return callback(null, annotationData);
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

  function exists(systemCode, dbId, organism, callbackOutside) {
    var path = '/' + encodeURIComponent(organism) + '/xrefExists/' + systemCode + '/' + dbId;
    var source = instance.config.apiUrlStub + path;

    var callback = function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        callbackOutside(null, str === 'true');
      });
    };

    var req = http.request(source, callback);
    req.end();
  }


  return {
    get:get,
    getNestedForDisplay:getNestedForDisplay,
    exists:exists
  };
};

exports = module.exports = Xref;
