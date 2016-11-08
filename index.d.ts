///<reference path="./typings/jsonld/index.d.ts" />
///<reference path="./typings/rx/rx.experimental.d.ts" />
///<reference path="./node_modules/@types/lodash/index.d.ts" />

declare interface Organism {
	name?: string,
	nameLanguageMap?: NameLanguageMap
}

declare interface Datasource {
	'@context'?: any,
	alternatePrefix?: string|string[],
	entityType: string,
	hasPrimaryUriPattern?: string,
	id: string,
	identifierPattern?: string,
	uriRegexPattern?: string,
	name?: string,
	conventionalName: string,
	exampleIdentifier?: string,
	preferredPrefix: string,
	type: any,
	subject?: string|string[],
	systemCode: string,
	uri?: string,
}
declare class BridgeDbXrefsIri extends String{}
declare class MyGeneInfoXrefsIri extends String{}
declare interface EntityReference {
	id?: string,
	identifier: string,
	isDataItemIn?: Datasource,
	displayName?: string,
	organism?: Organism,
	xref?: [BridgeDbXrefsIri, MyGeneInfoXrefsIri]
	type?: string[]
}

declare class IdentifiersIri extends String{}
declare interface EntityReferenceEnrichInput1 {
	id: IdentifiersIri
}
declare interface EntityReferenceEnrichInput2 {
	bridgeDbXrefsIri: BridgeDbXrefsIri
}
declare interface EntityReferenceEnrichInput3 {
	xref: [BridgeDbXrefsIri]
}
declare interface EntityReferenceEnrichInput4 {
	isDataItemIn: {
		name: string
	},
	identifier: string
}
declare interface EntityReferenceEnrichInput5 {
	isDataItemIn: {
		conventionalName: string
	},
	identifier: string
}
declare type EntityReferenceEnrichInput = IdentifiersIri|BridgeDbXrefsIri|EntityReferenceEnrichInput1|EntityReferenceEnrichInput2|EntityReferenceEnrichInput3|EntityReferenceEnrichInput4|EntityReferenceEnrichInput5

declare function csv(any): any;
declare module 'csv-streamify' {
	export default csv;
}
