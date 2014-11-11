var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var internalContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

var MetadataService = function(instance) {
  'use strict';

  function init() {
    var source = instance.config.datasourcesUrl;

    return highland(request({
      url: source,
      withCredentials: false
    })
    .pipe(csv(csvOptions)))
    .map(function(array) {
      var db = [array[0]];
      db = db.concat([array[10]]);
      return {
        '@context':internalContext,
        db:db,
        bridgedbSystemCode:array[1],
        website:array[2],
        linkoutPattern:array[3],
        exampleIdentifier:array[4],
        bridgedbType:array[5],
        organism:array[6],
        priority:parseFloat(array[7]),
        miriamRootUrn:array[8],
        identifierPattern:array[9],
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
        metadataRow.id = 'http://identifiers.org/' + metadataRow.preferredPrefix;
        metadataRow['owl:sameAs'] = metadataRow['owl:sameAs'] || [];
        metadataRow['owl:sameAs'].push(metadataRow.miriamRootUrn);
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

      metadataRow.alternatePrefix = [
        metadataRow.bridgedbSystemCode
      ];

      return metadataRow;
    })
    .collect();
  }

  var get = function() {
    return Utilities.runOnce('metadata', init);
  };

  var getByParameterSet = function (providedParameterSetName, providedParameterSet, databases) {
    providedParameterSet = _.isArray(providedParameterSet) ? providedParameterSet : [providedParameterSet];

    var matchingDatabase = databases.filter(function(database) {
      return !_.isEmpty(_.intersection(database[providedParameterSetName], providedParameterSet));
    });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!matchingDatabase) {
      var providedParameterSetNormalized = Utilities.normalizeTextArray(providedParameterSet);
      matchingDatabase = databases.filter(function(database) {
        var databaseParameterSetNormalized = Utilities.normalizeTextArray(databases[providedParameterSetName]);
        return !_.isEmpty(_.intersection(databaseParameterSetNormalized, providedParameterSetNormalized));
      });
    }

    // if second attempt fails, we give up.
    if (!matchingDatabase || matchingDatabase.length === 0) {
      return new Error('Could not find a BridgeDB-supported database for any of the provided ' + providedParameterSetName + ' parameters "' + JSON.stringify(providedParameterSet) + '"');
    }

    return matchingDatabase[0];
  };

  /*
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

    // if second attempt fails, we give up.
    if (!metadataRow) {
      return new Error('No BridgeDB database metadata returned for db "' + db + '"');
    }

    return metadataRow;
  };
  //*/

  var getByDb = function(dbs) {
    var getByDbWhenMetadataLoads = highland.curry(getByParameterSet, 'db', dbs);

    return get().map(function(result) {
      return result;
    })
    .map(getByDbWhenMetadataLoads);
  };

  function getByAlternatePrefix(alternatePrefixes) {
    var getByAlternatePrefixWhenMetadataLoads = highland.curry(getByParameterSet, 'alternatePrefix', alternatePrefixes);
    return get().map(function(result) {
      return result;
    })
    .map(getByAlternatePrefixWhenMetadataLoads);
  }

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
    return get().map(getByPreferredPrefixWhenMetadataLoads);
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
      'preferredPrefix': getByPreferredPrefix,
      'alternatePrefix': getByAlternatePrefix,
      'db': getByDb,
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

module.exports = MetadataService;
