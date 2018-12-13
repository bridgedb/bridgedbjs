/// <reference path="../typings/index.d.ts" />

// TODO use a cache, such as
// https://github.com/levelgraph/levelgraph

import "source-map-support/register";

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

if (!global.hasOwnProperty("XMLHttpRequest")) {
  global.XMLHttpRequest = require("xhr2");
}

import { curry, negate } from "lodash/fp";
import {
  camelCase,
  defaultsDeep,
  fill,
  invert,
  isArray,
  isEmpty,
  isNaN,
  isNull,
  isString,
  isUndefined,
  omitBy,
  toPairs,
  zip
} from "lodash";
import { Observable } from "rxjs/Observable";
// TODO should I need to import the interface type definition like this?
import { AjaxRequest } from "rxjs/observable/dom/AjaxObservable";
import "rxjs/add/observable/dom/ajax";
import "rxjs/add/observable/empty";
import "rxjs/add/observable/forkJoin";
import "rxjs/add/observable/from";
import "rxjs/add/observable/throw";
import "rxjs/add/observable/zip";
import "rxjs/add/operator/buffer";
import "rxjs/add/operator/bufferWhen";
import "rxjs/add/operator/catch";
import "rxjs/add/operator/concatAll";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/delay";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/do";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/find";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/map";
import "rxjs/add/operator/multicast";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/race";
import "rxjs/add/operator/reduce";
import "rxjs/add/operator/skip";
import "rxjs/add/operator/toArray";
import "rx-extra/add/operator/throughNodeStream";
import { Subject } from "rxjs/Subject";
import { TSVGetter } from "./spinoffs/TSVGetter";
import { dataTypeParsers } from "./spinoffs/dataTypeParsers";
import { arrayify, unionLSV } from "./spinoffs/jsonld-utils";
const VError = require("verror");

const BDB = "http://vocabularies.bridgedb.org/ops#";
const BIOPAX = "http://www.biopax.org/release/biopax-level3.owl#";
const IDENTIFIERS = "http://identifiers.org/";
const OWL = "http://www.w3.org/2002/07/owl#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

const CSV_OPTIONS = { objectMode: true, delimiter: "\t" };

// time to wait for no new calls to xrefs() before we
// batch up all calls in the queue and send to xrefsBatch()
const XREF_REQUEST_DEBOUNCE_TIME = 10; // ms
const XREF_REQUEST_CHUNK_SIZE = 100;

const BRIDGE_DB_REPO_CDN = "https://cdn.rawgit.com/bridgedb/BridgeDb/";
const BRIDGE_DB_COMMIT_HASH = "2d248d637ff6fe6285fcf34f89d9fe22a2326a67";
export const CONFIG_DEFAULT = {
  baseIri: "https://webservice.bridgedb.org/",
  context: [
    BRIDGE_DB_REPO_CDN,
    BRIDGE_DB_COMMIT_HASH,
    "/org.bridgedb.bio/resources/org/bridgedb/bio/jsonld-context.jsonld"
  ].join(""),
  dataSourcesMetadataHeadersIri: [
    BRIDGE_DB_REPO_CDN,
    BRIDGE_DB_COMMIT_HASH,
    "/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt"
  ].join(""),
  dataSourcesMetadataIri: [
    BRIDGE_DB_REPO_CDN,
    BRIDGE_DB_COMMIT_HASH,
    "/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt"
  ].join(""),
  http: {
    timeout: 4 * 1000,
    retryLimit: 2,
    retryDelay: 3 * 1000
  }
};

// these properties can be trusted to
// uniquely identify a data source.
const DATASOURCE_ID_PROPERTIES = [
  "id",
  "miriamUrn",
  "conventionalName",
  "preferredPrefix",
  "systemCode"
];

const IRI_TO_NAME = {
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#about": "id",
  "http://identifiers.org/idot/preferredPrefix": "preferredPrefix",
  "http://identifiers.org/miriam.collection/": "miriamUrn"
};
const NAME_TO_IRI = invert(IRI_TO_NAME);

/**
 * miriamUrnToIdentifiersIri
 *
 * @param {string} miriamUrn
 * @return {string} e.g., "http://identifiers.org/ncbigene/"
 */
