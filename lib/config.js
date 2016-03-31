/* @module config */

var latestBridgeDbCommitHash = 'a74d65ed2fd051567ede67e1387fcccccc8164d3';
var config = {
  // TODO see note in main.js regarding CORS
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  'context': [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    latestBridgeDbCommitHash,
    '/org.bridgedb.rdf/resources/jsonld-context.jsonld'
  ].join(''),
  datasetsMetadataIri: [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    latestBridgeDbCommitHash,
    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  ].join(''),
  datasetsHeadersIri: [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    latestBridgeDbCommitHash,
    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt',
  ].join(''),
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
