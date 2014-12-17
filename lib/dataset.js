/* @module Dataset */

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
 * Used internally to create a new Dataset instance. See related
 * {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html|DataSource}
 * from BridgeDb-Java.
 * @class
 * @memberof BridgeDb
 * @param {Object} instance
 */
var Dataset = function(instance) {
  'use strict';

  /**
   * Dataset See {@link http://rdfs.org/ns/void#Dataset|void:Dataset}
   * @typedef {Object} Dataset Dataset with as many as possible of the properties listed below.
   * @property {JsonldContext} @context JSON-LD context.
   * @property {Iri} @id Preferred IRI for identifying a dataset.
   * @property {String[]} owl:sameAs Alternate IRI for identifying a dataset. See {@link http://www.w3.org/TR/owl-ref/#sameAs-def|owl:sameAs}.
   * @property {String[]} name Data set name. See {@link http://schema.org/name|schema:name}.
   * @property {String} mainUrl See {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getMainUrl()|Java documentation}.
   * @property {String} urlPattern See {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#urlPattern(java.lang.String)|Java documentation}.
   * @property {String} exampleIdentifier See {@link http://identifiers.org/idot/exampleIdentifier|idot:exampleIdentifier}.
   * @property {String} organism Provided only if the dataset is for a single organism. See
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#organism|biopax:organism}.
   * @property {String} bridgeDbType Biological type, as used at BridgeDb. See
   *                                  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#type(java.lang.String)|Java documentation}.
   * @property {String} @type Biological type, as used in GPML at WikiPathways and in PathVisio-Java.
   *                                                       See {@link http://vocabularies.wikipathways.org/gpml#Type|gpml:Type}.
   *                                                       And as used in Biopax. See the domain for
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#entityReference|biopax:entityReference}.
   * @property {Boolean} isPrimary See Java documentation for {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#isPrimary()|"isPrimary"}
   *                               and for {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#primary(boolean)|"primary" method}.
   * @property {String} identifierPattern Regular expression for the identifiers from this dataset.
   *                                                                See {@link http://identifiers.org/idot/identifierPattern|idot:identifierPattern}.
   * @property {String} preferredPrefix Abbreviation as used by identifiers.org to identify a dataset.
   *                                                              See {@link http://identifiers.org/idot/preferredPrefix|idot:preferredPrefix}.
   * @property {String[]} alternatePrefix Abbreviation as used elsewhere to identify a dataset, such
   *                                                                as at BridgeDb (bridgeDbSystemCode located both here and on its own).
   *                                                                See {@link http://identifiers.org/idot/alternatePrefix|idot:alternatePrefix}.
   * @property {String} bridgeDbSystemCode See {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getSystemCode()|Java documentation}.
   */

  /**
   * DatasetArgs
   * @typedef {Object} DatasetArgs At least one of the following properties must be provided.
   * @property {Iri} [@id]
   * @property {String} [preferredPrefix]
   * @property {String|String[]} [alternatePrefix]
   * @property {String|String[]} [name]
   * @property {String} [identifier] The identifier of the entity reference. This property
   *                                   will only be used if no other properties return results,
   *                                   because many different datasets have overlapping
   *                                   identifierPatterns.
   */

  /**
   * Get all biological datasets supported by BridgeDb, with all
   * available metadata, largely as specified in
   * {@link https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt|datasources.txt}.
   *
   * @return {Stream<Dataset>} datasetStream
   */
  function getAll() {
    function init() {
      var source = instance.config.datasetsUrl;
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
      .map(function(dataset) {

        // remove empty properties

        return _.omit(dataset, function(value) {
          return value === '' ||
            _.isNaN(value) ||
          _.isNull(value) ||
          _.isUndefined(value);
        });
      })
      .map(function(dataset) {
        if (!!dataset.miriamRootUrn &&
            dataset.miriamRootUrn.indexOf('urn:miriam:') > -1) {

          dataset.preferredPrefix =
            dataset.miriamRootUrn.substring(11,
              dataset.miriamRootUrn.length);
          dataset['@id'] =
            'http://identifiers.org/' + dataset.preferredPrefix;
          dataset['owl:sameAs'] = dataset['owl:sameAs'] || [];
          dataset['owl:sameAs'].push(dataset.miriamRootUrn);
        }
        delete dataset.miriamRootUrn;
        return dataset;
      })
      .map(function(dataset) {
        if (!!dataset.bridgeDbType) {
          dataset['@type'] = [];
          if (dataset.bridgeDbType === 'gene' ||
            dataset.bridgeDbType === 'probe' ||
            dataset.preferredPrefix === 'go') {

            dataset['@type'].push('gpml:GeneProduct');
            dataset['@type'].push('biopax:DnaReference');
          } else if (dataset.bridgeDbType === 'rna') {
            dataset['@type'].push('gpml:Rna');
            dataset['@type'].push('biopax:RnaReference');
          } else if (dataset.bridgeDbType === 'protein') {
            dataset['@type'].push('gpml:Protein');
            dataset['@type'].push('biopax:ProteinReference');
          } else if (dataset.bridgeDbType === 'metabolite') {
            dataset['@type'].push('gpml:Metabolite');
            dataset['@type'].push('biopax:SmallMoleculeReference');
          } else if (dataset.bridgeDbType === 'pathway') {
            dataset['@type'].push('gpml:Pathway');
            dataset['@type'].push('biopax:Pathway');
          }
        }

        dataset.alternatePrefix = [
          dataset.bridgeDbSystemCode
        ];

        return dataset;
      });
    }

    return Utils._runOnceGlobal('dataset', init);
  }

  /**
   * Get the first dataset that matches at least one of the provided argument(s).
   *
   * @param {DatasetArgs} args
   * @return {Stream<Dataset>} datasetsStream
   */
  function getOne(args) {
    return find(args).head();
  }

  /**
   * Find the datasets that match at least one of the provided argument(s).
   *
   * @param {DatasetArgs} args
   * @return {Stream<Dataset>} datasetsStream
   */
  function find(args) {
    // preferred keys for identifying a dataset
    var keysThatIdentifyDatasets = [
      '@id',
      'preferredPrefix',
      'alternatePrefix',
      'name'
    ];

    var alternateFilters =  [];

    if (!!args.exampleIdentifier) {
      alternateFilters.push(
        highland.curry(function(exampleIdentifier, referenceDataset) {
          return !!exampleIdentifier &&
            !!referenceDataset.identifierPattern &&
            referenceDataset.isPrimary &&
            referenceDataset.identifierPattern.test(exampleIdentifier);
        }, args.exampleIdentifier)
      );
    }

    return getAll().collect()
    .flatMap(function(datasets) {
      return JsonldMatcher._find(
        args,
        highland(datasets),
        'datasetsFormattedForComparison',
        keysThatIdentifyDatasets,
        alternateFilters
      );
    });
  }

  function convertPreferredPrefixToBridgeDbSystemCode(preferredPrefix) {
    return getByPreferredPrefix(preferredPrefix)
      .map(function(dataset) {
      if (!dataset) {
        var message = 'No BridgeDb-supported dataset available for ' +
           'preferredPrefix + "' + preferredPrefix + '"';
        return new Error(message);
      }
      return dataset.bridgeDbSystemCode;
    });
  }

  return {
    convertPreferredPrefixToBridgeDbSystemCode:
      convertPreferredPrefixToBridgeDbSystemCode,
    find:find,
    getAll:getAll,
    getOne:getOne
  };
};

module.exports = Dataset;
