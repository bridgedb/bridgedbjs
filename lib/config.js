var config = {
  apiUrlStub: 'http://webservice.bridgedb.org',
  datasourcesUrl: 'https://raw.githubusercontent.com/bridgedb/BridgeDb/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  // old default datasource.txt url
  //datasourcesUrl: 'http://svn.bigcat.unimaas.nl/bridgedb/trunk/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;