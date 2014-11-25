var _ = require('lodash');
var BridgeDb = require('../index.js');
var highland = require('highland');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.entityReferenceService.enrich('http://identifiers.org/ncbigene/4292')
.flatMap(bridgedb1.organismService.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
bridgedb2.organismService.getAvailable().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgedb2.organismService.getAvailable().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgedb2.entityReferenceService.enrich(
    'http://identifiers.org/ncbigene/174034')
.flatMap(bridgedb2.organismService.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
highland([
  'http://identifiers.org/ncbigene/174034'
])
.pipe(bridgedb2.entityReferenceService.createEnrichmentStream(
  {
    databaseMetadata: true
  }
))
.pipe(
bridgedb2.organismService.createEntityReferenceToOrganismTransformationStream()
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans (second time)');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/
