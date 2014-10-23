var Bridgedb = require('../index.js');
var _ = require('lodash');
var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
var bridgedb2 = Bridgedb();

bridgedb1.organismService.getByIri('http://identifiers.org/ncbigene/4292').each(function(organism) {
  console.log('organism by identifier1 should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});

//*
bridgedb2.organismService.getAvailable().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});

bridgedb2.organismService.getAvailable().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

bridgedb2.organismService.getByIri('http://identifiers.org/ncbigene/174034').each(function(organism) {
  console.log('organism by identifier2 should be c. elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
