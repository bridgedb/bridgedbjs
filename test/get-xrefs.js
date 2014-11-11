var highland = require('highland');
var Bridgedb = require('../index.js');

var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.xrefService.get({
  id: 'http://identifiers.org/ncbigene/4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
var bridgedb2 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

//*
//bridgedb2.xrefService.get({
bridgedb1.xrefService.get({
    //id: 'http://identifiers.org/ncbigene/4292'
    bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  },
  {
    format:'display'
}).each(function(xrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292, formatted for display');
  console.log(JSON.stringify(xrefs, null, '\t'));
});
//*/

// this works, except I'm not sure how the user would handle multiple species in one stream.
// Maybe that's not a concern for the BridgeDB API, and the user should handle that.
/*
highland([
  {
    id: 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(bridgedb1.xrefService.createStream())
.each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

// this is the old one.
/*
highland([
  {
    id: 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.pipe(highland.pipeline(function(s) {
  return s.flatMap(function(data) {
    console.log('wingwing');
    var bridgedbInstance = Bridgedb({
      apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
    });
    return bridgedbInstance.xrefService.get(data);
  });
}))
.each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

/*
bridgedb2.xrefService.get([
  {
    id: 'http://identifiers.org/ncbigene/4292'
  },
  {
    bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
  }
])
.each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/
