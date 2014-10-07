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
var request = require('request');

var Metadata = (function(){

  var providedDbId, providedDbName;

  function get(callbackOutside) {
    var that = this;
    if (!!this.bridgedbDatabaseMetadata) {
      return callbackOutside(null, this.bridgedbDatabaseMetadata);
    } 

    var bridgedbDatabaseMetadata = [];
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
    .map(function(bridgedbDatabaseMetadataRow) {

      // remove empty properties

      return _.omit(bridgedbDatabaseMetadataRow, function(value) {
        return value === '';
      });
    })
    .map(function(bridgedbDatabaseMetadataRow) {
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
      }
      return bridgedbDatabaseMetadataRow;
    })
    .map(function(bridgedbDatabaseMetadataRow) {
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

      bridgedbDatabaseMetadata.push(bridgedbDatabaseMetadataRow);
      return bridgedbDatabaseMetadataRow;
    })
    .last()
    // TODO why are we not using collect?
    //.collect()
    .each(function(bridgedbDatabaseMetadataRow) {
    });

    highland('end', tsvStream).each(function() {
      tsvParser.end();
      tsvStream.end();
      that.bridgedbDatabaseMetadata = bridgedbDatabaseMetadata;
      return callbackOutside(null, bridgedbDatabaseMetadata);
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


  return {
    get:get
  };
}());

module.exports = Metadata;
