var _ = require('lodash');
var BridgeDb = require('../../index.js');
var highland = require('highland');

var bridgeDb1 = BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

var bridgeDb2 = BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri:
    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});

function runGetAll(runNumber, timeout, expectedIterationCount) {
  bridgeDb1.organism.getAll()
  .collect()
  .each(function(organisms) {
    if (runNumber === 1) {
      console.log('***************************************************');
      console.log('expected iteration count: ' + expectedIterationCount);
      console.log('***************************************************');
    }
    console.log('  #' + runNumber + ' ======================');
    console.log('     Count: ' + organisms.length);
    if (organisms.length !== 31) {
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

/*/
// start, step, iterations
runGetAllMultiple(0, 0, 3);
runGetAllMultiple(60, 3, 75);
runGetAllMultiple(1000, 0, 1);
//*/

/*
bridgeDb1.organism.query()
.each(function(organism) {
  console.log('organism:');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

//*
var input1 = {
  name: 'Human',
  '@type': 'Organism'
};
var input1 = {
  '@id': 'http://identifiers.org/ncbigene/4292',
  '@type': 'EntityReference'
};
//var input1 = 'Human';
bridgeDb1.organism._getInstanceOrganism(_.clone(input1))
.each(function(organism) {
  console.log('organism for provided input:');
  console.log(input1);
  console.log(organism);
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
var input2 = {
  name: 'Human',
  '@type': 'Organism'
};
var input2 = {
  '@id': 'http://identifiers.org/ncbigene/4292',
  '@type': 'EntityReference'
};
//var input2 = 'Human';
bridgeDb1.organism.query(_.clone(input2))
.each(function(organism) {
  console.log('organism for provided input:');
  console.log(input2);
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgeDb1.organism.getByEntityReference('http://identifiers.org/ncbigene/4292')
.each(function(organism) {
  console.log('organism name should be Homo sapiens 802yes');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgeDb1.entityReference.enrich('http://identifiers.org/ncbigene/4292')
.flatMap(bridgeDb1.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgeDb2.organism.getAll()
.each(function(organism) {
  console.log('available organism');
  console.log(organism);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

/*
bridgeDb2.organism.getAll().each(function(organisms) {
  console.log('available organisms');
  console.log(organisms.length);
  //console.log(JSON.stringify(organisms, null, '\t'));
});
//*/

/*
bridgeDb2.organism.getByEntityReference(
    {
      bridgeDbSystemCode: 'L',
      identifier: '174034'
    }
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
bridgeDb2.organism.getByEntityReference(
    {
      bridgeDbSystemCode: 'L',
      identifier: '4292'
    }
)
.each(function(organism) {
  console.log('organism name should be Homo sapiens');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

// These below don't work at present.
/*
bridgeDb2.entityReference.enrich(
    'http://identifiers.org/ncbigene/174034')
.flatMap(bridgeDb2.organism.getByEntityReference)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/

/*
highland([
  'http://identifiers.org/ncbigene/174034'
])
.pipe(bridgeDb2.entityReference.createEnrichmentStream(
  {
    dataset: true
  }
))
.pipe(
bridgeDb2.organism.createEntityReferenceToOrganismTransformationStream()
)
.each(function(organism) {
  console.log('organism name should be Caenorhabditis elegans (second time)');
  console.log(JSON.stringify(organism, null, '\t'));
});
//*/
