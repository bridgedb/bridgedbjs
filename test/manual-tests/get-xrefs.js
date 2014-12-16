var _ = require('lodash');
var highland = require('highland');
var BridgeDb = require('../../index.js');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

/*
var entityReference1 = {
  '@id': 'http://identifiers.org/ncbigene/4292'
};
bridgeDb1.xref.get(_.clone(entityReference1))
.collect()
.each(function(entityReferenceXrefs) {
  console.log('xrefs (collection) for');
  console.log(JSON.stringify(entityReference1, null, '\t'));
  console.log('**********************************************');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
var entityReference2 = {
  '@id': 'http://identifiers.org/ncbigene/4292'
};
var options2 = {
  format:'display'
};
bridgeDb1.xref.get(
    _.clone(entityReference2),
    _.clone(options2))
.each(function(entityReferenceXref) {
  console.log('xref (single) for:');
  console.log(JSON.stringify(entityReference2, null, '\t'));
  console.log('with options:');
  console.log(JSON.stringify(options2, null, '\t'));
  console.log('**********************************************');
  console.log(JSON.stringify(entityReferenceXref, null, '\t'));
});
//*/

/*
bridgeDb1.xref.get({
    '@id': 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  },
  {
    format:'display'
})
.each(function(xrefs) {
  console.log('one xref for ');
  console.log('http://webservice.bridgedb.org/Human/xrefs/L/1234,');
  console.log('formatted for display');
  console.log(JSON.stringify(xrefs, null, '\t'));
});
//*/

/*
var bridgeDb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

/*
bridgeDb2.xref.get({
    bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  },
  {
    format:'display'
}).each(function(xrefs) {
  console.log('xrefs for http://webservice.bridgedb.org/Human/xrefs/L/1234,');
  console.log('formatted for display');
  console.log(JSON.stringify(xrefs, null, '\t'));
});
//*/

/*
highland([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(bridgeDb1.xref.createStream())
.each(function(entityReferenceXrefs) {
  console.log('xrefs for provided entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

/*
bridgeDb2.xref.get([
  {
    '@id': 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.each(function(entityReferenceXrefs) {
  console.log('xrefs for provided entity reference');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
