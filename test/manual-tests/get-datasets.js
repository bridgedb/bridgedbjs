var BridgeDb = require("../../index.js");

var bridgeDb1 = BridgeDb({
  baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
  datasetsMetadataIri:
    "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
});

function runGetAll(runNumber, timeout, expectedIterationCount) {
  bridgeDb1.dataset
    .query()
    .collect()
    .each(function(dataset) {
      if (runNumber === 1) {
        console.log("***************************************************");
        console.log("expected iteration count: " + expectedIterationCount);
        console.log("***************************************************");
      }
      //console.log('Data sets:');
      //console.log(JSON.stringify(dataset, null, '\t'));
      console.log("  #" + runNumber + " ======================");
      console.log("     Count: " + dataset.length);
      if (dataset.length !== 132) {
        console.log("********************************************************");
        console.log("********************************************************");
        console.log("********************************************************");
        console.log("********************************************************");
        console.log("********************************************************");
        console.log("********************************************************");
        console.log("********************************************************");
      }
      console.log("     Timeout: " + timeout + "ms");
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
    }, getTimeout(i, start, step));
  }
}
//*/
// start, step, iterations
runGetAllMultiple(0, 0, 3);
runGetAllMultiple(60, 3, 75);
runGetAllMultiple(1000, 0, 1);
//*/

var bridgeDb2 = BridgeDb({
  baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
  datasetsMetadataIri:
    "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
});

/*
bridgeDb2.dataset.query()
.each(function(dataset) {
  console.log('Data set');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb2.dataset.query()
.each(function(dataset) {
  console.log('Data set');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
var input80 = {
  'exampleResource': 'http://www.ncbi.nlm.nih.gov/gene/100010'
};
bridgeDb1.dataset.query(input80)
.each(function(dataset) {
  console.log('returned dataset for:');
  console.log(JSON.stringify(input80, null, '\t'));
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
var input92 = {
  'exampleResource': 'http://www.ncbi.nlm.nih.gov/nuccore/NW_005785400.1'
};
bridgeDb1.dataset.query(input92)
.each(function(dataset) {
  console.log('returned dataset for:');
  console.log(JSON.stringify(input92, null, '\t'));
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb1.dataset.query({
  'name': 'Ensembl',
  'exampleIdentifier': 'ENSG00000139618'
})
.each(function(dataset) {
  console.log('45) returned dataset should be named "Ensembl"');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb1.dataset.query({
  //'name': 'EntrezGene',
  //'name': ['Entrez Gene'],
  'exampleIdentifier': '1234'
})
.each(function(dataset) {
  console.log('58) returned dataset should be named "Entrez Gene"');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb2.dataset.query({
  'name': 'EntrezGene',
  //'name': ['Entrez Gene'],
  //'exampleIdentifier': '1234'
})
.each(function(dataset) {
  console.log('70) returned dataset should be named "Entrez Gene"');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb2.dataset.get({'name': ['Entrez Gene']})
.each(function(dataset) {
  console.log('78) returned dataset should be named "Entrez Gene"');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/

/*
bridgeDb2.dataset.get({
  '@id': 'http://identifiers.org/ncbigene',
  'name': 'EntrezGene'
})
.each(function(dataset) {
  console.log('90) returned dataset should be named "Entrez Gene"');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/
