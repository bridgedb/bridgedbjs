/* @module DatabaseMetadataService */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var internalContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

/**
 * Used internally to create a new DatabaseMetadataService instance.
 * @class
 * @protected
 * @alias databaseMetadataService
 * @memberof bridgedb
 * @param {object} instance
 */
var DatabaseMetadataService = function(instance) {
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
    .map(function(databaseMetadata) {

      // remove empty properties

      return _.omit(databaseMetadata, function(value) {
        return value === '' ||
          _.isNaN(value) ||
        _.isNull(value) ||
        _.isUndefined(value);
      });
    })
    .map(function(databaseMetadata) {
      if (!!databaseMetadata.miriamRootUrn &&
          databaseMetadata.miriamRootUrn.indexOf('urn:miriam:') > -1) {

        databaseMetadata.preferredPrefix =
          databaseMetadata.miriamRootUrn.substring(11,
            databaseMetadata.miriamRootUrn.length);
        databaseMetadata.id =
          'http://identifiers.org/' + databaseMetadata.preferredPrefix;
        databaseMetadata['owl:sameAs'] = databaseMetadata['owl:sameAs'] || [];
        databaseMetadata['owl:sameAs'].push(databaseMetadata.miriamRootUrn);
      }
      delete databaseMetadata.miriamRootUrn;
      return databaseMetadata;
    })
    .map(function(databaseMetadata) {
      if (!!databaseMetadata.bridgedbType) {
        if (databaseMetadata.bridgedbType === 'gene' ||
          databaseMetadata.bridgedbType === 'probe' ||
          databaseMetadata.preferredPrefix === 'go') {

          databaseMetadata.gpmlType = 'GeneProduct';
          databaseMetadata.biopaxType = 'DnaReference';
        } else if (databaseMetadata.bridgedbType === 'rna') {
          databaseMetadata.gpmlType = 'Rna';
          databaseMetadata.biopaxType = 'RnaReference';
        } else if (databaseMetadata.bridgedbType === 'protein') {
          databaseMetadata.gpmlType = 'Protein';
          databaseMetadata.biopaxType = 'ProteinReference';
        } else if (databaseMetadata.bridgedbType === 'metabolite') {
          databaseMetadata.gpmlType = 'Metabolite';
          databaseMetadata.biopaxType = 'SmallMoleculeReference';
        } else if (databaseMetadata.bridgedbType === 'pathway') {
          databaseMetadata.gpmlType = 'Pathway';
          databaseMetadata.biopaxType = 'Pathway';
        }
      }

      databaseMetadata.alternatePrefix = [
        databaseMetadata.bridgedbSystemCode
      ];

      return databaseMetadata;
    })
    .collect();
  }

  var get = function() {
    return Utilities.runOnce('databaseMetadataSet', init);
  };

  var getByParameterSet = function(providedParameterSetName,
      providedParameterSet,
      databaseMetadataSet) {
    providedParameterSet = _.isArray(providedParameterSet) ?
      providedParameterSet : [providedParameterSet];

    var matchingDatabase =
      databaseMetadataSet.filter(function(databaseMetadata) {
      return !_.isEmpty(
        _.intersection(
          databaseMetadata[providedParameterSetName],
          providedParameterSet
        )
      );
    });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!matchingDatabase) {
      var providedParameterSetNormalized =
        Utilities.normalizeTextArray(providedParameterSet);
      matchingDatabase = databaseMetadataSet.filter(function(databaseMetadata) {
        var databaseMetadataParameterSetNormalized =
        Utilities.normalizeTextArray(
          databaseMetadataSet[providedParameterSetName]
        );
        return !_.isEmpty(
          _.intersection(databaseMetadataParameterSetNormalized,
            providedParameterSetNormalized)
        );
      });
    }

    // if second attempt fails, we give up.
    if (!matchingDatabase || matchingDatabase.length === 0) {
      var message = 'Could not find a BridgeDB-supported database metadata' +
        ' for any of the provided ' + providedParameterSetName +
         ' parameters "' + JSON.stringify(providedParameterSet) + '"';
      return new Error(message);
    }

    return matchingDatabase[0];
  };

  var getByName = function(dbs) {
    var getByNameWhenDatabasesLoad =
      highland.curry(getByParameterSet, 'db', dbs);

    return get().map(function(result) {
      return result;
    })
    .map(getByNameWhenDatabasesLoad);
  };

  function getByAlternatePrefix(alternatePrefixes) {
    var getByAlternatePrefixWhenDatabasesLoad =
      highland.curry(getByParameterSet, 'alternatePrefix', alternatePrefixes);
    return get().map(function(result) {
      return result;
    })
    .map(getByAlternatePrefixWhenDatabasesLoad);
  }

  var getByPreferredPrefixWithAllArguments =
    function(preferredPrefix, databaseMetadataSet) {

    var databaseMetadataSetForPreferredPrefixResults =
      databaseMetadataSet.filter(function(databaseMetadata) {
      return databaseMetadata.preferredPrefix === preferredPrefix;
    });

    if (!databaseMetadataSetForPreferredPrefixResults ||
        databaseMetadataSetForPreferredPrefixResults.length === 0) {

      var message = 'Could not find BridgeDB reference matching provided' +
        'identifiers.org preferredPrefix "' + preferredPrefix + '"';
      return new Error(message);
    }
    return databaseMetadataSetForPreferredPrefixResults[0];
  };

  function getByPreferredPrefix(preferredPrefix) {
    var getByPreferredPrefixWhenDatabasesLoad =
      highland.curry(getByPreferredPrefixWithAllArguments, preferredPrefix);

    return get().map(function(result) {
      return result;
    })
    .map(getByPreferredPrefixWhenDatabasesLoad);
  }

  function getByBridgedbSystemCode(bridgedbSystemCode) {
    var getByBridgedbSystemCodeWithAllArguments =
      highland.curry(function(bridgedbSystemCode, databaseMetadataSet) {

      var databaseMetadataSetForBridgedbSystemCodeResults =
        databaseMetadataSet.filter(function(databaseMetadata) {
        return databaseMetadata.bridgedbSystemCode === bridgedbSystemCode;
      });

      if (!databaseMetadataSetForBridgedbSystemCodeResults ||
        databaseMetadataSetForBridgedbSystemCodeResults.length === 0) {

        var message = 'No BridgeDB database metadata returned for' +
          ' bridgedbSystemCode "' + bridgedbSystemCode + '"';
        return new Error(message);
      }
      return databaseMetadataSetForBridgedbSystemCodeResults[0];
    });

    var getWhenDatabasesLoad =
      getByBridgedbSystemCodeWithAllArguments(bridgedbSystemCode);

    return get().map(getWhenDatabasesLoad);
  }

  var getByEntityReference = function(entityReference) {
    var keyToFunctionMapping = {
      'preferredPrefix': getByPreferredPrefix,
      'alternatePrefix': getByAlternatePrefix,
      'db': getByName,
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
    return getByPreferredPrefix(preferredPrefix)
      .map(function(databaseMetadata) {
      if (!databaseMetadata) {
        var message = 'No datasource row available for preferredPrefix "' +
          preferredPrefix + '"';
        return new Error(message);
      }
      return databaseMetadata.bridgedbSystemCode;
    });
  }

  return {
    convertPreferredPrefixToBridgedbSystemCode:
      convertPreferredPrefixToBridgedbSystemCode,
    get:get,
    getByBridgedbSystemCode:getByBridgedbSystemCode,
    getByEntityReference:getByEntityReference,
    getByName:getByName,
    getByPreferredPrefix:getByPreferredPrefix
  };
};

module.exports = DatabaseMetadataService;