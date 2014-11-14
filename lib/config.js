/* @module config */

var config = {
  organism: {
    language: 'latin'
  },
  apiUrlStub: 'http://webservice.bridgedb.org',
  datasourcesUrl: 'https://raw.githubusercontent.com/bridgedb/BridgeDb/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
