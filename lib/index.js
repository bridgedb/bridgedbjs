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
var Xref = require('./xref.js');

var BridgeDb = (function(){

  var metadata;
  if (!metadata) {
    MetadataService.get(function(err, returnedMetadata) {
      metadata = returnedMetadata;
    });
  }

  var providedDbId, providedDbName;

  function getEntityReferenceIdentifiersIri(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
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
    Xref.get(args, function(err, entityReferenceXrefs) {
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

  var getXrefs = Xref.get;
  var getXrefsNestedForDisplay = Xref.getNestedForDisplay;

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

  return {
    map:map,
    getXrefs:getXrefs,
    getXrefsNestedForDisplay:getXrefsNestedForDisplay
  };
}());

module.exports = BridgeDb;
