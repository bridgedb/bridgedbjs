/* @module DatabaseService */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var internalContext = require('./context.json');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

/**
 * Used internally to create a new DatabaseService instance.
 * @class
 * @protected
 * @alias databaseService
 * @memberof bridgedb
 * @param {object} instance
 */
var DatabaseService = function(instance) {
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
    .map(function(database) {

      // remove empty properties

      return _.omit(database, function(value) {
        return value === '' ||
          _.isNaN(value) ||
        _.isNull(value) ||
        _.isUndefined(value);
      });
    })
    .map(function(database) {
      if (!!database.miriamRootUrn &&
          database.miriamRootUrn.indexOf('urn:miriam:') > -1) {

        database.preferredPrefix = database.miriamRootUrn.substring(11,
          database.miriamRootUrn.length);
        database.id = 'http://identifiers.org/' + database.preferredPrefix;
        database['owl:sameAs'] = database['owl:sameAs'] || [];
        database['owl:sameAs'].push(database.miriamRootUrn);
      }
      delete database.miriamRootUrn;
      return database;
    })
    .map(function(database) {
      if (!!database.bridgedbType) {
        if (database.bridgedbType === 'gene' ||
          database.bridgedbType === 'probe' ||
          database.preferredPrefix === 'go') {

          database.gpmlType = 'GeneProduct';
          database.biopaxType = 'DnaReference';
        } else if (database.bridgedbType === 'rna') {
          database.gpmlType = 'Rna';
          database.biopaxType = 'RnaReference';
        } else if (database.bridgedbType === 'protein') {
          database.gpmlType = 'Protein';
          database.biopaxType = 'ProteinReference';
        } else if (database.bridgedbType === 'metabolite') {
          database.gpmlType = 'Metabolite';
          database.biopaxType = 'SmallMoleculeReference';
        } else if (database.bridgedbType === 'pathway') {
          database.gpmlType = 'Pathway';
          database.biopaxType = 'Pathway';
        }
      }

      database.alternatePrefix = [
        database.bridgedbSystemCode
      ];

      return database;
    })
    .collect();
  }

  var get = function() {
    return Utilities.runOnce('databases', init);
  };

  var getByParameterSet = function(providedParameterSetName,
      providedParameterSet,
      databases) {
    providedParameterSet = _.isArray(providedParameterSet) ?
      providedParameterSet : [providedParameterSet];

    var matchingDatabase = databases.filter(function(database) {
      return !_.isEmpty(
        _.intersection(database[providedParameterSetName], providedParameterSet)
      );
    });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!matchingDatabase) {
      var providedParameterSetNormalized =
        Utilities.normalizeTextArray(providedParameterSet);
      matchingDatabase = databases.filter(function(database) {
        var databaseParameterSetNormalized =
        Utilities.normalizeTextArray(databases[providedParameterSetName]);
        return !_.isEmpty(
          _.intersection(databaseParameterSetNormalized,
            providedParameterSetNormalized)
        );
      });
    }

    // if second attempt fails, we give up.
    if (!matchingDatabase || matchingDatabase.length === 0) {
      var message = 'Could not find a BridgeDB-supported database for any' +
        ' of the provided ' + providedParameterSetName + ' parameters "' +
        JSON.stringify(providedParameterSet) + '"';
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
    function(preferredPrefix, databases) {

    var databasesForPreferredPrefixResults =
      databases.filter(function(database) {
      return database.preferredPrefix === preferredPrefix;
    });

    if (!databasesForPreferredPrefixResults ||
        databasesForPreferredPrefixResults.length === 0) {

      var message = 'Could not find BridgeDB reference matching provided' +
        'identifiers.org preferredPrefix "' + preferredPrefix + '"';
      return new Error(message);
    }
    return databasesForPreferredPrefixResults[0];
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
      highland.curry(function(bridgedbSystemCode, databases) {

      var databasesForBridgedbSystemCodeResults =
        databases.filter(function(database) {
        return database.bridgedbSystemCode === bridgedbSystemCode;
      });

      if (!databasesForBridgedbSystemCodeResults ||
        databasesForBridgedbSystemCodeResults.length === 0) {

        var message = 'No BridgeDB databases returned for' +
          ' bridgedbSystemCode "' + bridgedbSystemCode + '"';
        return new Error(message);
      }
      return databasesForBridgedbSystemCodeResults[0];
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
    return getByPreferredPrefix(preferredPrefix).map(function(database) {
      if (!database) {
        var message = 'No datasource row available for preferredPrefix "' +
          preferredPrefix + '"';
        return new Error(message);
      }
      return database.bridgedbSystemCode;
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

module.exports = DatabaseService;
