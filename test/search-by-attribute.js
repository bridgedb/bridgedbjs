var _ = require('lodash');
var highland = require('highland');
var BridgeDb = require('../index.js');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
bridgedb1.entityReferenceService.searchByAttribute({
  attribute: 'Nfkb1',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('Result for Nfkb1');
  console.log(searchResults);
});

bridgedb1.entityReferenceService.searchByAttribute({
  attribute: 'Agt',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('bridgedb1: Result for Agt');
  console.log(searchResults);
});

var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

bridgedb2.entityReferenceService.searchByAttribute({
  attribute: 'Agt',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('bridgedb2: Result for Agt');
  console.log(searchResults);
});
