/* @module DataSource */

var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var internalContext = require('./context.json');
var JsonldMatcher = require('./jsonld-matcher.js');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utils = require('./utils.js');

/**
 * Used internally to create a new DataSource instance. See related
 * {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html|DataSource}
 * from BridgeDb-Java.
 * @class
 * @alias dataSource
 * @memberof bridgeDb
 * @param {object} instance
 */
var DataSource = function(instance) {
  'use strict';

  /**
   * Get all biological data sources supported by BridgeDb, with all
   * available metadata, largely as specified in
   * {@link https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt|datasources.txt}.
   *
   * @return {Stream<array>} dataSourceStream
   * @return {object[]} dataSourceStream.dataSource
   * @return {string[]} dataSourceStream.dataSource.name Data set name. See
   *                                                   {@link http://schema.org/name|schema:name}.
   * @return {string} dataSourceStream.dataSource.mainUrl See
   *                                                      {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getMainUrl()|Java documentation}.
   * @return {string} dataSourceStream.dataSource.urlPattern See
   *                                                         {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#urlPattern(java.lang.String)|Java documentation}.
   * @return {string} dataSourceStream.dataSource.exampleIdentifier See
   *                                                                {@link http://identifiers.org/idot/exampleIdentifier|idot:exampleIdentifier}.
   * @return {string} dataSourceStream.dataSource.organism If the data source is for a single organism. See
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#organism|biopax:organism}.
   * @return {string} dataSourceStream.dataSource.bridgeDbType Biological type, as used at BridgeDb. See
   *                                                           {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#type(java.lang.String)|Java documentation}.
   * @return {string} dataSourceStream.dataSource['@type'] Biological type, as used in GPML at WikiPathways and in PathVisio-Java.
   *                                                       See {@link http://vocabularies.wikipathways.org/gpml#Type|gpml:Type}.
   *                                                       And as used in Biopax. See the domain for
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#entityReference|biopax:entityReference}.
   * @return {boolean} dataSourceStream.dataSource.isPrimary See Java documentation for
   *                                                         {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#isPrimary()|"isPrimary"} and for
   *                                                         {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#primary(boolean)|"primary" method}.
   * @return {string} dataSourceStream.dataSource.identifierPattern Regular expression for the identifiers from this data source.
   *                                                                See {@link http://identifiers.org/idot/identifierPattern|idot:identifierPattern}.
   * @return {string} dataSourceStream.dataSource.preferredPrefix Abbreviation as used by identifiers.org to identify a data source.
   *                                                              See {@link http://identifiers.org/idot/preferredPrefix|idot:preferredPrefix}.
   * @return {string[]} dataSourceStream.dataSource.alternatePrefix Abbreviation as used elsewhere to identify a data source, such
   *                                                                as at BridgeDb (bridgeDbSystemCode located both here and on its own).
   *                                                                See {@link http://identifiers.org/idot/alternatePrefix|idot:alternatePrefix}.
   * @return {string} dataSourceStream.dataSource.bridgeDbSystemCode See
   *                                                                 {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getSystemCode()|Java documentation}.
   * @return {string} dataSourceStream.dataSource['@id'] Preferred {@link http://www.w3.org/TR/json-ld/#iris|IRI}
   *                                                     (usually a persistent URL) for identifying a data source.
   * @return {string[]} dataSourceStream.dataSource[owl:sameAs] Alternate IRI for identifying a data source.
   *                                                            See {@link http://www.w3.org/TR/owl-ref/#sameAs-def|owl:sameAs}.
   */
  var getAll = function() {
    function init() {
      var source = instance.config.dataSourcesUrl;
      return highland(
        request({
          url: source,
          withCredentials: false
        })
        .pipe(csv(csvOptions))
      )
      .map(function(array) {
        return {
          '@context':internalContext,
          name:_([array[0], array[10]])
              .uniq()
              .compact()
              .value(),
          bridgeDbSystemCode:array[1],
          mainUrl:array[2],
          urlPattern:array[3],
          exampleIdentifier:array[4],
          bridgeDbType:array[5],
          organism:array[6],
          isPrimary:(function() {
            var unparsedValue = array[7];
            return unparsedValue === '1';
          })(),
          miriamRootUrn:array[8],
          identifierPattern:(function() {
            var identifierPattern = array[9];
            if (!!identifierPattern) {
              return new RegExp(identifierPattern);
            }
          })()
        };
      })
      .map(function(dataSource) {

        // remove empty properties

        return _.omit(dataSource, function(value) {
          return value === '' ||
            _.isNaN(value) ||
          _.isNull(value) ||
          _.isUndefined(value);
        });
      })
      .map(function(dataSource) {
        if (!!dataSource.miriamRootUrn &&
            dataSource.miriamRootUrn.indexOf('urn:miriam:') > -1) {

          dataSource.preferredPrefix =
            dataSource.miriamRootUrn.substring(11,
              dataSource.miriamRootUrn.length);
          dataSource['@id'] =
            'http://identifiers.org/' + dataSource.preferredPrefix;
          dataSource['owl:sameAs'] = dataSource['owl:sameAs'] || [];
          dataSource['owl:sameAs'].push(dataSource.miriamRootUrn);
        }
        delete dataSource.miriamRootUrn;
        return dataSource;
      })
      .map(function(dataSource) {
        if (!!dataSource.bridgeDbType) {
          dataSource['@type'] = [];
          if (dataSource.bridgeDbType === 'gene' ||
            dataSource.bridgeDbType === 'probe' ||
            dataSource.preferredPrefix === 'go') {

            dataSource['@type'].push('gpml:GeneProduct');
            dataSource['@type'].push('biopax:DnaReference');
          } else if (dataSource.bridgeDbType === 'rna') {
            dataSource['@type'].push('gpml:Rna');
            dataSource['@type'].push('biopax:RnaReference');
          } else if (dataSource.bridgeDbType === 'protein') {
            dataSource['@type'].push('gpml:Protein');
            dataSource['@type'].push('biopax:ProteinReference');
          } else if (dataSource.bridgeDbType === 'metabolite') {
            dataSource['@type'].push('gpml:Metabolite');
            dataSource['@type'].push('biopax:SmallMoleculeReference');
          } else if (dataSource.bridgeDbType === 'pathway') {
            dataSource['@type'].push('gpml:Pathway');
            dataSource['@type'].push('biopax:Pathway');
          }
        }

        dataSource.alternatePrefix = [
          dataSource.bridgeDbSystemCode
        ];

        return dataSource;
      });
    }

    return Utils._runOnce('dataSource', init);
  };

  var getAllOld = function() {
    function init() {
      var source = instance.config.dataSourcesUrl;
      return highland(
        request({
          url: source,
          withCredentials: false
        })
        .pipe(csv(csvOptions))
      )
      .map(function(array) {
        var data = {
          '@context':internalContext,
          name:_([array[0], array[10]])
              .uniq()
              .compact()
              .value(),
          bridgeDbSystemCode:array[1],
          mainUrl:array[2],
          urlPattern:array[3],
          exampleIdentifier:array[4],
          bridgeDbType:array[5],
          organism:array[6],
          isPrimary:(function() {
            var unparsedValue = array[7];
            return unparsedValue === '1';
          })(),
          miriamRootUrn:array[8]
        };

        var identifierPattern = array[9];
        if (!!identifierPattern) {
          data.identifierPattern = new RegExp(identifierPattern);
        }

        return data;
      })
      .map(function(dataSource) {

        // remove empty properties

        return _.omit(dataSource, function(value) {
          return value === '' ||
            _.isNaN(value) ||
          _.isNull(value) ||
          _.isUndefined(value);
        });
      })
      .map(function(dataSource) {
        if (!!dataSource.miriamRootUrn &&
            dataSource.miriamRootUrn.indexOf('urn:miriam:') > -1) {

          dataSource.preferredPrefix =
            dataSource.miriamRootUrn.substring(11,
              dataSource.miriamRootUrn.length);
          dataSource['@id'] =
            'http://identifiers.org/' + dataSource.preferredPrefix;
          dataSource['owl:sameAs'] = dataSource['owl:sameAs'] || [];
          dataSource['owl:sameAs'].push(dataSource.miriamRootUrn);
        }
        delete dataSource.miriamRootUrn;
        return dataSource;
      })
      .map(function(dataSource) {
        if (!!dataSource.bridgeDbType) {
          dataSource['@type'] = [];
          if (dataSource.bridgeDbType === 'gene' ||
            dataSource.bridgeDbType === 'probe' ||
            dataSource.preferredPrefix === 'go') {

            dataSource['@type'].push('gpml:GeneProduct');
            dataSource['@type'].push('biopax:DnaReference');
          } else if (dataSource.bridgeDbType === 'rna') {
            dataSource['@type'].push('gpml:Rna');
            dataSource['@type'].push('biopax:RnaReference');
          } else if (dataSource.bridgeDbType === 'protein') {
            dataSource['@type'].push('gpml:Protein');
            dataSource['@type'].push('biopax:ProteinReference');
          } else if (dataSource.bridgeDbType === 'metabolite') {
            dataSource['@type'].push('gpml:Metabolite');
            dataSource['@type'].push('biopax:SmallMoleculeReference');
          } else if (dataSource.bridgeDbType === 'pathway') {
            dataSource['@type'].push('gpml:Pathway');
            dataSource['@type'].push('biopax:Pathway');
          }
        }

        dataSource.alternatePrefix = [
          dataSource.bridgeDbSystemCode
        ];

        return dataSource;
      })
      .collect();
    }

    return Utils._runOnce('dataSource', init);
  };

  /**
   * Get the first data source that matches at least one of the provided argument(s).
   *
   * @param {object} args At least one of the following properties must be provided.
   * @param {string} [args['@id']]
   * @param {string} [args.preferredPrefix]
   * @param {string} [args.alternatePrefix]
   * @param {string} [args.name]
   * @param {string} [args.identifier] The identifier of the entity reference. This property
   *                                   will only be used if no other properties return results,
   *                                   because many different data sources have overlapping
   *                                   identifierPatterns.
   * @return {Stream<object>} dataSourcesStream
   */
  function getOne(args) {
    return find(args).head();
  }

  /**
   * Find the data sources that match at least one of the provided argument(s).
   *
   * @param {object} args At least one of the following properties must be provided.
   * @param {string} [args['@id']]
   * @param {string} [args.preferredPrefix]
   * @param {string} [args.alternatePrefix]
   * @param {string} [args.name]
   * @param {string} [args.identifier] The identifier of the entity reference. This property
   *                                   will only be used if no other properties return results,
   *                                   because many different data sources have overlapping
   *                                   identifierPatterns.
   * @return {Stream<object>} dataSourcesStream
   */
  function find(args) {
    // preferred keys for identifying a data set
    var keysThatIdentifyDataSets = [
      '@id',
      'preferredPrefix',
      'alternatePrefix',
      'name'
    ];

    var alternateFilters =  [];

    if (!!args.exampleIdentifier) {
      alternateFilters.push(
        highland.curry(function(exampleIdentifier, referenceDataSet) {
          return !!exampleIdentifier &&
            !!referenceDataSet.identifierPattern &&
            referenceDataSet.isPrimary &&
            referenceDataSet.identifierPattern.test(exampleIdentifier);
        }, args.exampleIdentifier)
      );
    }

    return getAll().collect()
    .flatMap(function(dataSources) {
      return JsonldMatcher._find(
        args,
        highland(dataSources),
        'dataSourcesFormattedForComparison',
        keysThatIdentifyDataSets,
        alternateFilters
      );
    });
  }

  /*
  var getByParameterSet = function(providedParameterSetName,
      providedParameterSet,
      dataSources) {
    providedParameterSet = _.isArray(providedParameterSet) ?
      providedParameterSet : [providedParameterSet];

    var matchingDatabase =
      dataSources.filter(function(dataSource) {
        return !_.isEmpty(
          _.intersection(
            dataSource[providedParameterSetName],
            providedParameterSet
          )
        );
      });

    // second attempt. if first attempt failed, we get a little looser about the match here on the second attempt.
    if (!matchingDatabase) {
      var providedParameterSetNormalized =
        Utils._normalizeTextArray(providedParameterSet);
      matchingDatabase = dataSources.filter(function(dataSource) {
        var dataSourceParameterSetNormalized =
        Utils._normalizeTextArray(
          dataSources[providedParameterSetName]
        );
        return !_.isEmpty(
          _.intersection(dataSourceParameterSetNormalized,
            providedParameterSetNormalized)
        );
      });
    }

    // if second attempt fails, we give up.
    if (!matchingDatabase || matchingDatabase.length === 0) {
      var message = 'Could not find a BridgeDb-supported data source' +
        ' for any of the provided ' + providedParameterSetName +
         ' parameters "' + JSON.stringify(providedParameterSet) + '"';
      return new Error(message);
    }

    return matchingDatabase[0];
  };

  var getByName = function(dbs) {
    var getByNameWhenDatabasesLoad =
      highland.curry(getByParameterSet, 'db', dbs);

    return getAllOld().map(function(result) {
      return result;
    })
    .map(getByNameWhenDatabasesLoad);
  };

  function getByAlternatePrefix(alternatePrefixes) {
    var getByAlternatePrefixWhenDatabasesLoad =
      highland.curry(getByParameterSet, 'alternatePrefix', alternatePrefixes);
    return getAllOld().map(function(result) {
      return result;
    })
    .map(getByAlternatePrefixWhenDatabasesLoad);
  }

  var getByPreferredPrefixWithAllArguments =
    function(preferredPrefix, dataSources) {

    var dataSourcesForPreferredPrefixResults =
      dataSources.filter(function(dataSource) {
      return dataSource.preferredPrefix === preferredPrefix;
    });

    if (!dataSourcesForPreferredPrefixResults ||
        dataSourcesForPreferredPrefixResults.length === 0) {

      var message = 'Could not find BridgeDb-supported data source matching' +
        ' provided identifiers.org preferredPrefix "' + preferredPrefix + '"';
      return new Error(message);
    }
    return dataSourcesForPreferredPrefixResults[0];
  };

  function getByPreferredPrefix(preferredPrefix) {
    var getByPreferredPrefixWhenDatabasesLoad =
      highland.curry(getByPreferredPrefixWithAllArguments, preferredPrefix);

    return getAllOld().map(function(result) {
      return result;
    })
    .map(getByPreferredPrefixWhenDatabasesLoad);
  }

  function getByBridgeDbSystemCode(bridgeDbSystemCode) {
    var getByBridgeDbSystemCodeWithAllArguments =
      highland.curry(function(bridgeDbSystemCode, dataSources) {

      var dataSourcesForBridgeDbSystemCodeResults =
        dataSources.filter(function(dataSource) {
        return dataSource.bridgeDbSystemCode === bridgeDbSystemCode;
      });

      if (!dataSourcesForBridgeDbSystemCodeResults ||
        dataSourcesForBridgeDbSystemCodeResults.length === 0) {

        var message = 'No BridgeDb-supported data source returned for' +
          ' bridgeDbSystemCode "' + bridgeDbSystemCode + '"';
        return new Error(message);
      }
      return dataSourcesForBridgeDbSystemCodeResults[0];
    });

    var getWhenDatabasesLoad =
      getByBridgeDbSystemCodeWithAllArguments(bridgeDbSystemCode);

    return getAllOld().map(getWhenDatabasesLoad);
  }
  //*/

  function convertPreferredPrefixToBridgeDbSystemCode(preferredPrefix) {
    return getByPreferredPrefix(preferredPrefix)
      .map(function(dataSource) {
      if (!dataSource) {
        var message = 'No BridgeDb-supported data source available for ' +
           'preferredPrefix + "' + preferredPrefix + '"';
        return new Error(message);
      }
      return dataSource.bridgeDbSystemCode;
    });
  }

  return {
    convertPreferredPrefixToBridgeDbSystemCode:
      convertPreferredPrefixToBridgeDbSystemCode,
    find:find,
    getAllOld:getAllOld,
    getAll:getAll,
    getOne:getOne,
    //getByBridgeDbSystemCode:getByBridgeDbSystemCode,
    //getByName:getByName,
    //getByPreferredPrefix:getByPreferredPrefix
  };
};

module.exports = DataSource;
