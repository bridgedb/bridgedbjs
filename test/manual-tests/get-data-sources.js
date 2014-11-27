var BridgeDb = require('../index.js');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

//*
bridgeDb1.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

//*
var bridgeDb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
//*/

//*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

//*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/
