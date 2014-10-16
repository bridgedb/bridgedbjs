var _ = require('lodash');
var async = require('async');
var d3 = require('d3');
var tsvParser = require('csv-parser')({
  separator: '\t'
});
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var Utilities = require('./utilities.js');

var Xref = function(instance) {
  var providedIdentifier, providedDb;

  var enrich = function(xref) {
    return instance.metadataService.getByDb(xref.db).map(function(metadataRow) {
      if (!!metadataRow.type) {
        xref.type = metadataRow.type;
      }
      if (!!metadataRow.namespace) {
        xref.namespace = metadataRow.namespace;
        xref.id = 'http://identifiers.org/' + metadataRow.namespace + '/' + xref.identifier;
      }
      return xref;
    });
  };

  function get(args, callbackOutside) {
    getBridgedbApiPathByEntityReference(args, function(err, path) {
      var xrefs = [];
      var source = instance.config.apiUrlStub + path;
      var headers = ['identifier', 'db'].join('\t') + '\n';

      var tsvStream = highland([headers]).concat(
        request({
          url: source
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

      highland('data', tsvStream)
      .flatMap(enrich)
      .map(function(xref) {
        xrefs.push(xref);
        return xref;
      })
      .last()
      .each(function() {
      });

      highland('end', tsvStream).each(function(endValue) {
        if (_.isEmpty(xrefs)) {
          enrich({db: providedDb, identifier: providedIdentifier}).each(function(xrefs) {
            tsvParser.end();
            tsvStream.end();
            return callbackOutside(null, xrefs);
          });
        } else {
          tsvParser.end();
          tsvStream.end();
          return callbackOutside(null, xrefs);
        }
      });
    });
  }

  function getBridgedbApiPathByEntityReference(args, callback) {
    var path;
    /*
    if (!!args.bridgedbUrl) {
      var bridgedbUrlComponents = args.bridgedbUrl.split(instance.config.apiUrlStub);
      path = bridgedbUrlComponents[bridgedbUrlComponents.length - 1];

      var bridgedbPathComponents = result.path.split('/');
      var bridgedbSystemCode = bridgedbPathComponents[3];

      instance.metadataService.getByBridgedbSystemCode(bridgedbSystemCode).eachfunction(metadataRow) {
        providedDb = metadataRow.db;

        var identifier = bridgedbPathComponents[4];
        providedIdentifier = identifier;

        return callback(null, path);
      });
    } else
    //*/
    if (!!args.organism && (!!args.bridgedbSystemCode || !!args.db) && typeof args.identifier !== 'undefined') {
      providedDb = args.db;
      providedIdentifier = args.identifier;
      if (!!args.bridgedbSystemCode) {
        path = '/' + encodeURIComponent(args.organism) + '/xrefs/' + encodeURIComponent(args.bridgedbSystemCode) + '/' + encodeURIComponent(args.identifier);
        return callback(null, path);
      } else {
        instance.metadataService.getBridgedbSystemCodeByDb(args.db, function(err, bridgedbSystemCode) {
          path = '/' + encodeURIComponent(args.organism) + '/xrefs/' + encodeURIComponent(bridgedbSystemCode) + '/' + encodeURIComponent(args.identifier);
          return callback(null, path);
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

        instance.metadataService.getByIdentifiersNamespace(identifiersNamespace).each(function(metadataForIdentifiersNamespace) {
          var db = metadataForIdentifiersNamespace.db;
          providedDb = db;

          var identifier = identifiersPathComponents[2];
          providedIdentifier = identifier;

          instance.metadataService.getBridgedbSystemCodeByDb(db).each(function(bridgedbSystemCode) {
            instance.organismService.getByIdentifier(identifiersId).each(function(organism) {

              /* TODO add this error catcher
              if (err || !organism) {
                return callback('Could not find BridgeDB reference matching provided entityReference "' + identifiersId + '"');
              }
              //*/

              path = '/' + encodeURIComponent(organism.latin) + '/xrefs/' + encodeURIComponent(bridgedbSystemCode) + '/' + encodeURIComponent(identifier);
              return callback(null, path);
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
        //For unannotated nodes, without db or identifier
        var annotationData = {
          'header': label,
          'description': description,
          'listItems': ['Missing identifier and db']
        };
        callback('No entityReferenceXrefs returned. Is BridgeDB down?', annotationData);
      }

      var currentDataSourceRow;
      var listItems;

      var createListItem = function(entityReferenceXref, mapCallback){ 
        var listItem = {};
        listItem.title = entityReferenceXref.db;
        listItem.text = entityReferenceXref.identifier;
        instance.metadataService.getByDb(entityReferenceXref.db).each(function(metadataForDb) {
          listItem.priority = metadataForDb.priority;
          if (metadataForDb.hasOwnProperty('linkoutPattern')) {
            if (metadataForDb.linkoutPattern !== '' && metadataForDb.linkoutPattern !== null) {
              listItem.uri = metadataForDb.linkoutPattern.replace('$id', listItem.text);
            }
          }
          return mapCallback(null, listItem);
        });
      };

      async.map(entityReferenceXrefs, createListItem, function(err, listItems){
        listItems.sort(function(a, b) {
          // two-factor sort: primary key is "priority" and secondary key is "title," which in this case is the db
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
          instance.metadataService.getByDb(providedDb).each(function(metadata) {
            if (metadata.hasOwnProperty('linkoutPattern')) {
              if (metadata.linkoutPattern !== '' && metadata.linkoutPattern !== null) {
                uri = metadata.linkoutPattern.replace('$id', providedIdentifier);
              }
            }
            nestedListItems = [{'key': providedDb, 'values':[{'priority': '1','text': providedIdentifier,'title': providedDb,'uri':uri}]}];
          });
        } else {
          // We want the identifier that was specified by the pathway creator for this data node to be listed first.
          var specifiedListItem = _.remove(nestedListItems, function(element) {return (element.key === providedDb);})[0];

          var specifiedXRefId = _.remove(specifiedListItem.values, function(element) {return (element.text === providedIdentifier);})[0];
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

  function exists(bridgedbSystemCode, identifier, organism, callbackOutside) {
    var path = '/' + encodeURIComponent(organism) + '/xrefExists/' + bridgedbSystemCode + '/' + identifier;
    var source = instance.config.apiUrlStub + path;

    highland(request({url: source})).each(function(str) {
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
