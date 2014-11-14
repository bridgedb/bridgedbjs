var highland = require('highland');
var Bridgedb = require('../index.js');

var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
var bridgedb2 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

//*
highland([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgedbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(bridgedb1.entityReferenceService.createEnrichmentStream())
.each(function(entityReferenceXrefs) {
  console.log('bridgedb1: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb2.entityReferenceService.enrich([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  }
], {
  bridgedbXrefsUrl: true,
  context: false,
  databaseMetadata: true,
  organism: true
})
.each(function(entityReferenceXrefs) {
  console.log('bridgedb2: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
