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

import {
  camelCase,
  defaultsDeep,
  fill,
  isArray,
  isEmpty,
  isNaN,
  isNull,
  isString,
  isUndefined,
  omitBy,
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
import "rxjs/add/operator/catch";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/do";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/find";
import "rxjs/add/operator/mergeAll";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/map";
import "rxjs/add/operator/multicast";
import "rxjs/add/operator/reduce";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/timeout";
import "rxjs/add/operator/toArray";
import "rxjs/add/operator/windowWhen";
import "rx-extra/add/operator/throughNodeStream";
import { Subject } from "rxjs/Subject";
import { TSVGetter } from "./topublish/TSVGetter";
import { dataTypeParsers } from "./topublish/dataTypeParsers";
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

const BRIDGE_DB_REPO_CDN = "https://cdn.rawgit.com/bridgedb/BridgeDb/";
const BRIDGE_DB_COMMIT_HASH = "2d248d637ff6fe6285fcf34f89d9fe22a2326a67";
export const CONFIG_DEFAULT = {
  baseIri: "http://webservice.bridgedb.org/",
  context: [
    BRIDGE_DB_REPO_CDN,
    BRIDGE_DB_COMMIT_HASH,
    "/org.bridgedb.bio/resources/org/bridgedb/bio/jsonld-context.jsonld"
  ].join(""),
  dataSourcesHeadersIri: [
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
    timeout: 3 * 1000,
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

const IRI_TO_TERM_MAPPINGS = {
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#about": "id"
};

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

export class BridgeDb {
  config;
  dataSourceMappings$;
  getTSV;
  private xrefsRequestQueue;
  private xrefsResponseQueue;
  constructor(config: Partial<typeof CONFIG_DEFAULT> = CONFIG_DEFAULT) {
    let bridgeDb = this;
    defaultsDeep(config, CONFIG_DEFAULT);
    bridgeDb.config = config;

    let xrefsRequestQueue = (bridgeDb.xrefsRequestQueue = new Subject());
    let debounceSignal = xrefsRequestQueue.debounceTime(
      XREF_REQUEST_DEBOUNCE_TIME
    );

    bridgeDb.xrefsResponseQueue = xrefsRequestQueue
      .windowWhen(() => debounceSignal)
      .map(win => win.toArray())
      .mergeAll()
      .filter(x => !isEmpty(x))
      .mergeMap(function(inputs: any[]) {
        const firstInput = inputs[0];
        const organism = firstInput.organism;
        const conventionalNames = inputs.map(input => input.conventionalName);
        const dbIds = inputs.map(input => input.dbId);
        const dataSourceFilter = firstInput.dataSourceFilter;
        return bridgeDb.xrefsBatch(
          organism,
          conventionalNames,
          dbIds,
          dataSourceFilter
        );
      })
      .multicast(new Subject());

    bridgeDb.xrefsResponseQueue.connect();

    const getTSV = (bridgeDb.getTSV = new TSVGetter(config.http).get);

    bridgeDb.dataSourceMappings$ = Observable.forkJoin(
      getTSV(config.dataSourcesHeadersIri)
        .map(function(fields) {
          const id = fields[4];
          return {
            // NOTE: the column number could be confusing, because it's one-based,
            // so I'll just use the index instead and ignore the column number.
            //column: parseFloat(fields[0]),
            header: fields[1],
            description: fields[2],
            example_entry: fields[3],
            id: id,
            term: IRI_TO_TERM_MAPPINGS.hasOwnProperty(id)
              ? IRI_TO_TERM_MAPPINGS[id]
              : id.split(/[\/|#]/).pop(),
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#datatype": fields[5]
          };
        })
        .toArray(),
      getTSV(config.dataSourcesMetadataIri).toArray()
    )
      .mergeMap(function(results) {
        var metadataByColumnIndex = results[0];
        var rows = results[1];

        return Observable.from(rows).map(function(fields) {
          return fields.reduce(function(acc, field, i) {
            const metadata = metadataByColumnIndex[i];
            acc[metadata.term] = dataTypeParsers[metadata[RDF + "datatype"]](
              field
            );
            return acc;
          }, {});
        });
      })
      .map(function(dataSource) {
        // remove empty properties, ie., properties with these values:
        // ''
        // NaN
        // null
        // undefined
        // TODO what about empty plain object {} or array []

        return omitBy(dataSource, function(value) {
          return (
            value === "" || isNaN(value) || isNull(value) || isUndefined(value)
          );
        });
      })
      .map(function(dataSource: DataSource) {
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
          const regexDbIdPattern = dataSource.hasRegexPattern || ".*";

          dataSource.hasRegexUriPattern = primaryUriPattern.replace(
            "$id",
            // removing ^ (start) and $ (end) from regexDbIdPattern
            "(" + regexDbIdPattern.replace(/(^\^|\$$)/g, "") + ")"
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
          acc[propertyValue] = dataSource;
        });
        return acc;
      }, {})
      .catch(err => {
        throw new VError(err, "Setting up dataSourceMappings$ in constructor");
      })
      .publishReplay();

    // toggle bridgeDb.dataSourceMappings$ from cold to hot
    bridgeDb.dataSourceMappings$.connect();
  } // end constructor

  attributes(organism: organism, conventionalName: string, dbId: string) {
    let bridgeDb = this;
    return bridgeDb
      .getTSV(
        bridgeDb.config.baseIri +
          organism +
          "/attributes/" +
          conventionalName +
          "/" +
          dbId
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
        .catch(err => {
          throw new VError(err, "calling bridgedb.isFreeSearchSupported");
        })
    );
  }

  isMappingSupported(
    organism: organism,
    sourceConventionalName: string,
    targetConventionalName: string
  ): Observable<boolean> {
    let bridgeDb = this;

    const ajaxRequest: AjaxRequest = {
      url: `${bridgeDb.config.baseIri +
        organism}/isMappingSupported/${sourceConventionalName}/${targetConventionalName}`,
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
        .catch(err => {
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
    [dbId, conventionalName, symbol]: [string, string, string | undefined]
  ): Observable<Xref> => {
    let bridgeDb = this;
    if (!dbId || !conventionalName) {
      return Observable.empty();
    }

    return bridgeDb.dataSourceMappings$
      .map(mapping => mapping[conventionalName])
      .map(function(dataSource: DataSource) {
        let xref: Xref = {
          dbId: dbId,
          isDataItemIn: dataSource
        };

        if (symbol) {
          xref.symbol = symbol;
        }

        if (dataSource.hasOwnProperty("id")) {
          xref.id = encodeURI(dataSource.id + xref.dbId);
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
    conventionalName: string,
    dbId: string
  ): Observable<boolean> {
    let bridgeDb = this;

    const ajaxRequest: AjaxRequest = {
      url: `${bridgeDb.config.baseIri +
        organism}/xrefExists/${conventionalName}/${dbId}`,
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
        .catch(err => {
          throw new VError(err, "calling bridgedb.xrefExists");
        })
    );
  }

  xrefs(
    organism: organism,
    conventionalName: string,
    dbId: string,
    dataSourceFilter?: string
  ): Observable<Xref> {
    let bridgeDb = this;
    let xrefsRequestQueue = bridgeDb.xrefsRequestQueue;
    let xrefsResponseQueue = bridgeDb.xrefsResponseQueue;
    const dataSourceFilterParamSection = dataSourceFilter
      ? "?dataSource=" + dataSourceFilter
      : "";

    xrefsRequestQueue.next({
      organism,
      conventionalName,
      dbId,
      dataSourceFilter
    });

    return xrefsResponseQueue
      .filter(function(xrefBatchEnvelope) {
        return (
          xrefBatchEnvelope.organism === organism &&
          // NOTE: we are not using the dataSource test right below. Instead, we are matching
          // dataSources in the mergeMap further below. The reason is that the inputDataSource
          // and the returned dataSource may not match, e.g., 'L' vs. 'Entrez Gene'.
          //x.inputDataSource === conventionalName &&
          xrefBatchEnvelope.inputDbId === dbId &&
          (!dataSourceFilter ||
            xrefBatchEnvelope.dataSourceFilter === dataSourceFilter)
        );
      })
      .find(function(xrefBatchEnvelope) {
        return Observable.zip(
          bridgeDb.dataSourceMappings$.map(
            mapping =>
              mapping[xrefBatchEnvelope.inputDataSource].conventionalName
          ),
          bridgeDb.dataSourceMappings$.map(
            mapping => mapping[conventionalName].conventionalName
          ),
          function(
            inputDataSourceAsConventionalName,
            conventionalNameAsConventionalName
          ) {
            return (
              inputDataSourceAsConventionalName ===
              conventionalNameAsConventionalName
            );
          }
        );
      })
      .mergeMap(x => Observable.from(x.xrefs))
      .catch(err => {
        throw new VError(err, "calling bridgedb.xrefs");
      });
  }

  xrefsBatch = (
    organism: organism,
    conventionalNameOrNames: string | string[],
    dbIds: string[],
    dataSourceFilter?: string
  ): Observable<{
    organism: string;
    inputDbId: string;
    inputDataSource: string;
    xrefs: Xref[];
    dataSourceFilter?: string;
  }> => {
    let bridgeDb = this;
    const dataSourceFilterParamSection = dataSourceFilter
      ? "?dataSource=" + dataSourceFilter
      : "";

    const conventionalNames = isArray(conventionalNameOrNames)
      ? conventionalNameOrNames
      : fill(new Array(dbIds.length), conventionalNameOrNames);

    const body = zip(dbIds, conventionalNames)
      .map(x => x.join("\t"))
      .join("\n");

    const callString = `Called xrefsBatch(
	${organism},
	${conventionalNameOrNames},
	${dbIds},
	${dataSourceFilter}
)`;

    if (isEmpty(body.replace(/[\ \n\t]/g, ""))) {
      return Observable.throw(new Error(`Error: body is empty. ${callString}`));
    }

    const postURL =
      bridgeDb.config.baseIri +
      organism +
      "/xrefsBatch" +
      dataSourceFilterParamSection;

    return bridgeDb
      .getTSV(postURL, "POST", body)
      .mergeMap(function(xrefStringsByInput) {
        const inputDbId = xrefStringsByInput[0];
        const inputDataSource = xrefStringsByInput[1];
        const xrefsString = xrefStringsByInput[2];

        // NOTE: splitting by comma, e.g.:
        //       'T:GO:0031966,Il:ILMN_1240829' -> ['T:GO:0031966', 'Il:ILMN_1240829']
        return Observable.from(xrefsString.split(","))
          .mergeMap(function(xrefString: string): Observable<Xref> {
            if (xrefString === "N/A") {
              return Observable.empty();
            }
            // NOTE: splitting by FIRST colon only, e.g.:
            //       'T:GO:0031966' -> ['T', 'GO:0031966']
            let xrefFields = xrefString.split(/:(.+)/);
            return bridgeDb.parseXrefRow([
              xrefFields[1],
              xrefFields[0],
              undefined
            ]);
          })
          .toArray()
          .map(function(xrefs) {
            return {
              organism: organism,
              inputDataSource: inputDataSource,
              inputDbId: inputDbId,
              xrefs: xrefs,
              dataSourceFilter: dataSourceFilter
            };
          });
      })
      .catch(null, function(err) {
        throw new VError(err, `Error: ${callString}`);
      });
  };
}
