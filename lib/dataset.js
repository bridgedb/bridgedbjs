/* @module Dataset */

var _ = require('lodash');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
//var highland = require('highland');
var httpErrors = require('./http-errors.js');
var hyperquest = require('hyperquest');
var Rx = require('rx');
var RxNode = require('rx-node');
var URI = require('URIjs');
var Utils = require('./utils.js');

var IDENTIFIERS = 'http://identifiers.org/';
// TODO the entries below are from datasource_headers.txt
// but elsewhere in this codebase, we're using terms from
// existing ontologies. Pick one and use throughout.
var BRIDGEDB = 'http://vocabularies.bridgedb.org/ops#';

var DATASOURCES_HEADERS_NS = [
  'https://github.com/bridgedb/BridgeDb/blob/master/',
  'org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#'
].join('');
var DATASOURCES_DATASOURCE_NAME_NS = DATASOURCES_HEADERS_NS + 'datasource_name';
var DATASOURCES_EXAMPLE_IDENTIFIER_NS = DATASOURCES_HEADERS_NS + 'example_identifier';
var DATASOURCES_LINKOUT_PATTERN_NS = DATASOURCES_HEADERS_NS + 'linkout_pattern';
var DATASOURCES_OFFICIAL_NAME_NS = DATASOURCES_HEADERS_NS + 'official_name';
var DATASOURCES_REGEX_NS = DATASOURCES_HEADERS_NS + 'regex';
var DATASOURCES_SYSTEM_CODE_NS = DATASOURCES_HEADERS_NS + 'system_code';
var DATASOURCES_URI_NS = DATASOURCES_HEADERS_NS + 'uri';
var DATASOURCES_WEBSITE_URL_NS = DATASOURCES_HEADERS_NS + 'website_url';

var FOAF = 'http://xmlns.com/foaf/0.1/';

var OWL = 'http://www.w3.org/2002/07/owl#';
//var RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
//var RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
//var SKOS = 'http://www.w3.org/2004/02/skos/core#';

