/// <reference path="./index.d.ts" />
"use strict";
var defaults = require('lodash/defaults');
var isNaN = require('lodash/isNaN');
var isNull = require('lodash/isNull');
var isUndefined = require('lodash/isUndefined');
var omitBy = require('lodash/omitBy');
var csv_streamify_1 = require('csv-streamify');
var Observable_1 = require('rxjs/Observable');
require('rxjs/add/observable/dom/ajax');
require('rxjs/add/observable/forkJoin');
require('rxjs/add/observable/from');
//import 'rxjs/add/observable/throw';
require('rxjs/add/operator/catch');
require('rxjs/add/operator/do');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/map');
require('rxjs/add/operator/reduce');
require('rxjs/add/operator/timeout');
require('rxjs/add/operator/toArray');
require('rx-extra/add/operator/throughNodeStream');
var BIOPAX = 'http://www.biopax.org/release/biopax-level3.owl#';
// TODO the entries below are from datasource_headers.txt
// but elsewhere in this codebase, we're using terms from
// existing ontologies. Pick one and use throughout.
var BDB = 'http://vocabularies.bridgedb.org/ops#';
var DCTERMS = 'http://purl.org/dc/terms/';
var FOAF = 'http://xmlns.com/foaf/0.1/';
var IDENTIFIERS = 'http://identifiers.org/';
var IDOT = IDENTIFIERS + 'idot/';
var OWL = 'http://www.w3.org/2002/07/owl#';
//var RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
//var RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
//var SKOS = 'http://www.w3.org/2004/02/skos/core#';
var csvOptions = { objectMode: true, delimiter: '\t' };
var bridgeDbRepoCdn = 'https://cdn.rawgit.com/bridgedb/BridgeDb/';
var bridgeDbCommitHash = 'f969c770df248f634e34a6a51fc0bf97b08f36d8';
var configDefault = {
    baseIri: 'http://webservice.bridgedb.org/',
    context: [
        bridgeDbRepoCdn,
        bridgeDbCommitHash,
        '/org.bridgedb.bio/resources/org/bridgedb/bio/jsonld-context.jsonld',
    ].join(''),
    datasourcesMetadataIri: [
        bridgeDbRepoCdn,
        bridgeDbCommitHash,
        '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
    ].join(''),
    datasourcesHeadersIri: [
        bridgeDbRepoCdn,
        bridgeDbCommitHash,
        '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt',
    ].join(''),
    http: {
        retryLimit: 2,
        retryDelay: 3000
    }
};
var propertiesThatUniquelyIdentifyDatasource = [
    '@id',
    'conventionalName',
    'preferredPrefix',
    'systemCode',
];
/**
 * getIdentifiersIriFromMiriamUrnInDatasource
 *
 * @param {object} datasource compacted datasource based on datasources.txt and
                                                     datasources_headers.txt
 * @param {string} datasource['http://vocabularies.bridgedb.org/ops#uri']
 * @return {string} e.g., "http://identifiers.org/ncbigene/"
 */
function getIdentifiersIriFromMiriamUrnInDatasource(datasource) {
    var preferredPrefix = getPreferredPrefixFromMiriamUrnInDatasource(datasource);
    if (preferredPrefix) {
        return IDENTIFIERS + preferredPrefix + '/';
    }
}
function _getIdentifierPatternWithoutBeginEndRestriction(identifierPattern) {
    identifierPattern = identifierPattern || '.*';
    var identifierPatternWithoutBeginEndRestriction = '(' + identifierPattern.replace(/(^\^|\$$)/g, '') + ')';
    return identifierPatternWithoutBeginEndRestriction;
}
/**
 * getPreferredPrefixFromMiriamUrnInDatasource
 *
 * @param {object} datasource expanded datasource based on datasources.txt and
                                                     datasources_headers.txt
 * @param {string} datasource.uri, e.g., "urn:miriam:ncbigene"
 * @return {string} preferredPrefix from identifiers.org, e.g., "ncbigene"
 */
