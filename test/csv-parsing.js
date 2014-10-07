var d3 = require('d3')
  , _ = require('lodash')
  , tsvParser = require('csv-parser')({
      separator: '\t'
    })
  , async = require('async')
  , highland = require('highland')
  , httpErrors = require('../lib/http-errors.js')
  , request = require('request')
  , jsonLdContext = require('../lib/context.json')
  , config = require('../lib/config.js')
  , http = require('http')
  , bridgedbDatabaseMetadata = []
  ;

  console.log('bridgedbDatabaseMetadata1');
  console.log(bridgedbDatabaseMetadata);
  var options = {
    host: 'pointer.ucsf.edu',
    path: '/d3/r/data-sources/bridgedb-datasources.php',
    port: '80',
    withCredentials: false//,
    //headers: {'custom': 'Custom Header'}
  };

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
    highland(request({
      url: source
    }, function(error, response, body) {
      var args = {};
      response = response;
      args.error = error;
      args.body = body;
      args.source = source;
      console.log('body');
      console.log(!!body);
      httpErrors(args);
      //tsvStream.end();
      //tsvParser.end();
    }))
  )
  .errors(function (err, push) {
    // do nothing. this just filters out errors.
  })
  .pipe(tsvParser);

  var dataStream = highland('data', tsvStream)
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

    return bridgedbDatabaseMetadataRow;
  })
  //.collect()
  .each(function(bridgedbDatabaseMetadataRow) {
    bridgedbDatabaseMetadata.push(bridgedbDatabaseMetadataRow);
  });

  highland('end', tsvStream)
  .each(function() {
    console.log('tsvStream ended');
    console.log('bridgedbDatabaseMetadata2');
    console.log(bridgedbDatabaseMetadata);
  });
