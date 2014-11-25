var BridgeDb = require('../index.js');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.databaseMetadataService.get()
.each(function(databaseMetadata) {
  console.log('Database metadata');
  console.log(JSON.stringify(databaseMetadata, null, '\t'));
});
//*/

//*
var bridgedb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

//*
bridgedb2.databaseMetadataService.get()
.each(function(databaseMetadata) {
  console.log('Database metadata');
  console.log(JSON.stringify(databaseMetadata, null, '\t'));
});
//*/

//*
bridgedb2.databaseMetadataService.get()
.each(function(databaseMetadata) {
  console.log('Database metadata');
  console.log(JSON.stringify(databaseMetadata, null, '\t'));
});
//*/
