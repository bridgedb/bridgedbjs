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

var Metadata = (function(){

  var that = this;
  var metadata = this.metadata;

  var metadataLoaded = new EventEmitter();
  var metadataLoadedStream = highland('load', metadataLoaded);

  var providedDbId, providedDbName;

  function get(callbackOutside) {
    if (!!this.metadata) {
      return callbackOutside(null, this.metadata);
    } 

    metadata = [];
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
      metadataLoaded.emit('load', metadata);
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

  function getByDbName(dbName, callback) {
    var get = highland.curry(function (dbName, callback, metadata) {
      var metadataForDbNameResults = metadata.filter(function(row) { return row.dbName === dbName; });
      console.log('first metadataForDbNameResults[0]');
      console.log(metadataForDbNameResults[0]);

      // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
      if (!metadataForDbNameResults || metadataForDbNameResults.length === 0) {
        metadataForDbNameResults = metadata.filter(function(row) {
          return normalizeText(row.dbName) === normalizeText(dbName);
        });

        // no third attempt. if nothing here, give up.
        if (!metadataForDbNameResults || metadataForDbNameResults.length === 0) {
          return callback('No BridgeDB database metadata returned for dbName "' + dbName + '"');
        }
      }

      return callback(null, metadataForDbNameResults[0]);
    });

    var getWhenMetadataAvailable = get(dbName)(callback);

    if (!_.isEmpty(metadata)) {
      return getWhenMetadataAvailable(metadata);
    }

    metadataLoadedStream.fork()
    .each(function(metadata) {
      return getWhenMetadataAvailable(metadata);
    });
  }

  function getByIdentifiersNamespace(identifiersNamespace, callback) {
    var get = highland.curry(function (identifiersNamespace, callback, metadata) {
      var metadataForIdentifiersNamespaceResults = metadata.filter(function(metadataRow) {
        return metadataRow.namespace === identifiersNamespace;
      });

      if (!metadataForIdentifiersNamespaceResults || metadataForIdentifiersNamespaceResults.length === 0) {
        return callback('Could not find BridgeDB reference matching provided identifiers.org namespace "' + identifiersNamespace + '"');
      }
      return callback(null, metadataForIdentifiersNamespaceResults[0]);
    });

    var getWhenMetadataAvailable = get(identifiersNamespace)(callback);

    if (!_.isEmpty(metadata)) {
      console.log('metadata');
      console.log(metadata);
      return getWhenMetadataAvailable(metadata);
    }

    metadataLoadedStream.fork()
    .each(function(metadata) {
      return getWhenMetadataAvailable(metadata);
    });
  }

  function getBySystemCode(systemCode, callback) {
    var get = highland.curry(function (systemCode, callback, metadata) {
      var metadataForSystemCodeResults = metadata.filter(function(metadataRow) {
        return metadataRow.systemCode === systemCode;
      });

      if (!metadataForSystemCodeResults || metadataForSystemCodeResults.length === 0) {
        return callback('No BridgeDB database metadata returned for systemCode "' + systemCode + '"');
      }
      return callback(null, metadataForSystemCodeResults[0]);
    });

    var getWhenMetadataAvailable = get(systemCode)(callback);

    if (!_.isEmpty(metadata)) {
      console.log('metadata');
      console.log(metadata);
      return getWhenMetadataAvailable(metadata);
    }

    metadataLoadedStream.fork()
    .each(function(metadata) {
      return getWhenMetadataAvailable(metadata);
    });
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

  return {
    get:get,
    getByDbName:getByDbName,
    getByIdentifiersNamespace:getByIdentifiersNamespace,
    getBySystemCode:getBySystemCode
  };
}());

module.exports = Metadata;
