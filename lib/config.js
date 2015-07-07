/* @module config */

var config = {
  // TODO see note in index.js regarding CORS
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  // TODO see note in index.js regarding CORS
  datasetsMetadataIri:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
