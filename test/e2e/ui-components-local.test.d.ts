/// <reference types="react" />
declare module "src/main" {
    global  {
        namespace NodeJS {
            interface Global {
                XMLHttpRequest: XMLHttpRequest;
            }
        }
    }
    import { Observable } from 'rxjs/Observable';
    import 'rxjs/add/observable/dom/ajax';
    import 'rxjs/add/observable/empty';
    import 'rxjs/add/observable/forkJoin';
    import 'rxjs/add/observable/from';
    import 'rxjs/add/observable/zip';
    import 'rxjs/add/operator/debounceTime';
    import 'rxjs/add/operator/do';
    import 'rxjs/add/operator/filter';
    import 'rxjs/add/operator/find';
    import 'rxjs/add/operator/mergeAll';
    import 'rxjs/add/operator/mergeMap';
    import 'rxjs/add/operator/map';
    import 'rxjs/add/operator/multicast';
    import 'rxjs/add/operator/reduce';
    import 'rxjs/add/operator/publishReplay';
    import 'rxjs/add/operator/timeout';
    import 'rxjs/add/operator/toArray';
    import 'rxjs/add/operator/windowWhen';
    import 'rx-extra/add/operator/throughNodeStream';
    export const CONFIG_DEFAULT: {
        baseIri: string;
        context: string;
        dataSourcesHeadersIri: string;
        dataSourcesMetadataIri: string;
        http: {
            timeout: number;
            retryLimit: number;
            retryDelay: number;
        };
    };
    export default class BridgeDb {
        config: any;
        dataSourceMappings$: any;
        getTSV: any;
        private xrefsRequestQueue;
        private xrefsResponseQueue;
        constructor(config?: Partial<typeof CONFIG_DEFAULT>);
        attributes(organism: organism, conventionalName: string, identifier: string): any;
        attributeSearch(organism: organism, query: string, attrName?: string): Observable<Xref>;
        attributeSet(organism: organism): Observable<string[]>;
        dataSourceProperties: (input: string) => Observable<DataSource>;
        isFreeSearchSupported(organism: organism): Observable<boolean>;
        isMappingSupported(organism: organism, sourceConventionalName: string, targetConventionalName: string): Observable<boolean>;
        organismProperties(organism: organism): Observable<{}>;
        organisms(): Observable<{}>;
        private parseXrefRow;
        search(organism: organism, query: string): Observable<Xref>;
        sourceDataSources(organism: organism): Observable<DataSource>;
        targetDataSources(organism: organism): Observable<DataSource>;
        xrefExists(organism: organism, conventionalName: string, identifier: string): Observable<boolean>;
        xrefs(organism: organism, conventionalName: string, identifier: string, dataSourceFilter?: string): Observable<Xref>;
        xrefsBatch: (organism: organism, conventionalNameOrNames: string | string[], identifiers: string[], dataSourceFilter?: string) => Observable<{
            organism: string;
            inputIdentifier: string;
            inputDataSource: string;
            xrefs: Xref[];
            dataSourceFilter?: string;
        }>;
    }
}
declare module "src/ui/XrefsAnnotationPanel" {
    import * as React from 'react';
    import * as Rx from 'rxjs';
    import './kaavio.css';
    import './stripped-bootstrap.css';
    import './annotation-panel.css';
    class XrefsAnnotationPanel extends React.Component<any, any> {
        xrefsRequest: Rx.Observable<any>;
        constructor(props: any);
        updateXrefs(): void;
        componentDidMount(): void;
        componentDidUpdate(prevProps: any, prevState: any): void;
        componentWillUnmount(): void;
        render(): JSX.Element;
    }
    export default XrefsAnnotationPanel;
}
declare module "test/e2e/ui-components-local.test" {
}
