// NOTE organism is in its own file, organism.d.ts.
// This should not need to be specified here, because it's
// already specified in tsconfig.js, but in Vim, Syntastic
// is saying organism is undefined if I remove this.
/// <reference path="./organism.d.ts" />

// for details on vocab, see http://vocabularies.bridgedb.org/ops#

declare interface Datasource {
	about: string;
	conventionalName: string;
	entityType: string; // http://vocabularies.bridgedb.org/ops#type
	fullName: string;
	hasIdentifiersOrgPattern: string;
	hasPrimaryUriPattern: string;
	hasRegexPattern: string;
	hasRegexUriPattern: string;
	idExample: string;
	miriamUrn: string;
	preferredPrefix: string;
	systemCode: string;
	type: string; // http://www.w3.org/1999/02/22-rdf-syntax-ns#type
	alternatePrefix?: string|string[];
	sameAs?: string[]; // http://www.w3.org/2002/07/owl#sameAs
	subject?: string|string[];
}

declare interface EntityReference {
	identifier: string;
	displayName?: string;
	id?: string;
	isDataItemIn?: Datasource;
	organism?: organism;
	type?: string[];
	xref?: [string, string];
}
