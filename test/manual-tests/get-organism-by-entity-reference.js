var _ = require('lodash');
var BridgeDb = require('../../index.js');
var highland = require('highland');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

var bridgeDb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgeDb1.organism.getByEntityReference('http://identifiers.org/ncbigene/4292')
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgeDb1.entityReference.enrich('http://identifiers.org/ncbigene/4292')
.flatMap(bridgeDb1.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
bridgeDb2.organism.getAll().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgeDb2.organism.getAll().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

//*
bridgeDb2.organism.getByEntityReference(
    {
      bridgeDbSystemCode: 'L',
      identifier: '174034'
    }
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
bridgeDb2.organism.getByEntityReference(
    {
      bridgeDbSystemCode: 'L',
      identifier: '4292'
    }
)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

// These below don't work at present.
/*
bridgeDb2.entityReference.enrich(
    'http://identifiers.org/ncbigene/174034')
.flatMap(bridgeDb2.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
highland([
  'http://identifiers.org/ncbigene/174034'
])
.pipe(bridgeDb2.entityReference.createEnrichmentStream(
  {
    dataSource: true
  }
))
.pipe(
bridgeDb2.organism.createEntityReferenceToOrganismTransformationStream()
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans (second time)');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/
