var highland = require('highland');
var BridgeDb = require('../index.js');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
  organism: 'Homo sapiens'
});
//*/

//*
highland([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(bridgedb1.entityReference.createEnrichmentStream())
.each(function(entityReferenceXrefs) {
  console.log('bridgedb1: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb2.entityReference.enrich([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  }
], {
  bridgeDbXrefsUrl: true,
  context: false,
  dataSource: true,
  organism: true
})
.each(function(entityReferenceXrefs) {
  console.log('bridgedb2: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
