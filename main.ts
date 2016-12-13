declare global {
  // Augment Node.js `global`
  namespace NodeJS {
    interface Global {
      XMLHttpRequest: XMLHttpRequest;
    }
  }
  // Augment Browser `window`
  //interface Window extends NodeJS.Global { }
  // Augment Web Worker `self`
  //interface WorkerGlobalScope extends NodeJS.Global { }
}

if (!global.hasOwnProperty('XMLHttpRequest')) {
	global.XMLHttpRequest = require('xhr2');
}

import * as at from 'lodash/at';
import * as compact from 'lodash/compact';
import * as defaultsDeep from 'lodash/defaultsDeep';
import * as isNaN from 'lodash/isNaN';
import * as isNull from 'lodash/isNull';
import * as isUndefined from 'lodash/isUndefined';
import * as isEmpty from 'lodash/isEmpty';
import * as omitBy from 'lodash/omitBy';

import * as values from 'lodash/values';
import * as intersection from 'lodash/intersection';

import csv = require('csv-streamify');
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/from';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/find';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/publishReplay';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/toArray';

import 'rx-extra/add/operator/throughNodeStream';

const BIOPAX = 'http://www.biopax.org/release/biopax-level3.owl#';
const GPML = 'http://vocabularies.wikipathways.org/gpml#'
const IDENTIFIERS = 'http://identifiers.org/';
const OWL = 'http://www.w3.org/2002/07/owl#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

let csvOptions = {objectMode: true, delimiter: '\t'};

const bridgeDbRepoCdn = 'https://cdn.rawgit.com/bridgedb/BridgeDb/';
const bridgeDbCommitHash = '7bb5058221eb3537a2c04965089de1521a5ed691';
const configDefault = {
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
		timeout: 3 * 1000,
    retryLimit: 2,
    retryDelay: 3 * 1000
  }
};

const propertiesThatUniquelyIdentifyDatasource = [
	'about',
	'miriamUrn',
	'conventionalName',
	'preferredPrefix',
	'systemCode',
];

/**
 * miriamUrnToIdentifiersIri
 *
 * @param {string} miriamUrn
 * @return {string} e.g., "http://identifiers.org/ncbigene/"
 */
function miriamUrnToIdentifiersIri(miriamUrn: string): string {
	const preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
	if (preferredPrefix) {
		return IDENTIFIERS + preferredPrefix + '/';
	}
}

/**
 * miriamUrnToPreferredPrefix
 *
 * @param {string} uri, e.g., "urn:miriam:ncbigene"
 * @return {string} preferredPrefix from identifiers.org/Miriam, e.g., "ncbigene"
 */
function miriamUrnToPreferredPrefix(miriamUrn: string): string {
	// Make sure it's actually an identifiers.org namespace,
	// not a BridgeDb system code:
	if (miriamUrn.indexOf('urn:miriam:') > -1) {
		return miriamUrn.substring(11, miriamUrn.length);
	}
}

const parseAsDatatype = {
	'http://www.w3.org/2001/XMLSchema#string': String,
	'http://www.w3.org/2001/XMLSchema#anyURI': String,
	'http://www.w3.org/2001/XMLSchema#boolean': Boolean,
	'http://www.w3.org/2001/XMLSchema#integer': parseInt,
	'http://www.w3.org/2001/XMLSchema#float': parseFloat,
};

