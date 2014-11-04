var Bridgedb = require('../index.js');
var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

bridgedb1.compactInput({
  'id': 'http://identifiers.org/ncbigene/4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
});

var bridgedb2 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
  inputContext: {
    'id': {
      '@id': '@id',
      '@type': '@id'
    }
  }
});

bridgedb2.compactInput({
  'id': 'http://identifiers.org/ncbigene/4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
});

var bridgedb3 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
  inputContext: {
    'db': {
      '@id': 'http://www.biopax.org/release/biopax-level3.owl#db',
      '@type': 'xsd:string'
    },
    'id': {
      '@id': 'http://www.biopax.org/release/biopax-level3.owl#id',
      '@type': 'xsd:string'
    }
  }
});

bridgedb3.compactInput({
  'db': 'Entrez Gene',
  'id': '4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
});
