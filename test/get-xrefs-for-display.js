var Bridgedb = require('../index.js');
var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

bridgedb1.xref.getNestedForDisplay({
  id: 'http://identifiers.org/ncbigene/4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}, function(err, xrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(xrefs, null, '\t'));
});
