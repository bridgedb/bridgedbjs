var BridgeDb = require('../../index.js');

var bridgeDb1 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

function runGetAll(runNumber, timeout, expectedIterationCount) {
  bridgeDb1.dataSource.getAll()
  .collect()
  .each(function(dataSource) {
    if (runNumber === 1) {
      console.log('***************************************************');
      console.log('expected iteration count: ' + expectedIterationCount);
      console.log('***************************************************');
    }
    //console.log('Data sets:');
    //console.log(JSON.stringify(dataSource, null, '\t'));
    console.log('  #' + runNumber + ' ======================');
    console.log('     Count: ' + dataSource.length);
    if (dataSource.length !== 132) {
      console.log('********************************************************');
      console.log('********************************************************');
      console.log('********************************************************');
      console.log('********************************************************');
      console.log('********************************************************');
      console.log('********************************************************');
      console.log('********************************************************');
    }
    console.log('     Timeout: ' + timeout + 'ms');
  });
}

function getTimeout(index, start, step) {
  return start + index * step;
}
//*
function runGetAllMultiple(start, step, expectedIterationCount) {
  var runNumber = 0;
  for (var i = 0; i < expectedIterationCount; i += 1) {
    setTimeout(function() {
      runNumber += 1;
      var timeout = getTimeout(runNumber, start, step);
      runGetAll(runNumber, timeout, expectedIterationCount);
    },
    getTimeout(i, start, step));
  }
}
//*/
// start, step, iterations
runGetAllMultiple(0, 0, 3);
runGetAllMultiple(60, 3, 75);
runGetAllMultiple(1000, 0, 1);
//*/

var bridgeDb2 = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  dataSourcesUrl:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

/*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Data set');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getAll()
.each(function(dataSource) {
  console.log('Data set');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb1.dataSource.find({
  'name': 'Ensembl',
  'exampleIdentifier': 'ENSG00000139618'
})
.each(function(dataSource) {
  console.log('45) returned data set should be named "Ensembl"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb1.dataSource.find({
  //'name': 'EntrezGene',
  //'name': ['Entrez Gene'],
  'exampleIdentifier': '1234'
})
.each(function(dataSource) {
  console.log('58) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.find({
  'name': 'EntrezGene',
  //'name': ['Entrez Gene'],
  //'exampleIdentifier': '1234'
})
.each(function(dataSource) {
  console.log('70) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getOne({'name': ['Entrez Gene']})
.each(function(dataSource) {
  console.log('78) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/

/*
bridgeDb2.dataSource.getOne({
  '@id': 'http://identifiers.org/ncbigene',
  'name': 'EntrezGene'
})
.each(function(dataSource) {
  console.log('90) returned data set should be named "Entrez Gene"');
  console.log(JSON.stringify(dataSource, null, '\t'));
});
//*/
