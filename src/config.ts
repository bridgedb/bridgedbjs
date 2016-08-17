/* @module config */

var bridgeDbRepoCdn = 'https://cdn.rawgit.com/bridgedb/BridgeDb/';
var bridgeDbCommitHash = 'f969c770df248f634e34a6a51fc0bf97b08f36d8';
var config = {
  baseIri: 'http://webservice.bridgedb.org/',
  context: [
      bridgeDbRepoCdn,
      bridgeDbCommitHash,
      '/org.bridgedb.bio/resources/org/bridgedb/bio/jsonld-context.jsonld',
    ].join(''),
  datasetsMetadataIri: [
      bridgeDbRepoCdn,
      bridgeDbCommitHash,
      '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
    ].join(''),
  datasetsHeadersIri: [
      bridgeDbRepoCdn,
      bridgeDbCommitHash,
      '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt',
    ].join(''),
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

export default config;
