var _ = require('lodash');
var BridgeDb = require('../index.js');
var highland = require('highland');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.entityReference.enrich('http://identifiers.org/ncbigene/4292')
.flatMap(bridgedb1.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
bridgedb2.organism.getAll().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgedb2.organism.getAll().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgedb2.entityReference.enrich(
    'http://identifiers.org/ncbigene/174034')
.flatMap(bridgedb2.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
highland([
  'http://identifiers.org/ncbigene/174034'
])
.pipe(bridgedb2.entityReference.createEnrichmentStream(
  {
    dataSource: true
  }
))
.pipe(
bridgedb2.organism.createEntityReferenceToOrganismTransformationStream()
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans (second time)');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/
