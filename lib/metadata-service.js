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

var metadataLoaded = new EventEmitter();
var metadataLoadedStream = highland('load', metadataLoaded);

var Metadata = function(instance) {

  var that = this;
  var metadata = this.metadata;

  var providedDbId, providedDbName;

  function init(global) {
      metadata = [];

      var source = instance.config.datasourcesUrl;

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

      return highland('end', tsvStream).map(function() {
        tsvParser.end();
        tsvStream.end();
        global.metadata = metadata;
        /*
        console.log('metadata');
        console.log(!!metadata);
        //*/
        metadataLoaded.emit('load', metadata);
        return metadata;
      }).fork();
  }

  var get = function() {
    return Utilities.runOnce('metadata', metadataLoadedStream, init);
  };

  var getByDbNameWithAllArguments = function(dbName, metadataStream) {
    var metadataForDbNameResults = metadataStream.filter(function(row) { return row.dbName === dbName; });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!metadataForDbNameResults || metadataForDbNameResults.length === 0) {
      metadataForDbNameResults = metadata.filter(function(row) {
        return normalizeText(row.dbName) === normalizeText(dbName);
      });

      // no third attempt. if nothing here, give up.
      if (!metadataForDbNameResults || metadataForDbNameResults.length === 0) {
        return new Error('No BridgeDB database metadata returned for dbName "' + dbName + '"');
      }
    }

    return metadataForDbNameResults[0];
  };

  var getByDbName = function(dbName) {
    var getByDbNameWhenMetadataLoads = highland.curry(getByDbNameWithAllArguments, dbName);

    return get().map(function(result) {
      return result;
    })
    .map(getByDbNameWhenMetadataLoads);
  };

  var getByIdentifiersNamespaceWithAllArguments = function (identifiersNamespace, metadata) {
    var metadataForIdentifiersNamespaceResults = metadata.filter(function(metadataRow) {
      return metadataRow.namespace === identifiersNamespace;
    });

    if (!metadataForIdentifiersNamespaceResults || metadataForIdentifiersNamespaceResults.length === 0) {
      return new Error('Could not find BridgeDB reference matching provided identifiers.org namespace "' + identifiersNamespace + '"');
    }
    return metadataForIdentifiersNamespaceResults[0];
  };

  function getByIdentifiersNamespace(identifiersNamespace) {
    var getByIdentifiersNamespaceWhenMetadataLoads = highland.curry(getByIdentifiersNamespaceWithAllArguments, identifiersNamespace);
    return get().map(function(result) {
      return result;
    })
    .map(getByIdentifiersNamespaceWhenMetadataLoads);
  }

  function getBySystemCode(systemCode, callback) {
    var getBySystemCodeWithAllArguments = highland.curry(function (systemCode, callback, metadata) {
      var metadataForSystemCodeResults = metadata.filter(function(metadataRow) {
        return metadataRow.systemCode === systemCode;
      });

      if (!metadataForSystemCodeResults || metadataForSystemCodeResults.length === 0) {
        return callback('No BridgeDB database metadata returned for systemCode "' + systemCode + '"');
      }
      return callback(null, metadataForSystemCodeResults[0]);
    });

    //var getWhenMetadataAvailable = getBySystemCodeWithAllArguments(systemCode)(callback);

    highland.compose(getBySystemCodeWithAllArguments(systemCode)(callback), get());
  }

  // TODO convert this to use identifiersNamespace
  function getSystemCodeByDbName(dbName) {
    return getByDbName(dbName).map(function(metadataForDbName) {
      if (!metadataForDbName) {
        return new Error('No datasource row available for dbName "' + dbName + '"');
      }
      var systemCode = metadataForDbName.systemCode;
      return systemCode;
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
    getBySystemCode:getBySystemCode,
    getSystemCodeByDbName:getSystemCodeByDbName
  };
};

module.exports = Metadata;
