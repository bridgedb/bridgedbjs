var _ = require('lodash');
var highland = require('highland');
var Bridgedb = require('../index.js');

var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
bridgedb1.entityReferenceService.searchByAttribute({
  attribute: 'Nfkb1',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('Results for Nfkb1');
  console.log(searchResults);
});

bridgedb1.entityReferenceService.searchByAttribute({
  attribute: 'Agt',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('Results for Agt');
  console.log(searchResults);
});
