/* @module config */

var config = {
  // TODO see note in main.js regarding CORS
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  'context': [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    '74b128ab9d24647b042c860d4aea07026b4f4eeb',
    '/org.bridgedb.rdf/resources/jsonld-context.jsonld'
  ].join(''),
  datasetsMetadataIri: [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    '35b90ccb2cf8ae8b652080ad03f42c9701590c6f',
    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  ].join(''),
  datasetsHeadersIri: [
    'https://cdn.rawgit.com/bridgedb/BridgeDb/',
    '35b90ccb2cf8ae8b652080ad03f42c9701590c6f',
    '/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt',
  ].join(''),
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
