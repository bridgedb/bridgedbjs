///<reference path="./typings/rx/rx.experimental.d.ts" />
///<reference path="./node_modules/@types/rx-node/rx-node.d.ts" />

declare interface nameLanguageMap {
	la?: string,
	en?: string,
}

declare interface organism {
	name?: string,
	nameLanguageMap?: nameLanguageMap
}

declare interface datasource {
	name?: string,
	conventionalName: string,
	exampleIdentifier?: string,
	preferredPrefix: string,
	systemCode: string,
}
declare class BridgeDbXrefsIri extends String{}
declare class MyGeneInfoXrefsIri extends String{}
declare interface entityReference {
	id?: string,
	identifier?: string,
	isDataItemIn?: datasource,
	organism: organism,
	xref: [BridgeDbXrefsIri, MyGeneInfoXrefsIri]
	type: string|string[]
}

declare class IdentifiersIri extends String{}
declare interface entityReferenceEnrichInput1 {
	id: IdentifiersIri
}
declare interface entityReferenceEnrichInput2 {
	bridgeDbXrefsIri: BridgeDbXrefsIri
}
declare interface entityReferenceEnrichInput3 {
	xref: [BridgeDbXrefsIri]
}
declare interface entityReferenceEnrichInput4 {
	isDataItemIn: {
		name: string
	},
	identifier: string
}
declare interface entityReferenceEnrichInput5 {
	isDataItemIn: {
		conventionalName: string
	},
	identifier: string
}
declare type entityReferenceEnrichInput = IdentifiersIri|BridgeDbXrefsIri|entityReferenceEnrichInput1|entityReferenceEnrichInput2|entityReferenceEnrichInput3|entityReferenceEnrichInput4|entityReferenceEnrichInput5

declare function csv(any): any;
declare module 'csv-streamify' {
	export = csv;
}

// TODO this isn't quite right, and it's losing
// information from original 'rx-node' module.
declare interface RxNode {fromUnpausableStream: any}

declare namespace Rx {
	interface Observable<T> {
		 streamThrough<TResult>(selector: (source: Observable<T>) => Observable<TResult>): Observable<TResult>;   
	}

	export const BehaviorSubject: any
	export const RxNode: RxNode
}
declare module 'rx-extra' {
	export = Rx;
}

declare function hyperquest(any, object?): any;
declare module 'hyperquest' {
	export = hyperquest;
}

declare function yolk(any): any;
declare module 'yolk' {
	export const h: any;
	export default yolk;
}
