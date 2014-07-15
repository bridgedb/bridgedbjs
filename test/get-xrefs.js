var bridgedb = require('../bridgedb');

bridgedb.getXrefs({
  id: 'http://identifiers.org/ncbigene/4292'
  //bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}, function(err, entityReferenceXrefs) {
  console.log(JSON.stringify(entityReferenceXrefs, null, '\t'));
});
