var Bridgedb = require('../index.js');
var _ = require('lodash');
var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

console.log('bridgedb1');
console.log(bridgedb1);

//var bridgedb2 = Bridgedb({apiUrlStub: 'http://webservice.bridgedb.org'});
var bridgedb2 = Bridgedb();
//*
bridgedb1.xref.getOrganismByIdentifier('http://identifiers.org/ncbigene/4292', function(err, organism) {
  console.log('organism by identifier1');
  console.log(JSON.stringify(organism, null, '\t'));
  console.log('bridgedb1a');
  console.log(bridgedb1);
  console.log('bridgedb2a');
  console.log(bridgedb2);
});
//*/

//*
bridgedb2.xref.getOrganismByIdentifier('http://identifiers.org/ncbigene/103', function(err, organism) {
  console.log('organism by identifier2');
  console.log(JSON.stringify(organism, null, '\t'));
  console.log('bridgedb1b');
  console.log(bridgedb1);
  console.log('bridgedb2b');
  console.log(bridgedb2);
});
//*/

/*
bridgedb2.getOrganismByIdentifier('http://identifiers.org/ncbigene/103', function(err, organism) {
  console.log('organism by identifier2');
  //console.log(JSON.stringify(organism, null, '\t'));
});
//*/
