var BridgeDb = require('../index.js');

var bridgedb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgedb1.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
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
bridgedb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

//*
bridgedb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/