function getPreferredPrefixFromMiriamUrnInDatasource(datasource) {
    var uriProperty = datasource.uri;
    if (!!uriProperty) {
        // Make sure it's actually an identifiers.org namespace,
        // not a BridgeDb system code:
        if (uriProperty.indexOf('urn:miriam:') > -1) {
            return uriProperty.substring(11, uriProperty.length);
        }
    }
}
///**
// * Get all datasources, or find the datasources that match at least one of the provided argument(s).
// *
// * @param {DatasourceArgs} [args] If no args specified, will return all datasources.
// * @return {Stream<Datasource>} datasourcesStream
// */
//function query(args) {
//	var timeout = 10 * 1000;
//
//	if (isEmpty(args)) {
//		return _getAll()
//		.do(null, function(err) {
//			err.message = err.message || '';
//			err.message += ', observed in BridgeDb.Datasource.query';
//			throw err;
//		});
//	}
//
//	//*
//	var options = {
//		threshold: 1,
//		skipReferenceRecordExpansion: true,
//	};
//	//*/
//
//	// TODO don't use jsonldRx.matcher
//	return jsonldRx.matcher.filter(args, _getAllProcessedForMatcher(), matchers, options)
//	.timeout(
//			4 * 1000,
//			Observable.throw(new Error('BridgeDb.datasource.query timed out in jsonldRx.matcher.filter.'))
//	)
//	.toArray()
//	.map(function(matcherResults) {
//		if (matcherResults.length < 2) {
//			return matcherResults;
//		}
//
//		var weights = matcherResults.map(function(matcherResult) {
//			return matcherResult.weight;
//		});
//		var maxWeight = Math.max.apply(null, weights);
//		var minWeight = Math.min.apply(null, weights);
//		var totalWeightRange = maxWeight - minWeight;
//
//		var wpPreferredDatasources = [
//			'ensembl',
//			'ncbigene',
//			'chebi',
//			'cas',
//			'hmdb',
//			'uniprot',
//			'kegg.compound'
//		];
//
//		matcherResults.sort(function(matcherResult1, matcherResult2) {
//			var datasource1 = matcherResult1.value;
//			var datasource2 = matcherResult2.value;
//
//			// sort by weight (but only if one weight is much larger than the other)
//			if (totalWeightRange > 0) {
//				var weightRange = matcherResult1.weight - matcherResult2.weight;
//				// TODO fix magic number. this is just a placeholder.
//				var muchLargerThan = 0.1;
//				var normalizedWeight = weightRange / totalWeightRange;
//				if (normalizedWeight > muchLargerThan) {
//					return -1;
//				} else if (-1 * normalizedWeight > muchLargerThan) {
//					return 1;
//				}
//			}
//
//			// next sort by whether preferredPrefix (if present) is in the list
//			// of prefixes preferred for use at WikiPathways
//			var preferredPrefix1 = datasource1.preferredPrefix;
//			var preferredPrefix2 = datasource2.preferredPrefix;
//			var preferenceAtWPIndex1 = wpPreferredDatasources.indexOf(preferredPrefix1);
//			var preferenceAtWPIndex2 = wpPreferredDatasources.indexOf(preferredPrefix2);
//			var preferredAtWP1 = preferenceAtWPIndex1 > -1;
//			var preferredAtWP2 = preferenceAtWPIndex2 > -1;
//			if (preferredAtWP1 && !preferredAtWP2) {
//				return -1;
//			} else if (!preferredAtWP1 && preferredAtWP2) {
//				return 1;
//			} else if (preferredAtWP1 && preferredAtWP2) {
//				return preferredAtWP1 > preferredAtWP2;
//			}
//
//			// sort by is primary (as tagged at BridgeDb)
//			var isPrimary1 = datasource1.primary;
//			var isPrimary2 = datasource2.primary;
//			if (isPrimary1 && !isPrimary2) {
//				return -1;
//			} else if (!isPrimary1 && isPrimary2) {
//				return 1;
//			}
//
//			// sort by presence of a preferredPrefix (it will have one if it has a Miriam URN)
//			if (preferredPrefix1 && !preferredPrefix2) {
//				return -1;
//			} else if (!preferredPrefix1 && preferredPrefix2) {
//				return 1;
//			}
//
//			return preferredPrefix1 > preferredPrefix2;
//		});
//
//		return matcherResults;
//	})
//	.concatMap(function(sortedResults) {
//		// TODO We should distinguish between exact and fuzzy matches.
//		return Observable.from(sortedResults)
//		.map(function(result: any) {
//			return result.value;
//		});
//		/*
//		.filter(function(datasource) {
//			// TODO Make it optional whether to apply this filter.
//			// or else maybe just run this filter outside bridgedbjs,
//			// wherever this function is being called?
//
//			// Datasource subjects that indicate the datasource should not be used for identifying
//			// a BioPAX Entity Reference for a gpml:DataNode.
//			var nonApplicableSubjects = [
//				'interaction',
//				'ontology',
//				'probe',
//				'experiment',
//				'publication',
//				'model',
//				'organism'
//			];
//			return datasource.primary &&
//					!!datasource.id &&
//					nonApplicableSubjects.indexOf(datasource.entityType) === -1;
//		});
//		//*/
//	})
//	.do(null, function(err) {
//		err.message = err.message || '';
//		err.message += ', observed in BridgeDb.Datasource.query';
//		throw err;
//	})
//	.timeout(
//			timeout,
//			Observable.throw(new Error('BridgeDb.datasource.query timed out.'))
//	);
//}
var BridgeDb = (function () {
    function BridgeDb(config) {
        if (config === void 0) { config = {}; }
        var bridgeDb = this;
        bridgeDb.config = defaults(config, configDefault);
    }
    /**
     * @private
     *
     * Get all biological datasources supported by BridgeDb, with all
     * available metadata, largely as specified in
     * {@link
     * https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/
     * resources/org/bridgedb/bio/datasources.txt|
     * datasources.txt}.
     *
     * @return {Stream<Datasource>} datasourceStream
     */
    BridgeDb.prototype.datasources = function (input) {
        var bridgeDb = this;
        var config = bridgeDb.config;
        var timeout = 5 * 1000;
        return Observable_1.Observable.forkJoin(Observable_1.Observable.ajax(config.datasourcesHeadersIri)
            .map(function (ajaxResponse) { return ajaxResponse.xhr.responseText; })
            .throughNodeStream(csv_streamify_1["default"](csvOptions))
            .map(function (row) {
            return {
                column: row[0],
                header: row[1],
                description: row[2],
                example_entry: row[3],
                '@id': row[4]
            };
        })
            .filter(function (header) {
            return header.column.indexOf('#') !== 0;
        })
            .map(function (header) {
            header.column = parseFloat(header.column);
            return header;
        })
            .toArray(), Observable_1.Observable.ajax(config.datasourcesMetadataIri)
            .map(function (ajaxResponse) { return ajaxResponse.xhr.responseText; })
            .throughNodeStream(csv_streamify_1["default"](csvOptions))
            .toArray())
            .do(null, function (err) {
            err.message = err.message || '';
            err.message += ', observed in BridgeDb.Datasource._getAll from XHR request.';
            console.error(err.message);
            console.error(err.stack);
        })
            .mergeMap(function (results) {
            var headers = results[0];
            var rows = results[1];
            var headersByColumn = headers.reduce(function (acc, header) {
                acc[header.column] = header;
                return acc;
            }, []);
            return Observable_1.Observable.from(rows).map(function (fields) {
                return fields.map(function (field, i) {
                    var header = headersByColumn[i];
                    var property = {};
                    property[header['@id']] = field;
                });
            });
        })
            .map(function (datasource) {
            // remove empty properties, ie., properties with these values:
            // ''
            // NaN
            // null
            // undefined
            // TODO what about empty plain object {} or array []
            return omitBy(datasource, function (value) {
                return value === '' ||
                    isNaN(value) ||
                    isNull(value) ||
                    isUndefined(value);
            });
        })
            .map(function (datasource) {
            var primaryUriPattern = datasource.hasPrimaryUriPattern;
            var identifierPattern = datasource.identifierPattern;
            if (!!primaryUriPattern) {
                datasource.uriRegexPattern = primaryUriPattern.replace('$id', _getIdentifierPatternWithoutBeginEndRestriction(identifierPattern));
                // if '$id' is at the end of the primaryUriPattern
                var indexOfDollaridWhenAtEnd = primaryUriPattern.length - 3;
                if (primaryUriPattern.indexOf('$id') === indexOfDollaridWhenAtEnd) {
                    datasource[OWL + 'sameAs'] = datasource[OWL + 'sameAs'] || [];
                    datasource[OWL + 'sameAs'].push(primaryUriPattern.substr(0, indexOfDollaridWhenAtEnd));
                }
            }
            datasource.type = 'Dataset';
            return datasource;
        })
            .map(function (datasource) {
            var preferredPrefix = getPreferredPrefixFromMiriamUrnInDatasource(datasource);
            if (preferredPrefix) {
                var _miriamRootUrn = datasource.uri;
                datasource[OWL + 'sameAs'] = datasource[OWL + 'sameAs'] || [];
                datasource[OWL + 'sameAs'].push(_miriamRootUrn);
                datasource.preferredPrefix = preferredPrefix;
                var identifiersIri = getIdentifiersIriFromMiriamUrnInDatasource(datasource);
                if (identifiersIri) {
                    datasource.id = identifiersIri;
                }
            }
            return datasource;
        })
            .map(function (datasource) {
            if (!!datasource.entityType) {
                datasource.subject = [];
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
                if (datasource.entityType === 'gene' ||
                    // TODO should the following two conditions be removed?
                    datasource.entityType === 'probe' ||
                    datasource.preferredPrefix === 'go') {
                    datasource.subject.push('gpml:GeneProduct');
                    datasource.subject.push('biopax:DnaReference');
                }
                else if (datasource.entityType === 'probe') {
                    datasource.subject.push('probe');
                }
                else if (datasource.entityType === 'rna') {
                    datasource.subject.push('gpml:Rna');
                    datasource.subject.push('biopax:RnaReference');
                }
                else if (datasource.entityType === 'protein') {
                    datasource.subject.push('gpml:Protein');
                    datasource.subject.push('biopax:ProteinReference');
                }
                else if (datasource.entityType === 'metabolite') {
                    datasource.subject.push('gpml:Metabolite');
                    datasource.subject.push('biopax:SmallMoleculeReference');
                }
                else if (datasource.entityType === 'pathway') {
                    // BioPAX does not have a term for pathways that is analogous to
                    // biopax:ProteinReference for proteins.
                    datasource.subject.push('gpml:Pathway');
                    datasource.subject.push('biopax:Pathway');
                }
                else if (datasource.entityType === 'ontology') {
                    datasource.subject.push(OWL + 'Ontology');
                }
                else if (datasource.entityType === 'interaction') {
                    datasource.subject.push('biopax:Interaction');
                }
            }
            datasource.alternatePrefix = [
                datasource.systemCode
            ];
            return datasource;
        })
            .do(null, function (err) {
            err.message = err.message || '';
            err.message += ', observed in BridgeDb.Datasource._getAll';
            throw err;
        })
            .reduce(function (acc, datasource) {
            return propertiesThatUniquelyIdentifyDatasource
                .filter(function (property) { return datasource.hasOwnProperty(property); })
                .reduce(function (subacc, property) {
                subacc[property] = datasource;
                return subacc;
            }, acc);
        }, {});
        //.shareReplay()
        //		.timeout(
        //				timeout,
        //				Observable.throw(new Error('BridgeDb.datasources() timed out.'))
        //		);
    };
    return BridgeDb;
}());
exports.__esModule = true;
exports["default"] = BridgeDb;
//# sourceMappingURL=index.js.map