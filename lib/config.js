/* @module config */

var latestBridgeDbCommitHash = 'd01b14ea4924a421cf2c604fb550f63cd51d99cf';
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
