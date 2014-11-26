var highland = require('highland');
var BridgeDb = require('../index.js');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
var bridgeDb2 = BridgeDb({
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
.pipe(bridgeDb1.entityReference.createEnrichmentStream())
.each(function(entityReferenceXrefs) {
  console.log('bridgeDb1: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgeDb2.entityReference.enrich([
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
  console.log('bridgeDb2: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
