/* @module config */

var config = {
  apiUrlStub: 'http://webservice.bridgedb.org',
  dataSourcesUrl:
    'https://raw.githubusercontent.com/bridgedb/BridgeDb/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
