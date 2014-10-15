var d3 = require('d3')
  , _ = require('lodash')
  , csv = require('csv')
  , parser = csv.parse
  , async = require('async')
  , highland = require('highland')
  , httpErrors = require('./http-errors.js')
  , request = require('request')
  , jsonLdContext = require('./context.json')
  , config = require('./config.js')
  , http = require('http')
  ;

var BridgeDb = (function(){

  var providedDbId, providedDbName;

  function corsifyBridgedbWebservicesOptions(options) {
    var corsifiedOptionsHost = config.proxy.host;
    var corsifiedOptionsPath = config.proxy.path + options.path;
    options.host = corsifiedOptionsHost;
    options.path = corsifiedOptionsPath;
    return options;
  }

  function getBridgedbDatabaseMetadata(callbackOutside) {
    var that = this;
    if (this.bridgedbDatabaseMetadata) {
      return callbackOutside(null, this.bridgedbDatabaseMetadata);
    } 

    //*
    var options = {
      host: 'pointer.ucsf.edu',
      path: '/d3/r/data-sources/bridgedb-datasources.php',
      port: '80',
      withCredentials: false//,
      //headers: {'custom': 'Custom Header'}
    };
    //*/

    /*
    var source = 'http://' + options.host + options.path;

    var requestStream = highland(
      request({
        url: source
      }, function (error, response, body) {
        var args = {};
        response = response;
        args.error = error;
        args.body = body;
        args.source = source;
        httpErrors(args);
      })
    )
    .errors(function (err, push) {
      // do nothing. this just filters out errors.
    })
    .map(function(bufferChunk) {
      return bufferChunk.toString();
    })
    .each(function(data) {
      console.log('data');
      console.log(data);
    });
    //*/

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

    var callback = function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });

      response.on('end', function () {
        csv().from
        .string(
          str,
          {delimiter:'\t',
            // organism means "applicableOnlyToSpecies"
          columns:['dbName', 'systemCode', 'website', 'linkoutPattern', 'exampleIdentifier', 'type', 'organism', 'priority', 'miriamRootUrn', 'regex', 'officialName']} )
          .to.array( function(bridgedbDatabaseMetadata){
            _.forEach(bridgedbDatabaseMetadata, function(bridgedbDatabaseMetadataRow) {
              // TODO remove this code if the datasources.txt file gets corrected, making these corrections redundant.
              bridgedbDatabaseMetadataRow.miriamRootUrn = bridgedbDatabaseMetadataRow.miriamRootUrn.toLowerCase();
              if (!!bridgedbDatabaseMetadataRow.miriamRootUrn && bridgedbDatabaseMetadataRow.miriamRootUrn.indexOf('urn:miriam') > -1) {
                if (bridgedbDatabaseMetadataRow.miriamRootUrn === 'urn:miriam:obo.go') {
                  bridgedbDatabaseMetadataRow.miriamRootUrn = 'urn:miriam:go:';
                }
                if (bridgedbDatabaseMetadataRow.miriamRootUrn[bridgedbDatabaseMetadataRow.miriamRootUrn.length - 1] !== ':') {
                  bridgedbDatabaseMetadataRow.miriamRootUrn += ':';
                }
                bridgedbDatabaseMetadataRow.namespace = bridgedbDatabaseMetadataRow.miriamRootUrn.substring(11, bridgedbDatabaseMetadataRow.miriamRootUrn.length - 1);
              } else {
                delete bridgedbDatabaseMetadataRow.miriamRootUrn;
              }

              // remove items if empty

              if (!bridgedbDatabaseMetadataRow.exampleIdentifier) {
                delete bridgedbDatabaseMetadataRow.exampleIdentifier;
              }

              if (!bridgedbDatabaseMetadataRow.organism) {
                delete bridgedbDatabaseMetadataRow.organism;
              }

              if (!bridgedbDatabaseMetadataRow.regex) {
                delete bridgedbDatabaseMetadataRow.regex;
              }

              if (!!bridgedbDatabaseMetadataRow.type) {
                if (bridgedbDatabaseMetadataRow.type === 'gene' || bridgedbDatabaseMetadataRow.type === 'probe' || bridgedbDatabaseMetadataRow.namespace === 'go') {
                  bridgedbDatabaseMetadataRow.type = 'DnaReference';
                } else if (bridgedbDatabaseMetadataRow.type === 'rna') {
                  bridgedbDatabaseMetadataRow.type = 'RnaReference';
                } else if (bridgedbDatabaseMetadataRow.type === 'protein') {
                  bridgedbDatabaseMetadataRow.type = 'ProteinReference';
                } else if (bridgedbDatabaseMetadataRow.type === 'metabolite') {
                  bridgedbDatabaseMetadataRow.type = 'SmallMoleculeReference';
                } else if (bridgedbDatabaseMetadataRow.type === 'pathway') {
                  bridgedbDatabaseMetadataRow.type = 'Pathway';
                }
              }
            });
            that.bridgedbDatabaseMetadata = bridgedbDatabaseMetadata;
            callbackOutside(null, bridgedbDatabaseMetadata);
          });
      });
    };




    var req = http.request(options, callback);
    req.end();
  }

  function getEntityReferenceIdentifiersIri(bridgedbDatabaseMetadataForDbName, dbId, callback) {
    var iri = bridgedbDatabaseMetadataForDbName.linkoutPattern.replace('$id', dbId);
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

      getBridgedbDatabaseMetadataForSystemCode(systemCode, function(err, bridgedbDatabaseMetadataRow) {
        providedDbName = bridgedbDatabaseMetadataRow.dbName;

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

        getBridgedbDatabaseMetadataForIdentifiersNamespace(identifiersNamespace, function(err, bridgedbDatabaseMetadataForIdentifiersNamespace) {
          var dbName = bridgedbDatabaseMetadataForIdentifiersNamespace.dbName;
          providedDbName = dbName;

          var dbId = identifiersPathComponents[2];
          providedDbId = dbId;

          getBridgedbSystemCode(dbName, function(err, systemCode) {
            var options = corsifyBridgedbWebservicesOptions({
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
    getBridgedbDatabaseMetadataForDbName(dbName, function(err, bridgedbDatabaseMetadataForDbName) {
      if (!bridgedbDatabaseMetadataForDbName) {
        return callback('No datasource row available for dbName "' + dbName + '"');
      }
      var systemCode = bridgedbDatabaseMetadataForDbName.systemCode;
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
        getBridgedbDatabaseMetadataForDbName(entityReferenceXref.dbName, function(err, bridgedbDatabaseMetadataForDbName) {
          listItem.priority = bridgedbDatabaseMetadataForDbName.priority;
          if (bridgedbDatabaseMetadataForDbName.hasOwnProperty('linkoutPattern')) {
            if (bridgedbDatabaseMetadataForDbName.linkoutPattern !== '' && bridgedbDatabaseMetadataForDbName.linkoutPattern !== null) {
              listItem.uri = bridgedbDatabaseMetadataForDbName.linkoutPattern.replace('$id', listItem.text);
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
          getBridgedbDatabaseMetadataForDbName(providedDbName, function(err, bridgedbDatabaseMetadata) {
            if (bridgedbDatabaseMetadata.hasOwnProperty('linkoutPattern')) {
              if (bridgedbDatabaseMetadata.linkoutPattern !== '' && bridgedbDatabaseMetadata.linkoutPattern !== null) {
                uri = bridgedbDatabaseMetadata.linkoutPattern.replace('$id', providedDbId);
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

  function getBridgedbDatabaseMetadataForIdentifiersNamespace(identifiersNamespace, callback) {
    var bridgedbDatabaseMetadata = this.bridgedbDatabaseMetadata;
    async.waterfall([
      function(waterfallCallback) {
        if (!bridgedbDatabaseMetadata) {
          getBridgedbDatabaseMetadata(function(err, thisBridgedbDatabaseMetadata) {
            bridgedbDatabaseMetadata = thisBridgedbDatabaseMetadata;
            waterfallCallback(null);
          });
        } else {
          waterfallCallback(null);
        }
      },
      function(waterfallCallback) {
        var bridgedbDatabaseMetadataForIdentifiersNamespaceResults = bridgedbDatabaseMetadata.filter(function(bridgedbDatabaseMetadataRow) {
          return bridgedbDatabaseMetadataRow.namespace === identifiersNamespace;
        });

        if (!bridgedbDatabaseMetadataForIdentifiersNamespaceResults || bridgedbDatabaseMetadataForIdentifiersNamespaceResults.length === 0) {
          return callback('Could not find BridgeDB reference matching provided identifiers.org namespace "' + identifiersNamespace + '"');
        }
        return callback(null, bridgedbDatabaseMetadataForIdentifiersNamespaceResults[0]);
      }
    ]);
  }

  function normalizeText(inputText){
    // not using \w because we don't want to include the underscore
    var regexp = /[^A-Za-z0-9]/gi;
    var alphanumericText = inputText.replace(regexp, '');
    var normalizedText = alphanumericText;
    if (!_.isNull(alphanumericText)) {
      normalizedText = alphanumericText.toUpperCase();
    }
    return normalizedText;
  }

  function getBridgedbDatabaseMetadataForDbName(dbName, callback) {
    var bridgedbDatabaseMetadata = this.bridgedbDatabaseMetadata;
    async.waterfall([
      function(waterfallCallback) {
        if (!bridgedbDatabaseMetadata) {
          getBridgedbDatabaseMetadata(function(err, thisBridgedbDatabaseMetadata) {
            bridgedbDatabaseMetadata = thisBridgedbDatabaseMetadata;
            waterfallCallback(null);
          });
        } else {
          waterfallCallback(null);
        }
      },
      function(waterfallCallback) {
        // first attempt
        var bridgedbDatabaseMetadataForDbNameResults = bridgedbDatabaseMetadata.filter(function(row) { return row.dbName === dbName; });

        // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
        if (!bridgedbDatabaseMetadataForDbNameResults || bridgedbDatabaseMetadataForDbNameResults.length === 0) {
          bridgedbDatabaseMetadataForDbNameResults = bridgedbDatabaseMetadata.filter(function(row) {
            return normalizeText(row.dbName) === normalizeText(dbName);
          });

          // no third attempt. if nothing here, give up.
          if (!bridgedbDatabaseMetadataForDbNameResults || bridgedbDatabaseMetadataForDbNameResults.length === 0) {
            return callback('No BridgeDB database metadata returned for dbName "' + dbName + '"');
          }
        }

        return callback(null, bridgedbDatabaseMetadataForDbNameResults[0]);
      }
    ]);
  }

  function getBridgedbDatabaseMetadataForSystemCode(systemCode, callback) {
    var bridgedbDatabaseMetadata = this.bridgedbDatabaseMetadata;
    async.waterfall([
      function(waterfallCallback) {
        if (!bridgedbDatabaseMetadata) {
          getBridgedbDatabaseMetadata(function(err, thisBridgedbDatabaseMetadata) {
            bridgedbDatabaseMetadata = thisBridgedbDatabaseMetadata;
            waterfallCallback(null);
          });
        } else {
          waterfallCallback(null);
        }
      },
      function(waterfallCallback) {
        var bridgedbDatabaseMetadataForSystemCodeResults = bridgedbDatabaseMetadata.filter(function(row) { return row.systemCode === systemCode; });
        if (!bridgedbDatabaseMetadataForSystemCodeResults || bridgedbDatabaseMetadataForSystemCodeResults.length === 0) {
          return callback('No BridgeDB database metadata returned for systemCode "' + systemCode + '"');
        }
        return callback(null, bridgedbDatabaseMetadataForSystemCodeResults[0]);
      }
    ]);
  }

  function xrefExists(organism, systemCode, dbId, callbackOutside) {
    var options = corsifyBridgedbWebservicesOptions({
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
      var options = corsifyBridgedbWebservicesOptions({
        host: hostAndPath.host,
        path: hostAndPath.path,
        port: '80',
        withCredentials: false//,
        //headers: {'custom': 'Custom Header'}
      });



      var source = 'http://' + options.host + options.path;

      var requestStream = highland(
        request({
          url: source
          /*
          , headers: {
            'Accept': 'application/json'
          }
          //*/
        }, function (error, response, body) {
          var args = {};
          response = response;
          args.error = error;
          args.body = body;
          args.source = source;
          httpErrors(args);
        })
      )
      .errors(function (err, push) {
        // do nothing. this just filters out errors.
      })
      .pipe(parser())
      .map(function(bufferChunk) {
        return bufferChunk.toString();
      })
      .each(function(data) {
        console.log('data');
        console.log(data);
      });
      //*/






      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          var enrichXref = function(xref, enrichXrefCallback) {
            getBridgedbDatabaseMetadataForDbName(xref.dbName, function(err, bridgedbDatabaseMetadataRow) {
              if (!!bridgedbDatabaseMetadataRow.type) {
                xref.type = bridgedbDatabaseMetadataRow.type;
              }
              if (!!bridgedbDatabaseMetadataRow.namespace) {
                xref.namespace = bridgedbDatabaseMetadataRow.namespace;
                xref.id = 'http://identifiers.org/' + bridgedbDatabaseMetadataRow.namespace + '/' + xref.dbId;
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