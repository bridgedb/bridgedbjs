var _ = require('lodash');
var highland = require('highland');
var Bridgedb = require('../index.js');

var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
var bridgedb2 = Bridgedb();

/*
bridgedb1.organismService.getByIdentifier('http://identifiers.org/ncbigene/4292', function(err, organism) {
  console.log('organism by identifier1 should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgedb2.organismService.getByIdentifier('http://identifiers.org/ncbigene/174034', function(err, organism) {
  console.log('organism by identifier2 should be c. elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgedb1.organismService.getByIdentifier('http://identifiers.org/ncbigene/103', function(err, organism) {
  console.log('organism by identifier3 should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
  console.log('bridgedb1');
  console.log(bridgedb1);
  console.log('bridgedb2');
  console.log(bridgedb2);
});
//*/

//*
bridgedb1.xref.get({
  id: 'http://identifiers.org/ncbigene/4292'
}, function(err, entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/


//*
bridgedb1.entityReferenceService.getByDbAndIdentifierStreaming({
  db: 'Entrez Gene',
  identifier: '103'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/


//*
bridgedb1.entityReferenceService.get('http://webservice.bridgedb.org/Human/xrefs/L/1234')
.each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.entityReferenceService.get({
  bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.entityReferenceService.get({
  id: 'http://identifiers.org/ncbigene/103'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.entityReferenceService.getByIri({
  iri: 'http://identifiers.org/ncbigene/103'
}).each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.entityReferenceService.getByBridgedbUrlStreaming('http://webservice.bridgedb.org/Human/xrefs/L/1234').each(function(entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.entityReferenceService.getByBridgedbUrlWithCallback('http://webservice.bridgedb.org/Human/xrefs/L/1234', function(err, entityReferenceXrefs) {
  console.log('xrefs for http://identifiers.org/ncbigene/4292');
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
//*/

//*
bridgedb1.organismService.getNameByIri({
  iri: 'http://identifiers.org/ncbigene/4292',
  language: 'latin'
}).each(function(organismName) {
  console.log('organism latin name for http://identifiers.org/ncbigene/4292');
  console.log(organismName);
});
//*/

//*
bridgedb1.entityReferenceService.searchByName({
  name: 'NFKB1',
  organism: 'Homo sapiens'
}).each(function(organismName) {
  console.log('organism latin name at332');
  console.log(organismName);
});
//*/

// C. elegans result
//http://identifiers.org/ncbigene/174034
//http://webservice.bridgedb.org/Caenorhabditis elegans/xrefs/L/174034