export default class BridgeDb {
	config;
	datasources$;
	datasourceMappings$;
	getTSV;
	constructor(config = configDefault) {
		let bridgeDb = this;
		defaultsDeep(config, configDefault);
		bridgeDb.config = config;

		const getTSV = bridgeDb.getTSV = function(url: string): Observable<string[]> {
			return Observable.ajax({
				url: url,
				method: 'GET',
				responseType: 'text',
				timeout: config.http.timeout
			})
				.map((ajaxResponse): string => ajaxResponse.xhr.response)
				.throughNodeStream(csv(csvOptions))
				// each row is an array of fields
				.filter(function(fields) {
					// Remove commented out rows
					return fields[0].indexOf('#') !== 0;
				});
		};

		bridgeDb.datasources$ = Observable.forkJoin(
				getTSV(config.datasourcesHeadersIri)
					.map(function(fields) {
						return {
							// NOTE: the column number could be confusing, because it's one-based,
							// so I'll just use the index instead and ignore the column number.
							//column: parseFloat(fields[0]),
							header: fields[1],
							description: fields[2],
							example_entry: fields[3],
							'http://www.w3.org/1999/02/22-rdf-syntax-ns#about': fields[4],
							term: fields[4].split(/[\/|#]/).pop(),
							'http://www.w3.org/1999/02/22-rdf-syntax-ns#datatype': fields[5],
						};
					})
					.toArray(),
				getTSV(config.datasourcesMetadataIri)
					.toArray()
		)
			.mergeMap(function(results) {
				var metadataByColumnIndex = results[0];
				var rows = results[1];

				return Observable.from(rows)
					.map(function(fields) {
						return fields.reduce(function(acc, field, i) {
							const metadata = metadataByColumnIndex[i];
							acc[metadata.term] = parseAsDatatype[metadata[RDF + 'datatype']](field);
							return acc;
						}, {});
					});
			})
			.map(function(datasource) {
				// remove empty properties, ie., properties with these values:
				// ''
				// NaN
				// null
				// undefined
				// TODO what about empty plain object {} or array []

				return omitBy(datasource, function(value) {
					return value === '' ||
						isNaN(value) ||
						isNull(value) ||
						isUndefined(value);
				});
			})
			.map(function(datasource: Datasource) {
				// If the Miriam URN is unknown or unspecified, datasources.txt uses
				// the BridgeDb system code as a placeholder value.
				// So here we make sure "about" is actually a Miriam URN.
				if (datasource.hasOwnProperty('about') && datasource.about.indexOf('urn:miriam:') > -1) {
					// switch "about" property from Miriam URN to identifiers.org IRI
					const miriamUrn = datasource.about;
					datasource.miriamUrn = miriamUrn;
					const preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
					if (preferredPrefix) {
						datasource.preferredPrefix = preferredPrefix;

						datasource.sameAs = datasource.sameAs || [];
						datasource.sameAs.push(miriamUrn);

						const identifiersIri = miriamUrnToIdentifiersIri(miriamUrn);
						if (identifiersIri) {
							datasource.about = datasource.hasIdentifiersOrgPattern = identifiersIri;
						}
					}
				} else {
					delete datasource.about;
				}
				return datasource;
			})
			.map(function(datasource: Datasource) {
				const primaryUriPattern = datasource.hasPrimaryUriPattern;
				if (!!primaryUriPattern) {
					const regexIdentifierPattern = datasource.hasRegexPattern || '.*';;

					datasource.hasRegexUriPattern = primaryUriPattern.replace(
						'$id',
						// removing ^ (start) and $ (end) from regexIdentifierPattern
						'(' + regexIdentifierPattern.replace(/(^\^|\$$)/g, '') + ')'
					);

					// if '$id' is at the end of the primaryUriPattern
					var indexOfDollaridWhenAtEnd = primaryUriPattern.length - 3;
					if (primaryUriPattern.indexOf('$id') === indexOfDollaridWhenAtEnd) {
						datasource.sameAs = datasource.sameAs || [];
						datasource.sameAs.push(primaryUriPattern.substr(0, indexOfDollaridWhenAtEnd));
					}
				}

				datasource.type = 'Dataset';

				return datasource;
			})
			.map(function(datasource) {
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
						datasource.subject.push(GPML + 'GeneProduct');
						datasource.subject.push(BIOPAX + 'DnaReference');
					} else if (datasource.entityType === 'probe') {
						datasource.subject.push('probe');
					} else if (datasource.entityType === 'rna') {
						datasource.subject.push(GPML + 'Rna');
						datasource.subject.push(BIOPAX + 'RnaReference');
					} else if (datasource.entityType === 'protein') {
						datasource.subject.push(GPML + 'Protein');
						datasource.subject.push(BIOPAX + 'ProteinReference');
					} else if (datasource.entityType === 'metabolite') {
						datasource.subject.push(GPML + 'Metabolite');
						datasource.subject.push(BIOPAX + 'SmallMoleculeReference');
					} else if (datasource.entityType === 'pathway') {
						// BioPAX does not have a term for pathways that is analogous to
						// biopax:ProteinReference for proteins.
						datasource.subject.push(GPML + 'Pathway');
						datasource.subject.push(BIOPAX + 'Pathway');
					} else if (datasource.entityType === 'ontology') {
						datasource.subject.push(OWL + 'Ontology');
					} else if (datasource.entityType === 'interaction') {
						datasource.subject.push(BIOPAX + 'Interaction');
					}
				}

				datasource.alternatePrefix = [
					datasource.systemCode
				];

				return datasource;
			})
			.do(null, function(err) {
				err.message = err.message || '';
				err.message += ', observed in BridgeDb.datasources()';
				throw err;
			})
			.publishReplay().refCount();

		bridgeDb.datasourceMappings$ = bridgeDb.datasources$
			.reduce(function(acc, datasource) {
				propertiesThatUniquelyIdentifyDatasource.forEach(function(propertyName) {
					const propertyValue = datasource[propertyName];
					acc[propertyValue] = datasource;
				});
				return acc;
			}, {})
			.publishReplay().refCount();
	}

	getAttributes(organism: organism, conventionalName: string, identifier: string) {
		let bridgeDb = this;
		return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/attributes/' + conventionalName + '/' + identifier)
			.reduce(function(acc, fields) {
				acc[fields[0]] = fields[1];
				return acc;
			}, {});
	}

	datasource(input: string): Observable<Datasource> {
		let bridgeDb = this;
		return bridgeDb.datasourceMappings$
			.map((mapping) => mapping[input]);
	}

	organisms(): Observable<Datasource> {
		let bridgeDb = this;
		return bridgeDb.getTSV(bridgeDb.config.baseIri + 'contents')
			.map(function(fields) {
				return {
					en: fields[0],
					la: fields[1],
				};
			});
	}

	sourceDataSources(organism: organism): Observable<Datasource> {
		let bridgeDb = this;
		const getDatasource = bridgeDb.datasource.bind(bridgeDb);
		return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/sourceDataSources')
			.map(function(fields) {
				return fields[0];
			})
			.mergeMap(getDatasource);
	}

	targetDataSources(organism: organism): Observable<Datasource> {
		let bridgeDb = this;
		const getDatasource = bridgeDb.datasource.bind(bridgeDb);
		return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/targetDataSources')
			.map(function(fields) {
				return fields[0];
			})
			.mergeMap(getDatasource);
	}
}

