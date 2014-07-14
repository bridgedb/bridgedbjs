var bridgedb = require('../bridgedb');

bridgedb.getXrefAliases({
  iri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}, function(err, xRefAliases) {
  console.log(xRefAliases);
});
