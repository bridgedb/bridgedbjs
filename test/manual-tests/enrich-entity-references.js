var highland = require('highland');
var BridgeDb = require('../../index.js');

var bridgeDb1 = BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
var bridgeDb2 = BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

/*
bridgeDb1.entityReference.enrich([
  {
    '@id': 'http://identifiers.org/ncbigene/1234'
  }
], {
  bridgeDbXrefsIri: true,
  context: false,
  dataset: true,
  organism: true
})
.each(function(entityReferenceXrefs) {
  console.log('bridgeDb1: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

// TODO get this working
/*
highland([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(bridgeDb1.entityReference.createEnrichmentStream())
.each(function(entityReferenceXrefs) {
  console.log('bridgeDb1: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

/*
bridgeDb2.entityReference._expand({
  '@id': 'http://identifiers.org/ncbigene/4292'
});
//*/

//*
bridgeDb2.entityReference.enrich([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  }
], {
  bridgeDbXrefsIri: true,
  context: false,
  dataset: true,
  organism: true
})
.each(function(entityReferenceXrefs) {
  console.log('bridgeDb2: enriched entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
