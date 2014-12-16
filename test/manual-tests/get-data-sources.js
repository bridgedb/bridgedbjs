var BridgeDb = require('../../index.js');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

/*
bridgeDb1.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

var bridgeDb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

/*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Database metadata');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb1.dataSource.find({
  'name': 'Ensembl',
  //'name': ['Entrez Gene'],
  'exampleIdentifier': 'ENSG00000139618'
})
.each(function(dataSource) {
  console.log('1) returned data set should be named "Ensembl"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

//*
bridgeDb1.dataSource.find({
  'name': 'EntrezGene',
  //'name': ['Entrez Gene'],
  //'exampleIdentifier': '1234'
})
.each(function(dataSource) {
  console.log('1) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getOne({'name': ['Entrez Gene']})
//bridgeDb2.dataSource.getOne({'name': 'Entrez Gene'})
//bridgeDb2.dataSource.getOne({
.each(function(dataSource) {
  console.log('2) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getOne({
  '@id': 'http://identifiers.org/ncbigene/1234',
  'name': 'EntrezGene'
})
.each(function(dataSource) {
  console.log('3) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/
