var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
System.register("src/main", ["lodash", "rxjs/Observable", "rxjs/add/observable/dom/ajax", "rxjs/add/observable/empty", "rxjs/add/observable/forkJoin", "rxjs/add/observable/from", "rxjs/add/observable/zip", "rxjs/add/operator/debounceTime", "rxjs/add/operator/do", "rxjs/add/operator/filter", "rxjs/add/operator/find", "rxjs/add/operator/mergeAll", "rxjs/add/operator/mergeMap", "rxjs/add/operator/map", "rxjs/add/operator/multicast", "rxjs/add/operator/reduce", "rxjs/add/operator/publishReplay", "rxjs/add/operator/timeout", "rxjs/add/operator/toArray", "rxjs/add/operator/windowWhen", "rx-extra/add/operator/throughNodeStream", "rxjs/Subject"], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    /**
     * miriamUrnToIdentifiersIri
     *
     * @param {string} miriamUrn
     * @return {string} e.g., "http://identifiers.org/ncbigene/"
     */
    function miriamUrnToIdentifiersIri(miriamUrn) {
        var preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
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
    function miriamUrnToPreferredPrefix(miriamUrn) {
        // Make sure it's actually an identifiers.org namespace,
        // not a BridgeDb system code:
        if (miriamUrn.indexOf('urn:miriam:') > -1) {
            return miriamUrn.substring(11, miriamUrn.length);
        }
    }
    var lodash_1, Observable_1, Subject_1, csv, BDB, BIOPAX, IDENTIFIERS, OWL, RDF, CSV_OPTIONS, XREF_REQUEST_DEBOUNCE_TIME, BRIDGE_DB_REPO_CDN, BRIDGE_DB_COMMIT_HASH, CONFIG_DEFAULT, DATASOURCE_ID_PROPERTIES, parseAsDatatype, BridgeDb;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (Observable_1_1) {
                Observable_1 = Observable_1_1;
            },
            function (_1) {
            },
            function (_2) {
            },
            function (_3) {
            },
            function (_4) {
            },
            function (_5) {
            },
            function (_6) {
            },
            function (_7) {
            },
            function (_8) {
            },
            function (_9) {
            },
            function (_10) {
            },
            function (_11) {
            },
            function (_12) {
            },
            function (_13) {
            },
            function (_14) {
            },
            function (_15) {
            },
            function (_16) {
            },
            function (_17) {
            },
            function (_18) {
            },
            function (_19) {
            },
            function (Subject_1_1) {
                Subject_1 = Subject_1_1;
            }
        ],
        execute: function () {
            if (!global.hasOwnProperty('XMLHttpRequest')) {
                global.XMLHttpRequest = require('xhr2');
            }
            csv = require('csv-streamify');
            BDB = 'http://vocabularies.bridgedb.org/ops#';
            BIOPAX = 'http://www.biopax.org/release/biopax-level3.owl#';
            IDENTIFIERS = 'http://identifiers.org/';
            OWL = 'http://www.w3.org/2002/07/owl#';
            RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
            CSV_OPTIONS = { objectMode: true, delimiter: '\t' };
            // time to wait for no new calls to xrefs() before we
            // batch up all calls in the queue and send to xrefsBatch()
            XREF_REQUEST_DEBOUNCE_TIME = 10; // ms
            BRIDGE_DB_REPO_CDN = 'https://cdn.rawgit.com/bridgedb/BridgeDb/';
            BRIDGE_DB_COMMIT_HASH = '7bb5058221eb3537a2c04965089de1521a5ed691';
            exports_1("CONFIG_DEFAULT", CONFIG_DEFAULT = {
                baseIri: 'http://webservice.bridgedb.org/',
                context: [
                    BRIDGE_DB_REPO_CDN,
                    BRIDGE_DB_COMMIT_HASH,
                    '/org.bridgedb.bio/resources/org/bridgedb/bio/jsonld-context.jsonld',
                ].join(''),
                dataSourcesHeadersIri: [
                    BRIDGE_DB_REPO_CDN,
                    BRIDGE_DB_COMMIT_HASH,
                    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt',
                ].join(''),
                dataSourcesMetadataIri: [
                    BRIDGE_DB_REPO_CDN,
                    BRIDGE_DB_COMMIT_HASH,
                    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
                ].join(''),
                http: {
                    timeout: 3 * 1000,
                    retryLimit: 2,
                    retryDelay: 3 * 1000
                }
            });
            // these properties can be trusted to
            // uniquely identify a data source.
            DATASOURCE_ID_PROPERTIES = [
                'about',
                'miriamUrn',
                'conventionalName',
                'preferredPrefix',
                'systemCode',
            ];
            parseAsDatatype = {
                'http://www.w3.org/2001/XMLSchema#string': String,
                'http://www.w3.org/2001/XMLSchema#anyURI': String,
                // parseFloat when isString in order to handle cases like '0', which should be parsed as false
                'http://www.w3.org/2001/XMLSchema#boolean': function (x) {
                    return Boolean(lodash_1.isString(x) ? parseFloat(x) : x);
                },
                'http://www.w3.org/2001/XMLSchema#integer': parseInt,
                'http://www.w3.org/2001/XMLSchema#float': parseFloat,
            };
            BridgeDb = (function () {
                function BridgeDb(config) {
                    if (config === void 0) { config = CONFIG_DEFAULT; }
                    var _this = this;
                    this.dataSourceProperties = function (input) {
                        var bridgeDb = _this;
                        return bridgeDb.dataSourceMappings$
                            .map(function (mapping) { return mapping[input]; });
                    };
                    this.parseXrefRow = function (_a) {
                        var identifier = _a[0], conventionalName = _a[1], symbol = _a[2];
                        var bridgeDb = _this;
                        if (!identifier || !conventionalName) {
                            return Observable_1.Observable.empty();
                        }
                        return bridgeDb.dataSourceMappings$
                            .map(function (mapping) { return mapping[conventionalName]; })
                            .map(function (dataSource) {
                            var xref = {
                                identifier: identifier,
                                isDataItemIn: dataSource
                            };
                            if (symbol) {
                                xref.symbol = symbol;
                            }
                            if (dataSource.hasOwnProperty('about')) {
                                xref.about = encodeURI(dataSource.about + xref.identifier);
                            }
                            return xref;
                        });
                    };
                    this.xrefsBatch = function (organism, conventionalNameOrNames, identifiers, dataSourceFilter) {
                        var bridgeDb = _this;
                        var dataSourceFilterParamSection = dataSourceFilter ? '?dataSource=' + dataSourceFilter : '';
                        var conventionalNames = lodash_1.isArray(conventionalNameOrNames) ?
                            conventionalNameOrNames : lodash_1.fill(new Array(identifiers.length), conventionalNameOrNames);
                        var body = lodash_1.zip(identifiers, conventionalNames)
                            .map(function (x) { return x.join('\t'); })
                            .join('\n');
                        return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/xrefsBatch' + dataSourceFilterParamSection, 'POST', body)
                            .mergeMap(function (xrefStringsByInput) {
                            var inputIdentifier = xrefStringsByInput[0];
                            var inputDataSource = xrefStringsByInput[1];
                            var xrefsString = xrefStringsByInput[2];
                            // NOTE: splitting by comma, e.g.:
                            //       'T:GO:0031966,Il:ILMN_1240829' -> ['T:GO:0031966', 'Il:ILMN_1240829']
                            return Observable_1.Observable.from(xrefsString.split(','))
                                .mergeMap(function (xrefString) {
                                if (xrefString === 'N/A') {
                                    return Observable_1.Observable.empty();
                                }
                                // NOTE: splitting by FIRST colon only, e.g.:
                                //       'T:GO:0031966' -> ['T', 'GO:0031966']
                                var xrefFields = xrefString.split(/:(.+)/);
                                return bridgeDb.parseXrefRow([xrefFields[1], xrefFields[0], undefined]);
                            })
                                .toArray()
                                .map(function (xrefs) {
                                return {
                                    organism: organism,
                                    inputDataSource: inputDataSource,
                                    inputIdentifier: inputIdentifier,
                                    xrefs: xrefs,
                                    dataSourceFilter: dataSourceFilter,
                                };
                            });
                        });
                    };
                    var bridgeDb = this;
                    lodash_1.defaultsDeep(config, CONFIG_DEFAULT);
                    bridgeDb.config = config;
                    var xrefsRequestQueue = bridgeDb.xrefsRequestQueue = new Subject_1.Subject();
                    var debounceSignal = xrefsRequestQueue.debounceTime(XREF_REQUEST_DEBOUNCE_TIME);
                    bridgeDb.xrefsResponseQueue = xrefsRequestQueue
                        .windowWhen(function () { return debounceSignal; })
                        .map(function (win) { return win.toArray(); })
                        .mergeAll()
                        .filter(function (x) { return !lodash_1.isEmpty(x); })
                        .mergeMap(function (inputs) {
                        var firstInput = inputs[0];
                        var organism = firstInput.organism;
                        var conventionalNames = inputs.map(function (input) { return input.conventionalName; });
                        var identifiers = inputs.map(function (input) { return input.identifier; });
                        var dataSourceFilter = firstInput.dataSourceFilter;
                        return bridgeDb.xrefsBatch(organism, conventionalNames, identifiers, dataSourceFilter);
                    })
                        .multicast(new Subject_1.Subject());
                    bridgeDb.xrefsResponseQueue.connect();
                    var getTSV = bridgeDb.getTSV = function (url, method, body) {
                        if (method === void 0) { method = 'GET'; }
                        var ajaxRequest = {
                            url: url,
                            method: method,
                            responseType: 'text',
                            timeout: config.http.timeout,
                            crossDomain: true,
                        };
                        if (body) {
                            ajaxRequest.body = body;
                            ajaxRequest.headers = ajaxRequest.headers || {};
                            ajaxRequest.headers['Content-Type'] = 'text/plain';
                        }
                        return Observable_1.Observable.ajax(ajaxRequest)
                            .map(function (ajaxResponse) { return ajaxResponse.xhr.response; })
                            .throughNodeStream(csv(CSV_OPTIONS))
                            .filter(function (fields) {
                            // Remove commented out rows
                            return fields[0].indexOf('#') !== 0;
                        });
                    };
                    bridgeDb.dataSourceMappings$ = Observable_1.Observable.forkJoin(getTSV(config.dataSourcesHeadersIri)
                        .map(function (fields) {
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
                        .toArray(), getTSV(config.dataSourcesMetadataIri)
                        .toArray())
                        .mergeMap(function (results) {
                        var metadataByColumnIndex = results[0];
                        var rows = results[1];
                        return Observable_1.Observable.from(rows)
                            .map(function (fields) {
                            return fields.reduce(function (acc, field, i) {
                                var metadata = metadataByColumnIndex[i];
                                acc[metadata.term] = parseAsDatatype[metadata[RDF + 'datatype']](field);
                                return acc;
                            }, {});
                        });
                    })
                        .map(function (dataSource) {
                        // remove empty properties, ie., properties with these values:
                        // ''
                        // NaN
                        // null
                        // undefined
                        // TODO what about empty plain object {} or array []
                        return lodash_1.omitBy(dataSource, function (value) {
                            return value === '' ||
                                lodash_1.isNaN(value) ||
                                lodash_1.isNull(value) ||
                                lodash_1.isUndefined(value);
                        });
                    })
                        .map(function (dataSource) {
                        // If the Miriam URN is unknown or unspecified, datasources.txt uses
                        // the BridgeDb system code as a placeholder value.
                        // So here we make sure "about" is actually a Miriam URN.
                        if (dataSource.hasOwnProperty('about') && dataSource.about.indexOf('urn:miriam:') > -1) {
                            // switch "about" property from Miriam URN to identifiers.org IRI
                            var miriamUrn = dataSource.about;
                            dataSource.miriamUrn = miriamUrn;
                            var preferredPrefix = miriamUrnToPreferredPrefix(miriamUrn);
                            if (preferredPrefix) {
                                dataSource.preferredPrefix = preferredPrefix;
                                dataSource.sameAs = dataSource.sameAs || [];
                                dataSource.sameAs.push(miriamUrn);
                                var identifiersIri = miriamUrnToIdentifiersIri(miriamUrn);
                                if (identifiersIri) {
                                    dataSource.about = dataSource.hasIdentifiersOrgPattern = identifiersIri;
                                }
                            }
                        }
                        else {
                            delete dataSource.about;
                        }
                        return dataSource;
                    })
                        .map(function (dataSource) {
                        var primaryUriPattern = dataSource.hasPrimaryUriPattern;
                        if (!!primaryUriPattern) {
                            var regexIdentifierPattern = dataSource.hasRegexPattern || '.*';
                            ;
                            dataSource.hasRegexUriPattern = primaryUriPattern.replace('$id', 
                            // removing ^ (start) and $ (end) from regexIdentifierPattern
                            '(' + regexIdentifierPattern.replace(/(^\^|\$$)/g, '') + ')');
                            // if '$id' is at the end of the primaryUriPattern
                            var indexOfDollaridWhenAtEnd = primaryUriPattern.length - 3;
                            if (primaryUriPattern.indexOf('$id') === indexOfDollaridWhenAtEnd) {
                                dataSource.sameAs = dataSource.sameAs || [];
                                dataSource.sameAs.push(primaryUriPattern.substr(0, indexOfDollaridWhenAtEnd));
                            }
                        }
                        if (dataSource.type) {
                            dataSource[BDB + 'type'] = dataSource.type;
                        }
                        dataSource.type = 'Dataset';
                        return dataSource;
                    })
                        .map(function (dataSource) {
                        var bdbType = dataSource[BDB + 'type'];
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
                            if (bdbType === 'gene' ||
                                // TODO should the following two conditions be removed?
                                bdbType === 'probe' ||
                                dataSource.preferredPrefix === 'go') {
                                dataSource.subject.push('GeneProduct');
                                dataSource.subject.push(BIOPAX + 'DnaReference');
                            }
                            else if (bdbType === 'rna') {
                                dataSource.subject.push('Rna');
                                dataSource.subject.push(BIOPAX + 'RnaReference');
                            }
                            else if (bdbType === 'protein') {
                                dataSource.subject.push('Protein');
                                dataSource.subject.push(BIOPAX + 'ProteinReference');
                            }
                            else if (bdbType === 'metabolite') {
                                dataSource.subject.push('Metabolite');
                                dataSource.subject.push(BIOPAX + 'SmallMoleculeReference');
                            }
                            else if (bdbType === 'pathway') {
                                // BioPAX does not have a term for pathways that is analogous to
                                // biopax:ProteinReference for proteins.
                                dataSource.subject.push('Pathway');
                                dataSource.subject.push(BIOPAX + 'Pathway');
                            }
                            else if (bdbType === 'ontology') {
                                dataSource.subject.push(OWL + 'Ontology');
                            }
                            else if (bdbType === 'interaction') {
                                dataSource.subject.push('Interaction');
                                dataSource.subject.push(BIOPAX + 'Interaction');
                            }
                        }
                        dataSource.alternatePrefix = [
                            dataSource.systemCode
                        ];
                        return dataSource;
                    })
                        .reduce(function (acc, dataSource) {
                        DATASOURCE_ID_PROPERTIES.forEach(function (propertyName) {
                            var propertyValue = dataSource[propertyName];
                            acc[propertyValue] = dataSource;
                        });
                        return acc;
                    }, {})
                        .publishReplay();
                    // toggle bridgeDb.dataSourceMappings$ from cold to hot
                    bridgeDb.dataSourceMappings$.connect();
                } // end constructor
                BridgeDb.prototype.attributes = function (organism, conventionalName, identifier) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/attributes/' + conventionalName + '/' + identifier)
                        .reduce(function (acc, fields) {
                        var key = lodash_1.camelCase(fields[0]);
                        var value = fields[1];
                        acc[key] = value;
                        return acc;
                    }, {});
                };
                BridgeDb.prototype.attributeSearch = function (organism, query, attrName) {
                    var bridgeDb = this;
                    var attrNameParamSection = attrName ? '?attrName=' + attrName : '';
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/attributeSearch/' + query + attrNameParamSection)
                        .mergeMap(bridgeDb.parseXrefRow);
                };
                BridgeDb.prototype.attributeSet = function (organism) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/attributeSet')
                        .reduce(function (acc, row) {
                        acc.push(row[0]);
                        return acc;
                    }, []);
                };
                BridgeDb.prototype.isFreeSearchSupported = function (organism) {
                    var bridgeDb = this;
                    var ajaxRequest = {
                        url: bridgeDb.config.baseIri + organism + '/isFreeSearchSupported',
                        method: 'GET',
                        responseType: 'text',
                        timeout: bridgeDb.config.http.timeout,
                        crossDomain: true,
                    };
                    return Observable_1.Observable.ajax(ajaxRequest)
                        .map(function (ajaxResponse) { return ajaxResponse.xhr.response; })
                        .map(function (res) { return res === 'true'; });
                };
                BridgeDb.prototype.isMappingSupported = function (organism, sourceConventionalName, targetConventionalName) {
                    var bridgeDb = this;
                    var ajaxRequest = {
                        url: bridgeDb.config.baseIri + organism + '/isMappingSupported/' + sourceConventionalName + '/' + targetConventionalName,
                        method: 'GET',
                        responseType: 'text',
                        timeout: bridgeDb.config.http.timeout,
                        crossDomain: true,
                    };
                    return Observable_1.Observable.ajax(ajaxRequest)
                        .map(function (ajaxResponse) { return ajaxResponse.xhr.response; })
                        .map(function (res) { return res === 'true'; });
                };
                BridgeDb.prototype.organismProperties = function (organism) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/properties')
                        .reduce(function (acc, fields) {
                        var key = lodash_1.camelCase(fields[0]);
                        var value = fields[1];
                        acc[key] = value;
                        return acc;
                    }, {});
                };
                BridgeDb.prototype.organisms = function () {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + 'contents')
                        .map(function (fields) {
                        return {
                            en: fields[0],
                            la: fields[1],
                        };
                    });
                };
                BridgeDb.prototype.search = function (organism, query) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/search/' + query)
                        .mergeMap(bridgeDb.parseXrefRow);
                };
                BridgeDb.prototype.sourceDataSources = function (organism) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/sourceDataSources')
                        .map(function (fields) {
                        return fields[0];
                    })
                        .mergeMap(bridgeDb.dataSourceProperties);
                };
                BridgeDb.prototype.targetDataSources = function (organism) {
                    var bridgeDb = this;
                    return bridgeDb.getTSV(bridgeDb.config.baseIri + organism + '/targetDataSources')
                        .map(function (fields) {
                        return fields[0];
                    })
                        .mergeMap(bridgeDb.dataSourceProperties);
                };
                BridgeDb.prototype.xrefExists = function (organism, conventionalName, identifier) {
                    var bridgeDb = this;
                    var ajaxRequest = {
                        url: bridgeDb.config.baseIri + organism + '/xrefExists/' + conventionalName + '/' + identifier,
                        method: 'GET',
                        responseType: 'text',
                        timeout: bridgeDb.config.http.timeout,
                        crossDomain: true,
                    };
                    return Observable_1.Observable.ajax(ajaxRequest)
                        .map(function (ajaxResponse) { return ajaxResponse.xhr.response; })
                        .map(function (res) { return res === 'true'; });
                };
                BridgeDb.prototype.xrefs = function (organism, conventionalName, identifier, dataSourceFilter) {
                    var bridgeDb = this;
                    var xrefsRequestQueue = bridgeDb.xrefsRequestQueue;
                    var xrefsResponseQueue = bridgeDb.xrefsResponseQueue;
                    var dataSourceFilterParamSection = dataSourceFilter ? '?dataSource=' + dataSourceFilter : '';
                    xrefsRequestQueue.next({ organism: organism, conventionalName: conventionalName, identifier: identifier, dataSourceFilter: dataSourceFilter });
                    return xrefsResponseQueue
                        .filter(function (xrefBatchEnvelope) {
                        return xrefBatchEnvelope.organism === organism &&
                            // NOTE: we are not using the dataSource test right below. Instead, we are matching
                            // dataSources in the mergeMap further below. The reason is that the inputDataSource
                            // and the returned dataSource may not match, e.g., 'L' vs. 'Entrez Gene'.
                            //x.inputDataSource === conventionalName &&
                            xrefBatchEnvelope.inputIdentifier === identifier &&
                            (!dataSourceFilter || xrefBatchEnvelope.dataSourceFilter === dataSourceFilter);
                    })
                        .find(function (xrefBatchEnvelope) {
                        return Observable_1.Observable.zip(bridgeDb.dataSourceMappings$
                            .map(function (mapping) { return mapping[xrefBatchEnvelope.inputDataSource].conventionalName; }), bridgeDb.dataSourceMappings$
                            .map(function (mapping) { return mapping[conventionalName].conventionalName; }), function (inputDataSourceAsConventionalName, conventionalNameAsConventionalName) {
                            return inputDataSourceAsConventionalName === conventionalNameAsConventionalName;
                        });
                    })
                        .mergeMap(function (x) { return Observable_1.Observable.from(x.xrefs); });
                };
                return BridgeDb;
            }());
            exports_1("default", BridgeDb);
        }
    };
});
// TODO when we add the editor back, make sure this does what it's supposed to when the editor is open
// TODO what happens when the user selects another node without closing the panel?
System.register("src/ui/XrefsAnnotationPanel", ["lodash", "src/main", "react", "./stripped-bootstrap.css", "./annotation-panel.css"], function (exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    function getLinkout(entityReference) {
        var urlPattern = entityReference.isDataItemIn.hasPrimaryUriPattern;
        if (urlPattern) {
            return urlPattern.replace('$id', entityReference.identifier);
        }
        else {
            return lodash_2.compact(lodash_2.concat([entityReference.about], entityReference.sameAs))
                .filter(function (uri) {
                return uri.indexOf('http') > -1;
            })[0];
        }
    }
    function convertEntityReferenceToListItems(entityReference) {
        var listItemValue = {
            text: entityReference.identifier,
        };
        var uri = getLinkout(entityReference);
        if (uri) {
            listItemValue.uri = uri;
        }
        return [{
                key: entityReference.isDataItemIn.conventionalName,
                values: [listItemValue]
            }];
    }
    function addWikiPathwaysSearch(entityReference, listItems) {
        var displayName = entityReference.displayName;
        listItems.push({
            key: 'Find other pathways containing',
            values: [{
                    text: displayName,
                    uri: 'http://www.wikipathways.org/index.php?title=Special:SearchPathways&doSearch=1&query=' + displayName
                }]
        });
        return listItems;
    }
    var lodash_2, main_1, React, bridgedb, XrefsAnnotationPanel;
    return {
        setters: [
            function (lodash_2_1) {
                lodash_2 = lodash_2_1;
            },
            function (main_1_1) {
                main_1 = main_1_1;
            },
            function (React_1) {
                React = React_1;
            },
            function (_20) {
            },
            function (_21) {
            }
        ],
        execute: function () {// TODO when we add the editor back, make sure this does what it's supposed to when the editor is open
            // TODO what happens when the user selects another node without closing the panel?
            bridgedb = new main_1.default();
            XrefsAnnotationPanel = (function (_super) {
                __extends(XrefsAnnotationPanel, _super);
                function XrefsAnnotationPanel(props) {
                    var _this = _super.call(this, props) || this;
                    _this.state = {
                        xrefs: []
                    };
                    return _this;
                }
                XrefsAnnotationPanel.prototype.updateXrefs = function () {
                    var that = this;
                    var props = that.props;
                    var primaryDataSource = props.dataSource;
                    var primaryIdentifier = props.identifier;
                    var primaryEntityReference = {
                        displayName: props.displayName,
                        identifier: primaryIdentifier,
                        isDataItemIn: {
                            conventionalName: primaryDataSource
                        }
                    };
                    var xrefsRequest = that.xrefsRequest = bridgedb.xrefs(props.organism, props.dataSource, props.identifier);
                    xrefsRequest
                        .map(function (entityReference) {
                        var identifier = entityReference.identifier;
                        var listItem = {
                            key: entityReference.isDataItemIn.conventionalName,
                            text: identifier,
                            primary: entityReference.isDataItemIn.primary,
                        };
                        var uri = getLinkout(entityReference);
                        if (uri) {
                            listItem.uri = uri;
                        }
                        return listItem;
                    })
                        .toArray()
                        .map(function (listItems) {
                        // Here we handle case where BridgeDb webservice returns no reults or just one result.
                        // Getting this number of results might mean the webservice is down.
                        var listItemsCount = listItems.length;
                        if (listItemsCount <= 1) {
                            console.warn('Received ' + String(listItemsCount) + ' results. Is webservice.bridgedb.org down?');
                            return convertEntityReferenceToListItems(primaryEntityReference);
                        }
                        // two-factor sort:
                        //   1) by whether primary
                        //   2) by key (e.g., the data source conventional name)
                        listItems.sort(function (a, b) {
                            // by primary
                            if (a.primary === b.primary) {
                                var x = a.key.toLowerCase();
                                var y = b.key.toLowerCase();
                                // by key 
                                return x < y ? -1 : x > y ? 1 : 0;
                            }
                            else if (b.primary) {
                                return 1;
                            }
                            else {
                                return -1;
                            }
                        });
                        var sortedListItems = lodash_2.toPairs(lodash_2.groupBy(listItems, 'key'))
                            .reduce(function (acc, pair) {
                            acc.push({
                                key: pair[0],
                                values: pair[1]
                            });
                            return acc;
                        }, []);
                        // Set the first item in the list to be the one with the dataSource/identifier
                        // that was specified for this data node by the pathway author.
                        var primaryListItem = lodash_2.remove(sortedListItems, function (element) {
                            return (element.key === primaryDataSource);
                        })[0];
                        var primaryXRefId = lodash_2.remove(primaryListItem.values, function (element) {
                            return (element.text === primaryIdentifier);
                        })[0];
                        primaryListItem.values.unshift(primaryXRefId);
                        sortedListItems.unshift(primaryListItem);
                        return sortedListItems
                            .map(function (formattedListItem) {
                            return {
                                key: formattedListItem.key,
                                values: formattedListItem.values.map(function (v) { return lodash_2.pick(v, ['text', 'uri']); })
                            };
                        });
                    })
                        .do(function (xrefs) {
                        that.setState({ xrefs: addWikiPathwaysSearch(primaryEntityReference, xrefs) });
                    }, function (err) {
                        err.message = err.message || '';
                        err.message += ' Error getting or formatting xrefs (is webservice.bridgedb.org down?)';
                        console.error(err);
                        var xrefs = convertEntityReferenceToListItems(primaryEntityReference);
                        that.setState({ xrefs: addWikiPathwaysSearch(primaryEntityReference, xrefs) });
                    })
                        .subscribe(null, console.error);
                };
                XrefsAnnotationPanel.prototype.componentDidMount = function () {
                    var that = this;
                    that.updateXrefs();
                };
                // TODO is this correct? Or should we use componentWillUpdate?
                XrefsAnnotationPanel.prototype.componentDidUpdate = function (prevProps, prevState) {
                    var that = this;
                    var props = that.props;
                    var state = that.state;
                    if (prevProps.dataSource !== props.dataSource || prevProps.identifier !== props.identifier) {
                        that.updateXrefs();
                    }
                };
                XrefsAnnotationPanel.prototype.componentWillUnmount = function () {
                    var that = this;
                    // TODO cancel any pending network requests, possibly something like this:
                    //that.xrefsRequest.dispose();
                };
                XrefsAnnotationPanel.prototype.render = function () {
                    var that = this;
                    var props = that.props;
                    var state = that.state;
                    var xrefs = state.xrefs;
                    // NOTE: the non-breaking spaces, " &nbsp;", are needed to keep the entityType aligned
                    // with the displayName, because the displayName has the X (close icon) on its line,
                    // which pushes the displayName to the left.
                    return React.createElement("div", { style: props.style, className: "annotation ui-draggable" },
                        React.createElement("header", null,
                            React.createElement("span", { className: "annotation-header-close", onClick: props.handleClose },
                                React.createElement("i", { className: "icon-remove" })),
                            React.createElement("span", { className: "annotation-header-text" }, props.displayName),
                            React.createElement("div", { className: "annotation-description" },
                                React.createElement("h2", null, props.entityType),
                                " \u00A0 \u00A0 \u00A0 \u00A0 \u00A0")),
                        React.createElement("div", { className: "annotation-items-container" }, React.createElement("ul", { className: "annotation-items-container-list" }, xrefs.map(function (xref) {
                            var values = xref.values;
                            var valueCount = values.length;
                            return React.createElement("li", { key: xref.key },
                                React.createElement("span", { className: "annotation-item-title" }, xref.key + ': '),
                                values.map(function (v, i) {
                                    var text = v.text;
                                    var uri = v.uri;
                                    var separator = i <= valueCount ? ' ' : '';
                                    return React.createElement("span", { key: text, className: "annotation-item-text" },
                                        uri ? React.createElement("a", { href: uri, target: "_blank" }, text) : text,
                                        separator);
                                }));
                        }))));
                };
                return XrefsAnnotationPanel;
            }(React.Component));
            exports_2("XrefsAnnotationPanel", XrefsAnnotationPanel);
        }
    };
});
// NOTE: mock-server must be started before running this.
System.register("test/e2e/ui-components-local.test", ["react", "react-dom", "lodash", "src/ui/XrefsAnnotationPanel"], function (exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    var React, ReactDOM, lodash_3, XrefsAnnotationPanel_1, container, Demo, entities;
    return {
        setters: [
            function (React_2) {
                React = React_2;
            },
            function (ReactDOM_1) {
                ReactDOM = ReactDOM_1;
            },
            function (lodash_3_1) {
                lodash_3 = lodash_3_1;
            },
            function (XrefsAnnotationPanel_1_1) {
                XrefsAnnotationPanel_1 = XrefsAnnotationPanel_1_1;
            }
        ],
        execute: function () {// NOTE: mock-server must be started before running this.
            // TODO do we need to specify this here? Seems wrong.
            process.env.MOCKSERVER_PORT = '4522';
            // React says not to render directly into document.body, so here's a container.
            container = document.createElement('div');
            document.body.appendChild(container);
            Demo = (function (_super) {
                __extends(Demo, _super);
                function Demo(props) {
                    var _this = _super.call(this, props) || this;
                    _this.state = {
                        entities: props.entities,
                        selected: null
                    };
                    return _this;
                }
                Demo.prototype.closeActive = function () {
                    this.setState({ selected: null });
                };
                Demo.prototype.handleClick = function (e) {
                    var that = this;
                    var el = e.target;
                    var id = el.getAttribute('id');
                    var entity = that.state.entities[id];
                    if (entity && entity.type === 'DataNode' && entity.database && entity.identifier) {
                        that.setState({ selected: entity });
                    }
                };
                Demo.prototype.render = function () {
                    var that = this;
                    var props = that.props;
                    var state = that.state;
                    var selected = state.selected;
                    return React.createElement("div", { onClick: that.handleClick.bind(that) },
                        lodash_3.values(that.state.entities)
                            .map(function (entity) { return React.createElement("button", { key: entity.id, id: entity.id }, entity.displayName); }),
                        !selected ? React.createElement("span", null) : React.createElement("div", null,
                            React.createElement(XrefsAnnotationPanel_1.XrefsAnnotationPanel, { organism: selected.organism, entityType: 'Metabolite', displayName: selected.displayName, dataSource: selected.database, identifier: selected.identifier, handleClose: that.closeActive.bind(that) })));
                };
                return Demo;
            }(React.Component));
            entities = {
                '123': {
                    id: '123',
                    organism: 'Homo sapiens',
                    type: 'DataNode',
                    entityType: 'Metabolite',
                    database: 'CAS',
                    identifier: '50-00-0',
                    displayName: 'formaldehyde',
                    entityReference: {
                        name: 'Formaldehyde',
                        displayName: 'formaldehyde',
                        type: [
                            'Metabolite',
                            'biopax:SmallMoleculeReference'
                        ],
                        isDataItemIn: {
                            id: 'http://identifiers.org/cas/'
                        },
                        identifier: '50-00-0',
                    },
                },
                '124': {
                    id: '124',
                    organism: 'Homo sapiens',
                    type: 'DataNode',
                    entityType: 'GeneProduct',
                    database: 'Entrez Gene',
                    identifier: '1234',
                    displayName: 'CCR5',
                    entityReference: {
                        name: 'C-C motif chemokine receptor 5',
                        displayName: 'CCR5',
                        type: [
                            'GeneProduct',
                            'biopax:DnaReference'
                        ],
                        isDataItemIn: {
                            id: 'http://identifiers.org/ncbigene/'
                        },
                        identifier: '1234',
                    },
                },
            };
            ReactDOM.render(React.createElement(Demo, { entities: entities }), container);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy1sb2NhbC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21haW4udHMiLCIuLi8uLi9zcmMvdWkvWHJlZnNBbm5vdGF0aW9uUGFuZWwudHN4IiwidWktY29tcG9uZW50cy1sb2NhbC50ZXN0LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztJQW1HQTs7Ozs7T0FLRztJQUNILG1DQUFtQyxTQUFpQjtRQUNuRCxJQUFNLGVBQWUsR0FBRywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5RCxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsZUFBZSxHQUFHLEdBQUcsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsb0NBQW9DLFNBQWlCO1FBQ3BELHdEQUF3RDtRQUN4RCw4QkFBOEI7UUFDOUIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7WUEvR0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBa0NLLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFL0IsR0FBRyxHQUFHLHVDQUF1QyxDQUFDO1lBQzlDLE1BQU0sR0FBRyxrREFBa0Qs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