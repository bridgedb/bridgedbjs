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
  searchResults.each(function(value) {
    console.log('searchResultsat332');
    console.log(value);
  });
});
