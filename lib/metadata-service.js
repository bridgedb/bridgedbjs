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

  var providedIdentifier, providedDb;

  function init(global) {
    metadata = [];

    var source = instance.config.datasourcesUrl;

    var headers = [
      'db',
      'bridgedbSystemCode',
      'website',
      'linkoutPattern',
      'exampleIdentifier',
      'type',
      'organism',
      'priority',
      'miriamRootUrn',
      'idRegexPattern',
      'standardName'
    ]
    .join('\t') + '\n';

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
    });
  }

  var get = function() {
    return Utilities.runOnce('metadata', metadataLoadedStream, init);
  };

  var getByDbWithAllArguments = function(db, metadataStream) {
    var metadataForDbResults = metadataStream.filter(function(row) { return row.db === db; });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!metadataForDbResults || metadataForDbResults.length === 0) {
      metadataForDbResults = metadata.filter(function(row) {
        return Utilities.normalizeText(row.db) === Utilities.normalizeText(db);
      });

      // no third attempt. if nothing here, give up.
      if (!metadataForDbResults || metadataForDbResults.length === 0) {
        return new Error('No BridgeDB database metadata returned for db "' + db + '"');
      }
    }

    return metadataForDbResults[0];
  };

  var getByDb = function(db) {
    var getByDbWhenMetadataLoads = highland.curry(getByDbWithAllArguments, db);

    return get().map(function(result) {
      return result;
    })
    .map(getByDbWhenMetadataLoads);
  };

  var getByIdentifiersDotOrgNamespaceWithAllArguments = function (namespace, metadata) {
    var metadataForIdentifiersNamespaceResults = metadata.filter(function(metadataRow) {
      return metadataRow.namespace === namespace;
    });

    if (!metadataForIdentifiersNamespaceResults || metadataForIdentifiersNamespaceResults.length === 0) {
      return new Error('Could not find BridgeDB reference matching provided identifiers.org namespace "' + namespace + '"');
    }
    return metadataForIdentifiersNamespaceResults[0];
  };

  function getByIdentifiersDotOrgNamespace(namespace) {
    var getByIdentifiersDotOrgNamespaceWhenMetadataLoads = highland.curry(getByIdentifiersDotOrgNamespaceWithAllArguments, namespace);
    return get().map(function(result) {
      return result;
    })
    .map(getByIdentifiersDotOrgNamespaceWhenMetadataLoads);
  }

  function getByBridgedbSystemCode(bridgedbSystemCode) {
    var getByBridgedbSystemCodeWithAllArguments = highland.curry(function (bridgedbSystemCode, metadata) {
      var metadataForBridgedbSystemCodeResults = metadata.filter(function(metadataRow) {
        return metadataRow.bridgedbSystemCode === bridgedbSystemCode;
      });

      if (!metadataForBridgedbSystemCodeResults || metadataForBridgedbSystemCodeResults.length === 0) {
        return new Error('No BridgeDB database metadata returned for bridgedbSystemCode "' + bridgedbSystemCode + '"');
      }
      return metadataForBridgedbSystemCodeResults[0];
    });

    var getWhenMetadataAvailable = getByBridgedbSystemCodeWithAllArguments(bridgedbSystemCode);

    //return highland.compose(getByBridgedbSystemCodeWithAllArguments(bridgedbSystemCode)(callback), get());
    return get().map(function(metadataSet) {
      return metadataSet;
    })
    .map(getWhenMetadataAvailable);
  }

  // TODO convert this to use identifiers.org namespace
  function getBridgedbSystemCodeByDb(db) {
    return getByDb(db).map(function(metadataForDb) {
      if (!metadataForDb) {
        return new Error('No datasource row available for db "' + db + '"');
      }
      var bridgedbSystemCode = metadataForDb.bridgedbSystemCode;
      return bridgedbSystemCode;
    });
  }

  return {
    get:get,
    getByDb:getByDb,
    getByIdentifiersDotOrgNamespace:getByIdentifiersDotOrgNamespace,
    getByBridgedbSystemCode:getByBridgedbSystemCode,
    getBridgedbSystemCodeByDb:getBridgedbSystemCodeByDb
  };
};

module.exports = Metadata;
