///<reference path="./typings/jsonld/index.d.ts" />
///<reference path="./typings/rx/rx.experimental.d.ts" />
///<reference path="./node_modules/@types/lodash/index.d.ts" />

declare type organism = 'Frog' | 'Xenopus tropicalis' | 'Western Balsam Poplar' | 'Populus trichocarpa' | 'Arabidopsis thaliana' | 'Rice' | 'Oryza sativa' | 'Dog' | 'Canis familiaris' | 'Fruit fly' | 'Drosophila melanogaster' | 'Rat' | 'Rattus norvegicus' | 'Zebra fish' | 'Danio rerio' | 'Rhesus Monkey' | 'Macaca mulatta' | 'Worm' | 'Caenorhabditis elegans' | 'Tomato' | 'Solanum lycopersicum' | 'Cow' | 'Bos taurus' | 'Soybean' | 'Glycine max' | 'Escherichia coli' | 'Sea Squirt' | 'Ciona intestinalis' | 'Yeast' | 'Saccharomyces cerevisiae' | 'Human' | 'Homo sapiens' | 'Fusarium graminearum' | 'Gibberella zeae' | 'Indian Rice' | 'Oryza indica' | 'Horse' | 'Equus caballus' | 'Barley' | 'Hordeum vulgare' | 'Maize' | 'Zea mays' | 'Tuberculosis' | 'Mycobacterium tuberculosis' | 'Chicken' | 'Gallus gallus' | 'Mosquito' | 'Anopheles gambiae' | 'Black mold' | 'Aspergillus niger' | 'Chimpanzee' | 'Pan troglodytes' | 'Wine Grape' | 'Vitis vinifera' | 'Bacillus subtilis' | 'Mouse' | 'Mus musculus' | 'Pig' | 'Sus scrofa' | 'Platypus' | 'Ornithorhynchus anatinus';

declare interface CsvOptions {
	objectMode: boolean,
	delimiter: string
}
declare class Csv {
	constructor(options?: CsvOptions)
}

declare interface Datasource {
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
	organism?: organism,
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
