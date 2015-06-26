/* @module Dataset */

var _ = require('lodash');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var hyperquest = require('hyperquest');
var internalContext = require('./context.json');
var JsonldMatcher = require('./jsonld-matcher.js');
var Rx = require('rx');
var RxNode = require('rx-node');
var URI = require('URIjs');
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
   * See {@link http://rdfs.org/ns/void#Dataset|void:Dataset}
   * @typedef {Object} Dataset Dataset with as many as possible of the properties listed below.
   * @property {JsonldContext} @context JSON-LD context.
   * @property {Iri} @id Preferred IRI for identifying a dataset.
   * @property {String[]} owl:sameAs Alternate IRI for identifying a dataset.
   *                    See {@link http://www.w3.org/TR/owl-ref/#sameAs-def|owl:sameAs}.
   * @property {String[]} name Data set name. See {@link http://schema.org/name|schema:name}.
   * @property {String} webPage See {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getMainUrl()|Java documentation} and
   *                            {@link http://www.w3.org/2001/XMLSchema#anyURI|xsd:anyURI}.
   * @property {String} uriRegexPattern See {@link http://rdfs.org/ns/void#uriRegexPattern|void:uriRegexPattern}.
   * @property {Iri} exampleResource See {@link http://rdfs.org/ns/void#exampleResource|void:exampleResource}.
   * @property {String} exampleIdentifier See {@link http://identifiers.org/idot/exampleIdentifier|idot:exampleIdentifier}.
   * @property {String} organism Provided only if the dataset is for a single organism. See
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#organism|biopax:organism}.
   * @property {String} _bridgeDbType Biological type, as used at BridgeDb. See
   *                                  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#type(java.lang.String)|Java documentation}.
   * @property {JsonldType} @type {@link http://rdfs.org/ns/void#Dataset|void:Dataset}
   * @property {String|String[]} subject Subject of the database, such as the biological type of its contained entity references.
   *                                                       Biological type as used in GPML at WikiPathways and in PathVisio-Java:
   *                                                       {@link http://vocabularies.wikipathways.org/gpml#Type|gpml:Type}.
   *                                                       Biological type as used in Biopax: see the domain for
   *                                                       {@link http://www.biopax.org/release/biopax-level3.owl#entityReference|biopax:entityReference}.
   * @property {Boolean} _isPrimary See Java documentation for {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#isPrimary()|"isPrimary"}
   *                               and for {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#primary(boolean)|"primary" method}.
   * @property {String} identifierPattern Regular expression for the identifiers from this dataset.
   *                                                                See {@link http://identifiers.org/idot/identifierPattern|idot:identifierPattern}.
   * @property {String} preferredPrefix Abbreviation as used by identifiers.org to identify a dataset.
   *                                    See {@link http://identifiers.org/idot/preferredPrefix|idot:preferredPrefix}. Example: "ncbigene"
   * @property {String[]} alternatePrefix Abbreviation as used elsewhere to identify a dataset, such
   *                                                                as at BridgeDb (_systemCode located both here and on its own).
   *                                                                See {@link http://identifiers.org/idot/alternatePrefix|idot:alternatePrefix}.
   * @property {String} _systemCode See {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getSystemCode()|Java documentation}.
   */

  /**
   * At least one of the following properties must be provided.
   * @typedef {Object} DatasetArgs
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
   * @private
   *
   * Get all biological datasets supported by BridgeDb, with all
   * available metadata, largely as specified in
   * {@link https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt|datasources.txt}.
   *
   * @return {Stream<Dataset>} datasetStream
   */
  function _getAll() {
    function init() {

      /*
      return RxNode.fromReadableStream(
        hyperquest(instance.config.datasetsMetadataIri, {
          withCredentials: false
        })
        .pipe(csv(csvOptions))
      )
      //*/

      return highland(
        hyperquest(instance.config.datasetsMetadataIri, {
          withCredentials: false
        })
        .pipe(csv(csvOptions))
      )
      .map(function(array) {
        return {
          '@context': internalContext,
          _displayName: array[0],
          _systemCode: array[1],
          webPage: array[2],
          _iriPattern: array[3],
          exampleIdentifier: array[4],
          _bridgeDbType: array[5],
          // TODO this is returning organism as a string
          // when elsewhere we are using organism as an
          // object. Will that cause problems?
          organism: array[6],
          _isPrimary: array[7] === '1',
          _miriamRootUrn: array[8],
          identifierPattern: array[9],
          _standardName: array[10]
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
        dataset.name = _([dataset._displayName, dataset._standardName])
        .uniq()
        .compact()
        .value();

        var iriPattern = dataset._iriPattern;
        var identifierPattern = dataset.identifierPattern;
        if (!!iriPattern) {
          dataset.uriRegexPattern = iriPattern.replace(
            '$id',
            _getIdentifierPatternWithoutBeginEndRestriction(identifierPattern)
          );

          // if '$id' is at the end of the iriPattern
          var indexOfSid = iriPattern.length - 3;
          if (iriPattern.indexOf('$id') === indexOfSid) {
            dataset['owl:sameAs'] = dataset['owl:sameAs'] || [];
            dataset['owl:sameAs'].push(iriPattern.substr(0, indexOfSid));
          }
        }

        dataset['@type'] = 'Dataset';

        return dataset;
      })
      .map(function(dataset) {
        if (!!dataset._miriamRootUrn &&
            dataset._miriamRootUrn.indexOf('urn:miriam:') > -1) {

          dataset.preferredPrefix =
            dataset._miriamRootUrn.substring(11,
              dataset._miriamRootUrn.length);
          dataset['@id'] =
            'http://identifiers.org/' + dataset.preferredPrefix + '/';
          dataset['owl:sameAs'] = dataset['owl:sameAs'] || [];
          dataset['owl:sameAs'].push(dataset._miriamRootUrn);
        }
        delete dataset._miriamRootUrn;
        return dataset;
      })
      .map(function(dataset) {
        if (!!dataset._bridgeDbType) {
          dataset.subject = [];
          if (dataset._bridgeDbType === 'gene' ||
              // TODO should the following two conditions be removed?
              dataset._bridgeDbType === 'probe' ||
              dataset.preferredPrefix === 'go') {
            dataset.subject.push('gpml:GeneProduct');
            dataset.subject.push('biopax:DnaReference');
          } else if (dataset._bridgeDbType === 'probe') {
            dataset.subject.push('probe');
          } else if (dataset._bridgeDbType === 'rna') {
            dataset.subject.push('gpml:Rna');
            dataset.subject.push('biopax:RnaReference');
          } else if (dataset._bridgeDbType === 'protein') {
            dataset.subject.push('gpml:Protein');
            dataset.subject.push('biopax:ProteinReference');
          } else if (dataset._bridgeDbType === 'metabolite') {
            dataset.subject.push('gpml:Metabolite');
            dataset.subject.push('biopax:SmallMoleculeReference');
          } else if (dataset._bridgeDbType === 'pathway') {
            dataset.subject.push('gpml:Pathway');
            dataset.subject.push('biopax:Pathway');
          } else if (dataset._bridgeDbType === 'ontology') {
            dataset.subject.push('owl:Ontology');
          } else if (dataset._bridgeDbType === 'interaction') {
            dataset.subject.push('biopax:Interaction');
          }
        }

        dataset.alternatePrefix = [
          dataset._systemCode
        ];

        return dataset;
      });
    }

    return Utils._runOnceGlobal('dataset', init);
  }

  function _getIdentifierPatternWithoutBeginEndRestriction(identifierPattern) {
    identifierPattern = identifierPattern || '.*';
    var identifierPatternWithoutBeginEndRestriction =
      '(' + identifierPattern.replace(/(^\^|\$$)/g, '') + ')';
    return identifierPatternWithoutBeginEndRestriction;
  }

  /**
   * Get one dataset, which will be the first dataset that matches
   * at least one of the provided argument(s).
   *
   * @param {DatasetArgs} args
   * @return {Stream<Dataset>} datasetsStream
   */
  function get(args) {
    return query(args).head();
  }

  /**
   * Get all datasets, or find the datasets that match at least one of the provided argument(s).
   *
   * @param {DatasetArgs} [args] If no args specified, will return all datasets.
   * @return {Stream<Dataset>} datasetsStream
   */
  function query(args) {
    if (_.isEmpty(args)) {
      return _getAll()
      .map(JsonldMatcher._removeNormalizedProperties);
    }

    // preferred keys for identifying a dataset
    var keysThatIdentifyDatasets = [
      '@id',
      'preferredPrefix',
      'alternatePrefix',
      'name'
    ];

    var alternateFilters =  [];
    if (!!args.exampleResource) {
      alternateFilters.push(
        highland.curry(function(exampleResource, referenceDataset) {
          var uriRegexPatternRegExp =
              new RegExp(referenceDataset.uriRegexPattern);
          return !!exampleResource &&
            !!referenceDataset.uriRegexPattern &&
            uriRegexPatternRegExp.test(exampleResource);
        }, args.exampleResource)
      );
    }
    if (!!args.exampleIdentifier) {
      alternateFilters.push(
        highland.curry(function(exampleIdentifier, referenceDataset) {
          var identifierPatternRegExp =
              new RegExp(referenceDataset.identifierPattern);
          return !!exampleIdentifier &&
            !!referenceDataset.identifierPattern &&
            referenceDataset._isPrimary &&
            identifierPatternRegExp.test(exampleIdentifier);
        }, args.exampleIdentifier)
      );
    }

    return _getAll().collect()
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

  function convertPreferredPrefixToSystemCode(preferredPrefix) {
    return getByPreferredPrefix(preferredPrefix)
      .map(function(dataset) {
      if (!dataset) {
        var message = 'No BridgeDb-supported dataset available for ' +
           'preferredPrefix + "' + preferredPrefix + '"';
        return new Error(message);
      }
      return dataset._systemCode;
    });
  }

  return {
    convertPreferredPrefixToSystemCode:
      convertPreferredPrefixToSystemCode,
    get:get,
    _getIdentifierPatternWithoutBeginEndRestriction:
      _getIdentifierPatternWithoutBeginEndRestriction,
    query:query
  };
};

module.exports = Dataset;
