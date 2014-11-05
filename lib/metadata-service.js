var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var Metadata = function(instance) {
  'use strict';

  function init() {
    var source = instance.config.datasourcesUrl;

    return highland(request({
      url: source,
      withCredentials: false
    })
    .pipe(tsv))
    .map(function(array) {
      return {
        db:array[0],
        bridgedbSystemCode:array[1],
        website:array[2],
        linkoutPattern:array[3],
        exampleIdentifier:array[4],
        bridgedbType:array[5],
        organism:array[6],
        priority:parseFloat(array[7]),
        miriamRootUrn:array[8],
        identifierPattern:array[9],
        standardName:array[10]
      };
    })
    .map(function(metadataRow) {

      // remove empty properties

      return _.omit(metadataRow, function(value) {
        return value === '' || _.isNaN(value) || _.isNull(value) || _.isUndefined(value);
      });
    })
    .map(function(metadataRow) {
      if (!!metadataRow.miriamRootUrn && metadataRow.miriamRootUrn.indexOf('urn:miriam:') > -1) {
        metadataRow.preferredPrefix = metadataRow.miriamRootUrn.substring(11, metadataRow.miriamRootUrn.length);
      }
      delete metadataRow.miriamRootUrn;
      return metadataRow;
    })
    .map(function(metadataRow) {
      if (!!metadataRow.bridgedbType) {
        if (metadataRow.bridgedbType === 'gene' || metadataRow.bridgedbType === 'probe' || metadataRow.preferredPrefix === 'go') {
          metadataRow.gpmlType = 'GeneProduct';
          metadataRow.biopaxType = 'DnaReference';
        } else if (metadataRow.bridgedbType === 'rna') {
          metadataRow.gpmlType = 'Rna';
          metadataRow.biopaxType = 'RnaReference';
        } else if (metadataRow.bridgedbType === 'protein') {
          metadataRow.gpmlType = 'Protein';
          metadataRow.biopaxType = 'ProteinReference';
        } else if (metadataRow.bridgedbType === 'metabolite') {
          metadataRow.gpmlType = 'Metabolite';
          metadataRow.biopaxType = 'SmallMoleculeReference';
        } else if (metadataRow.bridgedbType === 'pathway') {
          metadataRow.gpmlType = 'Pathway';
          metadataRow.biopaxType = 'Pathway';
        }
      }

      return metadataRow;
    })
    .collect();
  }

  var get = function() {
    return Utilities.runOnce('metadata', init);
  };

  var getByDbWithAllArguments = function(db, metadata) {
    var metadataRow = _.find(metadata, function(row) {
      return row.db === db;
    });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!metadataRow) {
      metadataRow = _.find(metadata, function(row) {
        return Utilities.normalizeText(row.db) === Utilities.normalizeText(db);
      });
    }

    // no third attempt. if second attempt failed, we give up.
    if (!metadataRow) {
      return new Error('No BridgeDB database metadata returned for db "' + db + '"');
    }

    return metadataRow;
  };

  var getByDb = function(db) {
    var getByDbWhenMetadataLoads = highland.curry(getByDbWithAllArguments, db);

    return get().map(function(result) {
      return result;
    })
    .map(getByDbWhenMetadataLoads);
  };

  var getByPreferredPrefixWithAllArguments = function (preferredPrefix, metadata) {
    var metadataForPreferredPrefixResults = metadata.filter(function(metadataRow) {
      return metadataRow.preferredPrefix === preferredPrefix;
    });

    if (!metadataForPreferredPrefixResults || metadataForPreferredPrefixResults.length === 0) {
      return new Error('Could not find BridgeDB reference matching provided identifiers.org preferredPrefix "' + preferredPrefix + '"');
    }
    return metadataForPreferredPrefixResults[0];
  };

  function getByPreferredPrefix(preferredPrefix) {
    var getByPreferredPrefixWhenMetadataLoads = highland.curry(getByPreferredPrefixWithAllArguments, preferredPrefix);
    return get().map(function(result) {
      return result;
    })
    .map(getByPreferredPrefixWhenMetadataLoads);
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

    return get().map(function(metadataSet) {
      return metadataSet;
    })
    .map(getWhenMetadataAvailable);
  }

  var getByEntityReference = function(entityReference) {
    var keyToFunctionMapping = {
      'db': getByDb,
      'preferredPrefix': getByPreferredPrefix,
      'bridgedbSystemCode': getByBridgedbSystemCode
    };

    return highland([entityReference])
    .map(instance.entityReferenceService.expand)
    .flatMap(function(entityReference) {
      var entityReferenceKeys = _.keys(entityReference);

      return highland.pairs(keyToFunctionMapping)
      .filter(function(pair) {
        return entityReferenceKeys.indexOf(pair[0]) > -1;
      })
      .head()
      .flatMap(function(pair) {
        return pair[1](entityReference[pair[0]]);
      });
    });
  };

  function convertPreferredPrefixToBridgedbSystemCode(preferredPrefix) {
    return getByPreferredPrefix(preferredPrefix).map(function(metadataRow) {
      if (!metadataRow) {
        return new Error('No datasource row available for preferredPrefix "' + preferredPrefix + '"');
      }
      return metadataRow.bridgedbSystemCode;
    });
  }

  // TODO replace this method with convertPreferredPrefixToBridgedbSystemCode()
  // everywhere in the code
  function convertDbToBridgedbSystemCode(db) {
    return getByDb(db).map(function(metadataForDb) {
      if (!metadataForDb) {
        return new Error('No datasource row available for db "' + db + '"');
      }
      var bridgedbSystemCode = metadataForDb.bridgedbSystemCode;
      return bridgedbSystemCode;
    });
  }

  return {
    convertPreferredPrefixToBridgedbSystemCode:convertPreferredPrefixToBridgedbSystemCode,
    get:get,
    getByEntityReference:getByEntityReference,
    getByDb:getByDb,
    getByPreferredPrefix:getByPreferredPrefix,
    getByBridgedbSystemCode:getByBridgedbSystemCode,
    convertDbToBridgedbSystemCode:convertDbToBridgedbSystemCode
  };
};

module.exports = Metadata;
