var bridgedb = require('../bridgedb');

bridgedb.getXrefsNestedForDisplay({
  //id: 'http://identifiers.org/ncbigene/4292'
  bridgedbUri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
}, function(err, xrefsNestedForDisplay) {
  console.log(JSON.stringify(xrefsNestedForDisplay, null, '\t'));
});
