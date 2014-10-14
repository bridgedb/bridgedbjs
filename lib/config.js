var config = {
  apiUrlStub: 'http://webservice.bridgedb.org',
  datasourcesUrl: 'http://svn.bigcat.unimaas.nl/bridgedb/trunk/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
  default: {
    host: 'webservice.bridgedb.org'
  },
  proxy: {
    host: 'pointer.ucsf.edu',
    path: '/d3/r/data-sources/bridgedb.php'
  },
  http: {
    retryLimit: 2,
    retryDelay: 3000
  }
};

module.exports = config;
