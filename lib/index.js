var _ = require('lodash');
var async = require('async');
var config = require('./config.js');
var CorsProxy = require('./cors-proxy.js');
var csv = require('csv');
var d3 = require('d3');
var tsvParser = require('csv-parser')({
      separator: '\t'
    });
var highland = require('highland');
var http = require('http');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var MetadataService = require('./metadata-service.js');
var request = require('request');

var BridgeDb = (function(){

  var metadata;
  if (!metadata) {
    MetadataService.get(function(err, returnedMetadata) {
      metadata = returnedMetadata;
    });
  }

  var providedDbId, providedDbName;

  function getMetadata(callbackOutside) {
    var that = this;
    if (!!this.metadata) {
      return callbackOutside(null, this.metadata);
    } 

    var metadata = [];
    //*
    var options = {
      host: 'pointer.ucsf.edu',
      path: '/d3/r/data-sources/bridgedb-datasources.php',
      port: '80',
      withCredentials: false//,
      //headers: {'custom': 'Custom Header'}
    };
    //*/

    var source = 'http://' + options.host + options.path;

    var headers = [
      'dbName',
      'systemCode',
      'website',
      'linkoutPattern',
      'exampleIdentifier',
      'type',
      'organism',
      'priority',
      'miriamRootUrn',
      'regex',
      'officialName'
    ]
    .join('\t') + '\n';

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
    .errors(function (err, push) {
      // do nothing. this just filters out errors.
    })
    .pipe(tsvParser);

    highland('data', tsvStream)
    .map(function(metadataRow) {

      // remove empty properties

      return _.omit(metadataRow, function(value) {
        return value === '';
      });
    })
    .map(function(metadataRow) {
      // TODO remove this code if the datasources.txt file gets corrected, making these corrections redundant.
      metadataRow.miriamRootUrn = metadataRow.miriamRootUrn.toLowerCase();
      if (!!metadataRow.miriamRootUrn && metadataRow.miriamRootUrn.indexOf('urn:miriam') > -1) {
        if (metadataRow.miriamRootUrn === 'urn:miriam:obo.go') {
          metadataRow.miriamRootUrn = 'urn:miriam:go:';
        }
        if (metadataRow.miriamRootUrn[metadataRow.miriamRootUrn.length - 1] !== ':') {
          metadataRow.miriamRootUrn += ':';
        }
        metadataRow.namespace = metadataRow.miriamRootUrn.substring(11, metadataRow.miriamRootUrn.length - 1);
      }
      return metadataRow;
    })
    .map(function(metadataRow) {
      if (!!metadataRow.type) {
        if (metadataRow.type === 'gene' || metadataRow.type === 'probe' || metadataRow.namespace === 'go') {
          metadataRow.type = 'DnaReference';
        } else if (metadataRow.type === 'rna') {
          metadataRow.type = 'RnaReference';
        } else if (metadataRow.type === 'protein') {
          metadataRow.type = 'ProteinReference';
        } else if (metadataRow.type === 'metabolite') {
          metadataRow.type = 'SmallMoleculeReference';
        } else if (metadataRow.type === 'pathway') {
          metadataRow.type = 'Pathway';
        }
      }

      metadata.push(metadataRow);
      return metadataRow;
    })
    .last()
    // TODO why are we not using collect?
    //.collect()
    .each(function(metadataRow) {
    });

    highland('end', tsvStream).each(function() {
      tsvParser.end();
      tsvStream.end();
      that.metadata = metadata;
      return callbackOutside(null, metadata);
    });

    /* disabling this one now, because it's not available via CORS
     * TODO get a version that works with CORS
    var options = {
      host: 'svn.bigcat.unimaas.nl',
      path: '/bridgedb/trunk/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
      port: '80',
      withCredentials: false//,
    //headers: {'custom': 'Custom Header'}
    };
    //*/
  }

  function getEntityReferenceIdentifiersIri(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  }

  function getBridgedbApiHostAndPathByEntityReference(args, callback) {
    var result = {};
    result.host = 'webservice.bridgedb.org';
    if (!!args.bridgedbUri) {
      var bridgedbUriComponents = args.bridgedbUri.split(result.host);
      result.path = bridgedbUriComponents[bridgedbUriComponents.length - 1];

      var bridgedbPathComponents = result.path.split('/');
      var systemCode = bridgedbPathComponents[3];

      MetadataService.getBySystemCode(systemCode, function(err, metadataRow) {
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
        getBridgedbSystemCode(args.dbName, function(err, systemCode) {
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

        MetadataService.getByIdentifiersNamespace(identifiersNamespace, function(err, metadataForIdentifiersNamespace) {
          var dbName = metadataForIdentifiersNamespace.dbName;
          providedDbName = dbName;

          var dbId = identifiersPathComponents[2];
          providedDbId = dbId;

          getBridgedbSystemCode(dbName, function(err, systemCode) {
            var options = CorsProxy.convertOptions({
              host: 'webservice.bridgedb.org',
              path: '/contents',
              port: '80',
              withCredentials: false//,
              //headers: {'custom': 'Custom Header'}
            });

            var callbackOrganismsAvailableAtBridgedb = function(response) {
              var str = '';
              response.on('data', function (chunk) {
                str += chunk;
              });

              response.on('end', function () {
                csv().from
                .string(
                  str,
                  {delimiter:'\t',
                  columns:['english', 'latin']} )
                  .to.array( function(organismsAvailableAtBridgedb){
                    var organismsAvailableAtBridgedbCount = organismsAvailableAtBridgedb.length;
                    var validOrganism;
                    var thisXrefExists = false;
                    var i = 0;
                    async.doUntil(
                      function (doUntilCallback) {
                        xrefExists(encodeURIComponent(organismsAvailableAtBridgedb[i].english), systemCode, dbId, function(err, exists) {
                          thisXrefExists = exists;
                          if (exists) {
                            validOrganism = organismsAvailableAtBridgedb[i];
                          }
                          i++;
                          doUntilCallback();
                        });
                      },
                      function () {
                        return i > organismsAvailableAtBridgedbCount - 1 || thisXrefExists;
                      },
                      function (err) {
                        if (err || !thisXrefExists) {
                          return callback('Could not find BridgeDB reference matching provided entityReference "' + identifiersId + '"');
                        }

                        result.path = '/' + encodeURIComponent(validOrganism.english) + '/xrefs/' + encodeURIComponent(systemCode) + '/' + encodeURIComponent(dbId);
                        return callback(null, result);
                      }
                    );
                  });
              });
            };
            var req = http.request(options, callbackOrganismsAvailableAtBridgedb);
            req.end();
          });
        });
      } else {
        throw new Error('Not enough data specified to identify desired entity reference.');
      }
    }
  }

  function getBridgedbSystemCode(dbName, callback) {
    MetadataService.getByDbName(dbName, function(err, metadataForDbName) {
      if (!metadataForDbName) {
        return callback('No datasource row available for dbName "' + dbName + '"');
      }
      var systemCode = metadataForDbName.systemCode;
      return callback(null, systemCode);
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
    getXrefs(args, function(err, entityReferenceXrefs) {
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

  function getXrefsNestedForDisplay(args, callback) {
    var label = args.label,
        description = args.description;

    getXrefs(args, function(err, entityReferenceXrefs) {
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
        MetadataService.getByDbName(entityReferenceXref.dbName, function(err, metadataForDbName) {
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
          MetadataService.getByDbName(providedDbName, function(err, metadata) {
            if (metadata.hasOwnProperty('linkoutPattern')) {
              if (metadata.linkoutPattern !== '' && metadata.linkoutPattern !== null) {
                uri = metadata.linkoutPattern.replace('$id', providedDbId);
              }
            }
            nestedListItems = [{'key': providedDbName, 'values':[{'priority': '1','text': providedDbId,'title': providedDbName,'uri':uri}]}];
          });
        } else {
          // We want the identifier that was listed by the pathway creator for this data node to be listed first.
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

  function xrefExists(organism, systemCode, dbId, callbackOutside) {
    var options = CorsProxy.convertOptions({
      host: 'webservice.bridgedb.org',
      path: '/' + organism + '/xrefExists/' + systemCode + '/' + dbId,
      port: '80',
      withCredentials: false//,
      //headers: {'custom': 'Custom Header'}
    });

    var callback = function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        callbackOutside(null, str === 'true');
      });
    };

    var req = http.request(options, callback);
    req.end();
  }

  function getXrefs(args, callbackOutside) {
    getBridgedbApiHostAndPathByEntityReference(args, function(err, hostAndPath) {
      var options = CorsProxy.convertOptions({
        host: hostAndPath.host,
        path: hostAndPath.path,
        port: '80',
        withCredentials: false//,
        //headers: {'custom': 'Custom Header'}
      });

      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          var enrichXref = function(xref, enrichXrefCallback) {
            MetadataService.getByDbName(xref.dbName, function(err, metadataRow) {
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

      var req = http.request(options, callback);
      req.end();
    });
  }

  return {
    map:map,
    getXrefs:getXrefs,
    getXrefsNestedForDisplay:getXrefsNestedForDisplay
  };
}());

module.exports = BridgeDb;