function miriamUrnToIdentifiersIri(miriamUrn: string): string {
  const preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
  if (preferredPrefix) {
    return IDENTIFIERS + preferredPrefix + "/";
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
  if (miriamUrn.indexOf("urn:miriam:") > -1) {
    return miriamUrn.substring(11, miriamUrn.length);
  }
}

export interface DataSourcesMetadataHeaderRow {
  header: string;
  description: string;
  example_entry: string;
  id: string;
  name: string;
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#datatype": string;
}

export class BridgeDb {
  config;
  dataSourceMappings$;
  //dataSourcesMetadataHeaderNameToIri$;
  getTSV;
  private xrefsRequestQueue;
  private xrefsResponseQueue;
  constructor(config: Partial<typeof CONFIG_DEFAULT> = CONFIG_DEFAULT) {
    let bridgeDb = this;
    defaultsDeep(config, CONFIG_DEFAULT);
    bridgeDb.config = config;

    var xrefsRequestQueue = (bridgeDb.xrefsRequestQueue = new Subject());
    var debounceSignel = xrefsRequestQueue.debounceTime(
      XREF_REQUEST_DEBOUNCE_TIME
    );

    bridgeDb.xrefsResponseQueue = xrefsRequestQueue
      .filter(
        ({ organism, xrefDataSource, xrefIdentifier }) =>
          !isEmpty(organism) &&
          !isEmpty(xrefDataSource) &&
          !isEmpty(xrefIdentifier)
      )
      /* TODO should we use this? It doesn't seem to work, and we could just use caching.
      .distinctUntilChanged(function(
        a: { xrefDataSource; xrefIdentifier },
        b: { xrefDataSource; xrefIdentifier }
      ) {
        return JSON.stringify(a) === JSON.stringify(b);
      })
      //*/
      //.buffer(Observable.race(debounceSignel, xrefsRequestQueue.skip(2000)))
      .bufferWhen(() =>
        Observable.race(debounceSignel, xrefsRequestQueue.skip(2000))
      )
      .filter(x => !isEmpty(x))
      .mergeMap(function(
        inputs: {
          organism: organism;
          xrefDataSource: string;
          xrefIdentifier: string;
          desiredXrefDataSources?: string[];
        }[]
      ) {
        const firstInput = inputs[0];
        const organism = firstInput.organism;
        const xrefDataSources = inputs.map(input => input.xrefDataSource);
        const xrefIdentifiers = inputs.map(input => input.xrefIdentifier);
        const desiredXrefDataSources = firstInput.desiredXrefDataSources;
        return bridgeDb.xrefsBatch(
          organism,
          xrefDataSources,
          xrefIdentifiers,
          desiredXrefDataSources
        );
      })
      .multicast(new Subject());

    // toggle from cold to hot
    bridgeDb.xrefsResponseQueue.connect();

    const getTSV = (bridgeDb.getTSV = new TSVGetter(config.http).get);

    const dataSourcesMetadataHeaders$ = getTSV(
      config.dataSourcesMetadataHeadersIri
    ).map(function(fields): DataSourcesMetadataHeaderRow {
      const id = fields[4];
      return {
        // NOTE: the column number could be confusing, because it's one-based,
        // so I'll just use the index instead and ignore the column number.
        //column: parseFloat(fields[0]),
        header: fields[1],
        description: fields[2],
        example_entry: fields[3],
        id: id,
        name: IRI_TO_NAME.hasOwnProperty(id)
          ? IRI_TO_NAME[id]
          : id.split(/[\/|#]/).pop(),
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#datatype": fields[5]
      };
    });

    bridgeDb.dataSourceMappings$ = Observable.forkJoin(
      dataSourcesMetadataHeaders$.toArray(),
      getTSV(config.dataSourcesMetadataIri).toArray()
    )
      .mergeMap(function(results) {
        var metadataByColumnIndex = results[0];
        var rows = results[1];

        return Observable.from(rows).map(function(fields) {
          return fields.reduce(function(acc, field, i) {
            const metadata = metadataByColumnIndex[i];
            const { id, name } = metadata;
            // NOTE: side effects
            if (!!id && !(id in IRI_TO_NAME)) {
              IRI_TO_NAME[id] = name;
              NAME_TO_IRI[name] = id;
            }
            acc[name] = dataTypeParsers[metadata[RDF + "datatype"]](field);
            return acc;
          }, ({} as DataSource));
        });
      })
      .map(function(dataSource: DataSource): DataSource {
        // remove empty properties, ie., properties with these values:
        // ''
        // NaN
        // null
        // undefined
        // TODO what about empty plain object {} or array []

        return (omitBy(dataSource, function(value: any): boolean {
          return (
            value === "" || isNaN(value) || isNull(value) || isUndefined(value)
          );
        }) as DataSource);
      })
      .map(function(dataSource: DataSource) {
        // Kludge to temporarily handle this issue:
        // https://github.com/bridgedb/BridgeDb/issues/58
        if (dataSource.id === "Sp") {
          dataSource.id = "urn:miriam:uniprot";
        }
        // If the Miriam URN is unknown or unspecified, datasources.txt uses
        // the BridgeDb system code as a placeholder value.
        // So here we make sure "id" is actually a Miriam URN.
        if (
          dataSource.hasOwnProperty("id") &&
          dataSource.id.indexOf("urn:miriam:") > -1
        ) {
          // switch "id" property from Miriam URN to identifiers.org IRI
          const miriamUrn = dataSource.id;
          dataSource.miriamUrn = miriamUrn;
          const preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
          if (preferredPrefix) {
            dataSource.preferredPrefix = preferredPrefix;

            dataSource.sameAs = dataSource.sameAs || [];
            dataSource.sameAs.push(miriamUrn);

            const identifiersIri = miriamUrnToIdentifiersIri(miriamUrn);
            if (identifiersIri) {
              dataSource.id = dataSource.hasIdentifiersOrgPattern = identifiersIri;
            }
          }
        } else {
          delete dataSource.id;
        }
        return dataSource;
      })
      .map(function(dataSource: DataSource) {
        const primaryUriPattern = dataSource.hasPrimaryUriPattern;
        if (!!primaryUriPattern) {
          const regexXrefIdentifierPattern = dataSource.hasRegexPattern || ".*";

          dataSource.hasRegexUriPattern = primaryUriPattern.replace(
            "$id",
            // removing ^ (start) and $ (end) from regexXrefIdentifierPattern
            "(" + regexXrefIdentifierPattern.replace(/(^\^|\$$)/g, "") + ")"
          );

          // if '$id' is at the end of the primaryUriPattern
          var indexOfDollaridWhenAtEnd = primaryUriPattern.length - 3;
          if (primaryUriPattern.indexOf("$id") === indexOfDollaridWhenAtEnd) {
            dataSource.sameAs = dataSource.sameAs || [];
            dataSource.sameAs.push(
              primaryUriPattern.substr(0, indexOfDollaridWhenAtEnd)
            );
          }
        }

        if (dataSource.type) {
          dataSource[BDB + "type"] = dataSource.type;
        }
        dataSource.type = "Dataset";

        return dataSource;
      })
      .map(function(dataSource) {
        const bdbType = dataSource[BDB + "type"];
        if (!!bdbType) {
          dataSource.subject = [];
          /* Example of using 'subject' (from the VOID docs <http://www.w3.org/TR/void/#subject>):
							:Bio2RDF a void:Dataset;
									dcterms:subject <http://purl.uniprot.org/core/Gene>;
									.

					The closest concepts from the WP, BioPAX and MESH vocabularies are included below,
				  with the default vocabulary being WP.

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
          if (
            bdbType === "gene" ||
            // TODO should the following two conditions be removed?
            bdbType === "probe" ||
            dataSource.preferredPrefix === "go"
          ) {
            dataSource.subject.push("GeneProduct");
            dataSource.subject.push(BIOPAX + "DnaReference");
          } else if (bdbType === "rna") {
            dataSource.subject.push("Rna");
            dataSource.subject.push(BIOPAX + "RnaReference");
          } else if (bdbType === "protein") {
            dataSource.subject.push("Protein");
            dataSource.subject.push(BIOPAX + "ProteinReference");
          } else if (bdbType === "metabolite") {
            dataSource.subject.push("Metabolite");
            dataSource.subject.push(BIOPAX + "SmallMoleculeReference");
          } else if (bdbType === "pathway") {
            // BioPAX does not have a term for pathways that is analogous to
            // biopax:ProteinReference for proteins.
            dataSource.subject.push("Pathway");
            dataSource.subject.push(BIOPAX + "Pathway");
          } else if (bdbType === "ontology") {
            dataSource.subject.push(OWL + "Ontology");
          } else if (bdbType === "interaction") {
            dataSource.subject.push("Interaction");
            dataSource.subject.push(BIOPAX + "Interaction");
          }
        }

        dataSource.alternatePrefix = [dataSource.systemCode];

        return dataSource;
      })
      .reduce(function(acc, dataSource) {
        DATASOURCE_ID_PROPERTIES.forEach(function(propertyName) {
          const propertyValue = dataSource[propertyName];
          const propertyId = NAME_TO_IRI[propertyName];
          dataSource[propertyId] = propertyValue;
          acc[propertyValue] = dataSource;
        });
        return acc;
      }, {})
      .catch(err => {
        throw new VError(err, "Setting up dataSourceMappings$ in constructor");
      })
      .publishReplay();

    // toggle from cold to hot
    bridgeDb.dataSourceMappings$.connect();
  } // end constructor

  attributes(
    organism: organism,
    xrefDataSource: string,
    xrefIdentifier: string
  ) {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(
        bridgeDb.config.baseIri +
          organism +
          "/attributes/" +
          xrefDataSource +
          "/" +
          xrefIdentifier
      )
      .reduce(function(acc, fields) {
        const key = camelCase(fields[0]);
        const value = fields[1];
        acc[key] = value;
        return acc;
      }, {})
      .catch(err => {
        throw new VError(err, "calling bridgedb.attributes");
      });
  }

  attributeSearch(
    organism: organism,
    query: string,
    attrName?: string
  ): Observable<Xref> {
    let bridgeDb = this;
    const attrNameParamSection = attrName ? "?attrName=" + attrName : "";
    return bridgeDb
      .getTSV(
        bridgeDb.config.baseIri +
          organism +
          "/attributeSearch/" +
          query +
          attrNameParamSection
      )
      .mergeMap(bridgeDb.parseXrefRow)
      .catch(err => {
        throw new VError(err, "calling bridgedb.attributeSearch");
      });
  }

  attributeSet(organism: organism): Observable<string[]> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + organism + "/attributeSet")
      .reduce(function(acc, row) {
        acc.push(row[0]);
        return acc;
      }, [])
      .catch(err => {
        throw new VError(err, "calling bridgedb.attributeSet");
      });
  }

  convertXrefDataSourceTo = curry(
    (targetType: string, input: string): Observable<string> => {
      let bridgeDb = this;
      return bridgeDb.dataSourceMappings$
        .map(function(mapping) {
          return !!mapping[input] && mapping[input][targetType];
        })
        .catch(err => {
          throw new VError(err, "calling bridgedb.convertXrefDataSourceTo");
        });
    }
  );

  identifyHeaderNameForXrefDataSource = (input: string): Observable<string> => {
    let bridgeDb = this;
    return bridgeDb.dataSourceMappings$
      .map(mapping => mapping[input])
      .filter(negate(isEmpty))
      .map(dataSource => {
        return toPairs(dataSource)
          .filter(([key, value]) => value === input)
          .map(([key, value]) => key)
          .reduce(function(acc: string, key: string): string {
            // we want to return the IRI, if it's available.
            return acc.length > key.length ? acc : key;
          });
      })
      .catch(err => {
        throw new VError(
          err,
          "calling bridgedb.identifyHeaderNameForXrefDataSource"
        );
      });
  };

  dataSourceProperties = (input: string): Observable<DataSource> => {
    let bridgeDb = this;
    return bridgeDb.dataSourceMappings$
      .map(mapping => mapping[input])
      .catch(err => {
        throw new VError(err, "calling bridgedb.dataSourceProperties");
      });
  };

  isFreeSearchSupported(organism: organism): Observable<boolean> {
    let bridgeDb = this;

    const ajaxRequest: AjaxRequest = {
      url: bridgeDb.config.baseIri + organism + "/isFreeSearchSupported",
      method: "GET",
      responseType: "text",
      timeout: bridgeDb.config.http.timeout,
      crossDomain: true
    };
    return (
      Observable.ajax(ajaxRequest)
        .map((ajaxResponse): string => ajaxResponse.xhr.response)
        // NOTE: must compare with 'true' as a string, because the response is just a string, not a parsed JS boolean.
        .map(res => res === "true")
        // TODO is this TS correct?
        .catch((err): Observable<any> => {
          throw new VError(err, "calling bridgedb.isFreeSearchSupported");
        })
    );
  }

  isMappingSupported(
    organism: organism,
    sourceXrefDataSource: string,
    targetXrefDataSource: string
  ): Observable<boolean> {
    let bridgeDb = this;

    const ajaxRequest: AjaxRequest = {
      url: `${bridgeDb.config.baseIri +
        organism}/isMappingSupported/${sourceXrefDataSource}/${targetXrefDataSource}`,
      method: "GET",
      responseType: "text",
      timeout: bridgeDb.config.http.timeout,
      crossDomain: true
    };
    return (
      Observable.ajax(ajaxRequest)
        .map((ajaxResponse): string => ajaxResponse.xhr.response)
        // NOTE: must compare with 'true' as a string, because the response is just a string, not a parsed JS boolean.
        .map(res => res === "true")
        // TODO is this TS correct?
        .catch((err): Observable<any> => {
          throw new VError(err, "calling bridgedb.isMappingSupported");
        })
    );
  }

  organismProperties(organism: organism): Observable<{}> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + organism + "/properties")
      .reduce(function(acc, fields) {
        const key = camelCase(fields[0]);
        const value = fields[1];
        acc[key] = value;
        return acc;
      }, {})
      .catch(err => {
        throw new VError(err, "calling bridgedb.organismProperties");
      });
  }

  organisms(): Observable<{}> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + "contents")
      .map(function(fields) {
        return {
          en: fields[0],
          la: fields[1]
        };
      })
      .catch(err => {
        throw new VError(err, "calling bridgedb.organisms");
      });
  }

  private parseXrefRow = (
    [xrefIdentifier, dataSourceConventionalName, symbol]: [
      string,
      string,
      string | undefined
    ]
  ): Observable<Xref> => {
    let bridgeDb = this;
    if (!xrefIdentifier || !dataSourceConventionalName) {
      return Observable.empty();
    }

    return bridgeDb.dataSourceMappings$
      .map(mapping => mapping[dataSourceConventionalName])
      .map(function(dataSource: DataSource) {
        let xref: Xref = {
          xrefIdentifier: xrefIdentifier,
          isDataItemIn: dataSource
        };

        if (symbol) {
          xref.symbol = symbol;
        }

        if (dataSource.hasOwnProperty("id")) {
          xref.id = encodeURI(dataSource.id + xref.xrefIdentifier);
        }

        return xref;
      });
  };

  search(organism: organism, query: string): Observable<Xref> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + organism + "/search/" + query)
      .mergeMap(bridgeDb.parseXrefRow)
      .catch(err => {
        throw new VError(err, "calling bridgedb.search");
      });
  }

  sourceDataSources(organism: organism): Observable<DataSource> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + organism + "/sourceDataSources")
      .map(function(fields) {
        return fields[0];
      })
      .mergeMap(bridgeDb.dataSourceProperties)
      .catch(err => {
        throw new VError(err, "calling bridgedb.sourceDataSources");
      });
  }

  targetDataSources(organism: organism): Observable<DataSource> {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(bridgeDb.config.baseIri + organism + "/targetDataSources")
      .map(function(fields) {
        return fields[0];
      })
      .mergeMap(bridgeDb.dataSourceProperties)
      .catch(err => {
        throw new VError(err, "calling bridgedb.targetDataSources");
      });
  }

  // TODO check whether dataSource exists before calling webservice re:
  // dataSource AND identifier
  xrefExists(
    organism: organism,
    xrefDataSource: string,
    xrefIdentifier: string
  ): Observable<boolean> {
    let bridgeDb = this;

    const ajaxRequest: AjaxRequest = {
      url: `${bridgeDb.config.baseIri +
        organism}/xrefExists/${xrefDataSource}/${xrefIdentifier}`,
      method: "GET",
      responseType: "text",
      timeout: bridgeDb.config.http.timeout,
      crossDomain: true
    };
    return (
      Observable.ajax(ajaxRequest)
        .map((ajaxResponse): string => ajaxResponse.xhr.response)
        // NOTE: must compare with 'true' as a string, because the response is just a string, not a parsed JS boolean.
        .map(res => res === "true")
        // TODO is this TS correct?
        .catch((err): Observable<any> => {
          throw new VError(err, "calling bridgedb.xrefExists");
        })
    );
  }

  xrefs(
    organism: organism,
    xrefDataSource: string,
    xrefIdentifier: string,
    desiredXrefDataSourceOrSources?: string
  ): Observable<Xref> {
    let bridgeDb = this;
    let xrefsRequestQueue = bridgeDb.xrefsRequestQueue;
    let xrefsResponseQueue = bridgeDb.xrefsResponseQueue;
    const desiredXrefDataSources = arrayify(desiredXrefDataSourceOrSources);

    xrefsRequestQueue.next({
      organism,
      xrefDataSource,
      xrefIdentifier,
      desiredXrefDataSources
    });

    return (
      xrefsResponseQueue
        .find(function(xrefBatchEnvelope) {
          return (
            xrefBatchEnvelope.organism === organism &&
            // NOTE: we are not using the dataSource test in the line below.
            // Instead, we are matching dataSources in the mergeMap further below.
            // The reason is that the inputXrefDataSource and the returned dataSource
            // may not match, e.g., 'L' vs. 'Entrez Gene'.
            xrefBatchEnvelope.inputXrefDataSource === xrefDataSource &&
            xrefBatchEnvelope.inputXrefIdentifier === xrefIdentifier &&
            xrefBatchEnvelope.desiredXrefDataSources.join() ===
              desiredXrefDataSources.join()
          );
        })
        .map(x => x.xrefs)
        //.do(null, xrefsRequestQueue.complete)
        .catch(err => {
          throw new VError(err, "calling bridgedb.xrefs");
        })
    );
  }

  xrefsBatch = (
    organism: organism,
    oneOrMoreXrefDataSources: string | string[],
    xrefIdentifiers: string[],
    desiredXrefDataSourceOrSources?: string | string[]
  ): Observable<{
    organism: string;
    inputXrefIdentifier: string;
    inputXrefDataSource: string;
    xrefs: Xref[];
  }> => {
    let bridgeDb = this;
    const desiredXrefDataSources = arrayify(
      desiredXrefDataSourceOrSources
    ) as string[];
    const dataSourceFilterParamSection = desiredXrefDataSources.length === 1
      ? "?dataSource=" + desiredXrefDataSources[0]
      : "";

    const xrefDataSources = isArray(oneOrMoreXrefDataSources)
      ? oneOrMoreXrefDataSources
      : fill(new Array(xrefIdentifiers.length), oneOrMoreXrefDataSources);

    const convertXrefDataSourceToConventionalName = bridgeDb.convertXrefDataSourceTo(
      "conventionalName"
    );

    const callString = `Called xrefsBatch(
	${organism},
	${oneOrMoreXrefDataSources},
	${xrefIdentifiers},
	${desiredXrefDataSourceOrSources}
)`;

    const postURL =
      bridgeDb.config.baseIri +
      organism +
      "/xrefsBatch" +
      dataSourceFilterParamSection;

    const inputXrefDataSourceHeaderName$ = Observable.from(xrefDataSources)
      .mergeMap(function(xrefDataSource) {
        return bridgeDb.identifyHeaderNameForXrefDataSource(xrefDataSource);
      })
      .find(isString);

    const desiredXrefDataSourceHeaderName$ = isEmpty(desiredXrefDataSources)
      ? inputXrefDataSourceHeaderName$
      : Observable.from(desiredXrefDataSources)
          .mergeMap(function(xrefDataSource) {
            return bridgeDb.identifyHeaderNameForXrefDataSource(xrefDataSource);
          })
          .find(isString);

    const dataSourceConventionalNames$ = Observable.from(xrefDataSources)
      .mergeMap(function(xrefDataSource) {
        return convertXrefDataSourceToConventionalName(xrefDataSource);
      })
      .toArray();

    return Observable.forkJoin(
      inputXrefDataSourceHeaderName$,
      desiredXrefDataSourceHeaderName$,
      dataSourceConventionalNames$
    ).mergeMap(function(
      [
        inputXrefDataSourceHeaderName,
        desiredXrefDataSourceHeaderName,
        dataSourceConventionalNames
      ]
    ) {
      const body = zip(xrefIdentifiers, dataSourceConventionalNames)
        .filter(pair => !!pair[1])
        .map(x => x.join("\t"))
        .join("\n");

      if (isEmpty(body.replace(/[\ \n\t]/g, ""))) {
        return Observable.throw(
          new Error(`Error: body is empty. ${callString}`)
        );
      }

      const convertXrefDataSourceToInputFormat = bridgeDb.convertXrefDataSourceTo(
        inputXrefDataSourceHeaderName
      );
      const convertXrefDataSourceToDesiredInputFormat = bridgeDb.convertXrefDataSourceTo(
        desiredXrefDataSourceHeaderName
      );

      return bridgeDb
        .getTSV(postURL, "POST", body)
        .mergeMap(function(xrefStringsByInput) {
          const inputXrefIdentifier = xrefStringsByInput[0];
          const inputXrefDataSource = xrefStringsByInput[1];
          const xrefsString = xrefStringsByInput[2];

          // NOTE: splitting by comma, e.g.:
          //       'T:GO:0031966,Il:ILMN_1240829' -> ['T:GO:0031966', 'Il:ILMN_1240829']
          return Observable.from(xrefsString.split(","))
            .mergeMap(function(
              xrefString: string
            ): Observable<Record<"xrefDataSource" | "xrefIdentifier", string>> {
              if (xrefString === "N/A") {
                return Observable.empty();
              }

              // NOTE: splitting by FIRST colon only, e.g.:
              //       'T:GO:0031966' -> ['T', 'GO:0031966']
              const [
                returnedXrefDataSource,
                returnedXrefIdentifier
              ] = xrefString.split(/:(.+)/);

              return convertXrefDataSourceToDesiredInputFormat(
                returnedXrefDataSource
              ).map(function(desiredXrefDataSource) {
                return {
                  xrefDataSource: desiredXrefDataSource,
                  xrefIdentifier: returnedXrefIdentifier
                };
              });
            })
            .filter(({ xrefDataSource }) => {
              return (
                !isEmpty(xrefDataSource) &&
                (desiredXrefDataSources.length === 0 ||
                  desiredXrefDataSources.indexOf(xrefDataSource) > -1)
              );
            })
            .toArray()
            .mergeMap(function(xrefs) {
              if (desiredXrefDataSources.length > 0) {
                // Sort xrefs in the order matching the order that the user specified
                // in desiredXrefDataSource1, desiredXrefDataSource2, ...
                xrefs.sort(function(a, b) {
                  const aIndex = desiredXrefDataSources.indexOf(
                    a.xrefDataSource
                  );
                  const bIndex = desiredXrefDataSources.indexOf(
                    b.xrefDataSource
                  );
                  if (aIndex < bIndex) {
                    return -1;
                  } else if (aIndex > bIndex) {
                    return 1;
                  } else {
                    return 0;
                  }
                });
              }

              return convertXrefDataSourceToInputFormat(
                inputXrefDataSource
              ).map(function(inputXrefDataSource) {
                return {
                  organism,
                  inputXrefDataSource,
                  inputXrefIdentifier,
                  xrefs,
                  // NOTE: return desiredXrefDataSources for use in xrefsResponseQueue
                  desiredXrefDataSources
                };
              });
            });
        })
        .catch(null, function(err) {
          throw new VError(err, `Error: ${callString}`);
        });
    });
  };
}