var SCHEMA = 'http://schema.org/';
var VOID_NS = 'http://rdfs.org/ns/void#';

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

  var jsonldRx = instance.jsonldRx;
  var internalContext = instance.config.context;

  /**
   * getIdentifiersIriFromMiriamUrnInDataset
   *
   * @param {object} dataset compacted dataset based on datasources.txt and
                             datasources_headers.txt
   * @param {string} dataset['http://vocabularies.bridgedb.org/ops#uri']
   * @return {string} e.g., "http://identifiers.org/ncbigene/"
   */
  function getIdentifiersIriFromMiriamUrnInDataset(dataset) {
    var preferredPrefix = getPreferredPrefixFromMiriamUrnInDataset(dataset);
    if (preferredPrefix) {
      return IDENTIFIERS + preferredPrefix + '/';
    }
  }

  /**
   * See {@link http://rdfs.org/ns/void#Dataset|void:Dataset}
   * @typedef {Object} Dataset Dataset with as many as possible of the properties listed below.
   * @property {JsonldContext} @context JSON-LD context.
   * @property {Iri} id Preferred IRI for identifying a dataset.
   * @property {String[]} 'http://www.w3.org/2002/07/owl#' Alternate IRI for identifying a dataset.
   *                    See {@link http://www.w3.org/TR/owl-ref/#sameAs-def|owl:sameAs}.
   * @property {String} name Official, standardized name for the data set.
   *  See {@link http://schema.org/name|schema:name}.
   * @property {String} webPage See
   *  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getMainUrl()|
   *    Java documentation} and {@link http://www.w3.org/2001/XMLSchema#anyURI|xsd:anyURI}.
   * @property {String} uriRegexPattern See
   *  {@link http://rdfs.org/ns/void#uriRegexPattern|void:uriRegexPattern}.
   * @property {Iri} exampleResource See
   *  {@link http://rdfs.org/ns/void#exampleResource|void:exampleResource}.
   * @property {String} exampleIdentifier See
   *  {@link http://identifiers.org/idot/exampleIdentifier|idot:exampleIdentifier}.
   * @property {String} organism Provided only if the dataset is for a single organism. See
   *  {@link http://www.biopax.org/release/biopax-level3.owl#organism|biopax:organism}.
   * @property {String} _bridgeDbType Biological type, as used at BridgeDb. See
   *  {@link
   *  http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#type(java.lang.String)|
   *  Java documentation}.
   * @property {JsonldType} type {@link http://rdfs.org/ns/void#Dataset|void:Dataset}
   * @property {String|String[]} subject Subject of the database, such as the biological type of
   *  its contained entity references. Biological type as used in GPML at WikiPathways and in
   *  PathVisio-Java:
   *  {@link http://vocabularies.wikipathways.org/gpml#Type|gpml:Type}.
   *  Biological type as used in Biopax: see the domain for
   *  {@link
   *  http://www.biopax.org/release/biopax-level3.owl#entityReference|biopax:entityReference}.
   * @property {Boolean} _isPrimary See Java documentation for
   *  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#isPrimary()|"isPrimary"}
   *  and for
   *  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.Builder.html#primary(boolean)|
   *  "primary" method}.
   * @property {String} identifierPattern Regular expression for the identifiers from this dataset.
   *  See {@link http://identifiers.org/idot/identifierPattern|idot:identifierPattern}.
   * @property {String} preferredPrefix Abbreviation as used by identifiers.org to identify a
   *  dataset. See {@link http://identifiers.org/idot/preferredPrefix|idot:preferredPrefix}.
   *  @example: 'ncbigene'
   * @property {String[]} alternatePrefix Abbreviation as used elsewhere to identify a dataset,
   *  such as at BridgeDb (bridgeDbSystemCode located both here and on its own).
   *  See {@link http://identifiers.org/idot/alternatePrefix|idot:alternatePrefix}.
   * @property {String} bridgeDbSystemCode See
   *  {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/DataSource.html#getSystemCode()|
   *    Java documentation}.
   * @property {String} bridgeDbDataSourceName Name for the data set as used in the
   *  BridgeDb project.
   */

  /**
   * At least one of the following properties must be provided.
   * @typedef {Object} DatasetArgs
   * @property {Iri} [id]
   * @property {String} [preferredPrefix]
   * @property {String|String[]} [bridgeDbSystemCode]
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
   * {@link
   * https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/
   * resources/org/bridgedb/bio/datasources.txt|
   * datasources.txt}.
   *
   * @return {Stream<Dataset>} datasetStream
   */
  function _getAll() {
    //*
    return RxNode.fromReadableStream(
      hyperquest(instance.config.datasetsMetadataIri, {
        withCredentials: false
      })
      .pipe(csv(csvOptions))
    )
    //*/
    .map(function(array) {
      var result = {
        '@context': internalContext,
        bridgeDbDataSourceName: array[0],
        bridgeDbSystemCode: array[1],
        webPage: array[2],
        _iriPattern: array[3],
        exampleIdentifier: array[4],
        _bridgeDbType: array[5],
        // TODO this is returning organism as a string
        // when elsewhere we are using organism as an
        // object. Will that cause problems?
        organism: array[6],
        _isPrimary: array[7] === '1',
        identifierPattern: array[9],
        name: array[10]
      };

      result[DATASOURCES_URI_NS] = array[8];

      return result;
    })
    .map(function(dataset) {

      // remove empty properties, ie., propeties with these values:
      // ''
      // NaN
      // null
      // undefined
      // TODO what about empty plain object {} or array []

      return _.omitBy(dataset, function(value) {
        return value === '' ||
          _.isNaN(value) ||
        _.isNull(value) ||
        _.isUndefined(value);
      });
    })
    .map(function(dataset) {
      var iriPattern = dataset._iriPattern;
      var identifierPattern = dataset.identifierPattern;
      if (!!iriPattern) {
        dataset.uriRegexPattern = iriPattern.replace(
          '$id',
          _getIdentifierPatternWithoutBeginEndRestriction(identifierPattern)
        );

        // if '$id' is at the end of the iriPattern
        var indexOfDollaridWhenAtEnd = iriPattern.length - 3;
        if (iriPattern.indexOf('$id') === indexOfDollaridWhenAtEnd) {
          dataset[OWL + 'sameAs'] = dataset[OWL + 'sameAs'] || [];
          dataset[OWL + 'sameAs'].push(iriPattern.substr(0, indexOfDollaridWhenAtEnd));
        }
      }

      dataset.type = 'Dataset';

      return dataset;
    })
    .map(function(dataset) {
      var preferredPrefix = getPreferredPrefixFromMiriamUrnInDataset(dataset);
      if (preferredPrefix) {
        var _miriamRootUrn = dataset[DATASOURCES_URI_NS];
        dataset[OWL + 'sameAs'] = dataset[OWL + 'sameAs'] || [];
        dataset[OWL + 'sameAs'].push(_miriamRootUrn);

        dataset.preferredPrefix = preferredPrefix;
        var identifiersIri = getIdentifiersIriFromMiriamUrnInDataset(dataset);
        if (identifiersIri) {
          dataset.id = identifiersIri;
        }
      }
      return dataset;
    })
    .map(function(dataset) {
      if (!!dataset._bridgeDbType) {
        dataset.subject = [];
        /* Example of using 'subject' (from the VOID docs <http://www.w3.org/TR/void/#subject>):
            :Bio2RDF a void:Dataset;
                dcterms:subject <http://purl.uniprot.org/core/Gene>;
                .

        The closest concepts from the GPML, BioPAX and MESH vocabularies are included below.

        Note that in BioPAX, 'ProteinReference' is to 'Protein' as
            'Class' is to 'Instance' or
            'platonic ideal of http://identifiers.org/uniprot/P78527' is to
                  'one specific example of http://identifiers.org/uniprot/P78527'
        with the same logic applying for Dna, Rna and SmallMolecule. As such, it appears the
        subject of Uniprot is best described in BioPAX terms as biopax:ProteinReference instead
        of biopax:Protein.

        It is unclear whether the subject of Entrez Gene is biopax:DnaReference or biopax:Gene,
        but I'm going with biopax:DnaReference for now because it appears to be analogous to
        ProteinReference and SmallMoleculeReference.
        //*/
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
          // BioPAX does not have a term for pathways that is analogous to
          // biopax:ProteinReference for proteins.
          dataset.subject.push('gpml:Pathway');
          dataset.subject.push('biopax:Pathway');
        } else if (dataset._bridgeDbType === 'ontology') {
          dataset.subject.push(OWL + 'Ontology');
        } else if (dataset._bridgeDbType === 'interaction') {
          dataset.subject.push('biopax:Interaction');
        }
      }

      dataset.alternatePrefix = [
        dataset.bridgeDbSystemCode
      ];

      return dataset;
    })
    .shareReplay();
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
    return query(args).first();
  }

  /**
   * getPreferredPrefixFromMiriamUrnInDataset
   *
   * @param {object} dataset expanded dataset based on datasources.txt and
                             datasources_headers.txt
   * @param {string} dataset['http://vocabularies.bridgedb.org/ops#uri']
   *                 e.g., "urn:miriam:ncbigene"
   * @return {string} preferredPrefix from identifiers.org, e.g., "ncbigene"
   */
  function getPreferredPrefixFromMiriamUrnInDataset(dataset) {
    var uriProperty = dataset[DATASOURCES_URI_NS];
    if (!!uriProperty) {
      // Make sure it's actually an identifiers.org namespace,
      // not a BridgeDb system code:
      if (uriProperty.indexOf('urn:miriam:') > -1) {
        return uriProperty.substring(11, uriProperty.length);
      }
    }
  }

  /**
   * Get all datasets, or find the datasets that match at least one of the provided argument(s).
   *
   * @param {DatasetArgs} [args] If no args specified, will return all datasets.
   * @return {Stream<Dataset>} datasetsStream
   */
  function query(args) {
    if (_.isEmpty(args)) {
      return _getAll();
      // TODO do I need to re-enable this?
      //.map(jsonldRx._matcher._removeNormalizedProperties)
    }

    var matchers = [{
      characteristics: [
        '@id',
        DATASOURCES_URI_NS,
        SCHEMA + 'webPage',
        FOAF + 'page',
        DATASOURCES_WEBSITE_URL_NS,
      ],
      probabilityTruePositive: function(matcher, toMatchRecord, referenceRecord) {
        var characteristicKeys = matcher.characteristicKeys;
        var toMatchRecordKeys = _.keys(toMatchRecord);
        var referenceRecordKeys = _.keys(referenceRecord);
        if (_.intersection(characteristicKeys, toMatchRecordKeys, referenceRecordKeys).length) {
          return 0.95;
        } else {
          return 0.02;
        }
      },
      probabilityFalsePositive: 0.01,
    }, {
      characteristics: [
        SCHEMA + 'name',
        DATASOURCES_OFFICIAL_NAME_NS,
        BRIDGEDB + 'bridgeDbDataSourceName',
        'bridgeDbDataSourceName',
        DATASOURCES_DATASOURCE_NAME_NS,
        BRIDGEDB + 'bridgeDbSystemCode',
        'bridgeDbSystemCode',
        DATASOURCES_SYSTEM_CODE_NS,
        IDENTIFIERS + 'idot/preferredPrefix',
        IDENTIFIERS + 'idot/alternatePrefix',
      ],
      probabilityTruePositive: function(matcher, toMatchRecord, referenceRecord) {
        var characteristicKeys = matcher.characteristicKeys;
        var toMatchRecordKeys = _.keys(toMatchRecord);
        var referenceRecordKeys = _.keys(referenceRecord);
        if (_.intersection(characteristicKeys, toMatchRecordKeys, referenceRecordKeys).length) {
          return 0.8;
        } else {
          return 0.02;
        }
      },
      probabilityFalsePositive: 0.01,
    }, {
      characteristics: [
        VOID_NS + 'exampleResource',
        'exampleResource'
      ],
      probabilityTruePositive: function(matcher, toMatchRecord, referenceRecord) {
        var characteristicKeys = matcher.characteristicKeys;
        var toMatchRecordKeys = _.keys(toMatchRecord);
        var referenceRecordKeys = _.keys(referenceRecord);
        if (_.intersection(characteristicKeys, toMatchRecordKeys, referenceRecordKeys).length) {
          return 0.9;
        } else {
          return 0.02;
        }
      },
      probabilityFalsePositive: 0.01,
      tests: [
       function(toMatchRecord, toMatchRecordValue, referenceRecord, referenceRecordValue) {
         var reEntry = referenceRecord[VOID_NS + 'uriRegexPattern'];
         if (reEntry && reEntry[0] && reEntry[0]['@value']) {
           var reString = reEntry[0]['@value'];
           var re = new RegExp(reString);
           return re.test(toMatchRecordValue);
         }
       },
      ]
    }, {
      characteristics: [
        IDENTIFIERS + 'idot/exampleIdentifier',
        'exampleIdentifier',
        DATASOURCES_EXAMPLE_IDENTIFIER_NS,
      ],
      probabilityTruePositive: function(matcher, toMatchRecord, referenceRecord) {
        //*
        var characteristicKeys = matcher.characteristicKeys;
        var toMatchRecordKeys = _.keys(toMatchRecord);
        var referenceRecordKeys = _.keys(referenceRecord);
        if (_.intersection(characteristicKeys, toMatchRecordKeys, referenceRecordKeys).length) {
          var reEntry = referenceRecord[IDENTIFIERS + 'idot/identifierPattern'] ||
              referenceRecord[DATASOURCES_REGEX_NS];
          if (reEntry && reEntry[0] && reEntry[0]['@value']) {
            var reString = reEntry[0]['@value'];
            var re = new RegExp(reString);
            if (re.test('1234')) {
              // TODO both of these values may change if datasources.txt is changed.
              // maybe 25 identifier regex's match numbers, and
              // there are currently 137 total rows in datasources.txt.
              return (137 - 25) / 137;
            }
          }
        } else {
          return 0.02;
        }
        //*/
      },
      probabilityFalsePositive: function(matcher, toMatchRecord, referenceRecord) {
        // TODO improve this very rough first attempt at calculating the prob. for
        // an identifier Regular Expression to match an example identifier and yet
        // incorrectly identify the database.
        var reEntry = referenceRecord[IDENTIFIERS + 'idot/identifierPattern'] ||
            referenceRecord[DATASOURCES_REGEX_NS];
        if (reEntry && reEntry[0] && reEntry[0]['@value']) {
          var reString = reEntry[0]['@value'];
          var re = new RegExp(reString);
          if (re.test('1234')) {
            // TODO both of these values may change if datasources.txt is changed.
            // maybe 25 identifier regex's match numbers, and
            // there are currently 137 total rows in datasources.txt.
            return 25 / 137;
          }
        }
        // TODO this number is a dummy value
        return 0.01;
      },
      tests: [
       function(toMatchRecord, toMatchRecordValue, referenceRecord, referenceRecordValue) {
         var reEntry = referenceRecord[IDENTIFIERS + 'idot/identifierPattern'] ||
            referenceRecord[DATASOURCES_REGEX_NS];
         if (reEntry && reEntry[0] && reEntry[0]['@value']) {
           var reString = reEntry[0]['@value'];
           var re = new RegExp(reString);
           return re.test(toMatchRecordValue);
         }
       },
      ]
    }];

    //*
    var options = {
      threshold: 1
      // TODO preprocess datasources.txt
      //skipReferenceRecordExpansion: true,
    };
    //*/

    return jsonldRx.matcher.filter(args, _getAll(), matchers, options)
      .toArray()
      .map(function(matcherResults) {
        if (matcherResults.length < 2) {
          return matcherResults;
        }

        var weights = matcherResults.map(function(matcherResult) {
          return matcherResult.weight;
        });
        var maxWeight = Math.max.apply(null, weights);
        var minWeight = Math.min.apply(null, weights);
        var totalWeightRange = maxWeight - minWeight;

        var wpPreferredDatasets = [
          'ensembl',
          'ncbigene',
          'chebi',
          'cas',
          'hmdb',
          'uniprot',
          'kegg.compound'
        ];

        matcherResults.sort(function(matcherResult1, matcherResult2) {
          var dataset1 = matcherResult1.value;
          var dataset2 = matcherResult2.value;

          // sort by weight (but only if one weight is much larger than the other)
          if (totalWeightRange > 0) {
            var weightRange = matcherResult1.weight - matcherResult2.weight;
            // TODO fix magic number. this is just a placeholder.
            var muchLargerThan = 0.1;
            var normalizedWeight = weightRange / totalWeightRange;
            if (normalizedWeight > muchLargerThan) {
              return -1;
            } else if (-1 * normalizedWeight > muchLargerThan) {
              return 1;
            }
          }

          // next sort by whether preferredPrefix (if present) is in the list
          // of prefixes preferred for use at WikiPathways
          var preferredPrefix1 = dataset1.preferredPrefix;
          var preferredPrefix2 = dataset2.preferredPrefix;
          var preferenceAtWPIndex1 = wpPreferredDatasets.indexOf(preferredPrefix1);
          var preferenceAtWPIndex2 = wpPreferredDatasets.indexOf(preferredPrefix2);
          var preferredAtWP1 = preferenceAtWPIndex1 > -1;
          var preferredAtWP2 = preferenceAtWPIndex2 > -1;
          if (preferredAtWP1 && !preferredAtWP2) {
            return -1;
          } else if (!preferredAtWP1 && preferredAtWP2) {
            return 1;
          } else if (preferredAtWP1 && preferredAtWP2) {
            return preferredAtWP1 > preferredAtWP2;
          }

          // sort by is primary (as tagged at BridgeDb)
          var isPrimary1 = dataset1._isPrimary;
          var isPrimary2 = dataset2._isPrimary;
          if (isPrimary1 && !isPrimary2) {
            return -1;
          } else if (!isPrimary1 && isPrimary2) {
            return 1;
          }

          // sort by presence of a preferredPrefix (it will have one if it has a Miriam URN)
          if (preferredPrefix1 && !preferredPrefix2) {
            return -1;
          } else if (!preferredPrefix1 && preferredPrefix2) {
            return 1;
          }

          return preferredPrefix1 > preferredPrefix2;
        });

        return matcherResults;
      })
      .concatMap(function(sortedResults) {
        // TODO We should distinguish between exact and fuzzy matches.
        return Rx.Observable.from(sortedResults)
        .map(function(result) {
          return result.value;
        });
        /*
        .filter(function(dataset) {
          // TODO Make it optional whether to apply this filter.
          // or else maybe just run this filter outside bridgedbjs,
          // wherever this function is being called?

          // Dataset subjects that indicate the dataset should not be used for identifying
          // a BioPAX Entity Reference for a gpml:DataNode.
          var nonApplicableSubjects = [
            'interaction',
            'ontology',
            'probe',
            'experiment',
            'publication',
            'model',
            'organism'
          ];
          return dataset._isPrimary &&
              !!dataset.id &&
              nonApplicableSubjects.indexOf(dataset._bridgeDbType) === -1;
        });
        //*/
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
      return dataset.bridgeDbSystemCode;
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
