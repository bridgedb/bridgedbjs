var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
System.register("src/ui/XrefsAnnotationPanel", ["lodash", "src/main", "react", "./kaavio.css", "./stripped-bootstrap.css", "./annotation-panel.css"], function (exports_2, context_2) {
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
            },
            function (_22) {
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
            exports_2("default", XrefsAnnotationPanel);
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
                            React.createElement(XrefsAnnotationPanel_1.default, { organism: selected.organism, entityType: 'Metabolite', displayName: selected.displayName, dataSource: selected.database, identifier: selected.identifier, handleClose: that.closeActive.bind(that) })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy1sb2NhbC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21haW4udHMiLCIuLi8uLi9zcmMvdWkvWHJlZnNBbm5vdGF0aW9uUGFuZWwudHN4IiwidWktY29tcG9uZW50cy1sb2NhbC50ZXN0LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBbUdBOzs7OztPQUtHO0lBQ0gsbUNBQW1DLFNBQWlCO1FBQ25ELElBQU0sZUFBZSxHQUFHLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlELEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLFdBQVcsR0FBRyxlQUFlLEdBQUcsR0FBRyxDQUFDO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxvQ0FBb0MsU0FBaUI7UUFDcEQsd0RBQXdEO1FBQ3hELDhCQUE4QjtRQUM5QixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztZQS9HRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFrQ0ssR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUUvQixHQUFHLEdBQUcsdUNBQXVDLENBQUM7WUFDOUMsTUFBTSxHQUFHLGtE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