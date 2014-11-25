var highland = require('highland');
var BridgeDb = require('../index.js');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.xref.get({
  '@id': 'http://identifiers.org/ncbigene/4292'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.xref.get({
    bridgedbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  },
  {
    format:'display'
}).each(function(xrefs) {
  console.log('xrefs for http://webservice.bridgedb.org/Human/xrefs/L/1234,');
  console.log('formatted for display');
  console.log(JSON.stringify(xrefs, null, '\t'));
});
//*/

//*
var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

//*
bridgedb2.xref.get({
    bridgedbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  },
  {
    format:'display'
}).each(function(xrefs) {
  console.log('xrefs for http://webservice.bridgedb.org/Human/xrefs/L/1234,');
  console.log('formatted for display');
  console.log(JSON.stringify(xrefs, null, '\t'));
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
.pipe(bridgedb1.xref.createStream())
.each(function(entityReferenceXrefs) {
  console.log('xrefs for provided entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb2.xref.get([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgedbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.each(function(entityReferenceXrefs) {
  console.log('xrefs for provided entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
