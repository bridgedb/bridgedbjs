var Bridgedb = require('../index.js');

var bridgedb1 = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

/*
bridgedb.convert({
  id: 'http://identifiers.org/ncbigene/4292',
  targetNamespace: 'ensembl'
}, function(err, targetIri) {
  console.log(targetIri);
});
//*/

//*
bridgedb1.entityReferenceService.map({
  sourceEntityReference: 'http://identifiers.org/uniprot/P38398',
  targetPreferredPrefix: 'ncbigene'
}).each(function(targetEntityReference) {
  console.log(targetEntityReference);
});
//*/
