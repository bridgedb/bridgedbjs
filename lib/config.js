/* @module config */

var config = {
  // TODO see note in main.js regarding CORS
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri:
    'https://cdn.rawgit.com/bridgedb/BridgeDb/24186142d05b5f811893970b9a5d61a06f241f68/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
