var bridgedb = require('../index.js');
var _ = require('lodash');
var bridgedb1 = bridgedb();
var bridgedb2 = bridgedb();

//*
bridgedb1.getOrganismByIdentifier('http://identifiers.org/ncbigene/4292', function(err, organism) {
  console.log('organism by identifier1');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
bridgedb2.getOrganismByIdentifier('http://identifiers.org/ncbigene/103', function(err, organism) {
  console.log('organism by identifier2');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgedb2.getOrganismByIdentifier('http://identifiers.org/ncbigene/103', function(err, organism) {
  console.log('organism by identifier2');
  //console.log(JSON.stringify(organism, null, '\t'));
});
//*/
