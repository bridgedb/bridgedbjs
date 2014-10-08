var jsonLdContext = require('./context.json');
var MetadataService = require('./metadata-service.js');
var Organism = require('./organism.js');
var Xref = require('./xref.js');

var BridgeDb = function(){

  Organism.test('myorganism', function(err, response) {
    console.log('response from testOrganism');
    console.log(response);
  });

  Xref.test('myxref', function(err, response) {
    console.log('response from testXref');
    console.log(response);
  });

  function getEntityReferenceIdentifiersIri(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  }

  return {
    map:Xref.map,
    getAvailableOrganisms: Organism.getAvailable,
    getOrganismByIdentifier: Xref.getOrganismByIdentifier,
    getXrefs:Xref.get,
    getXrefsNestedForDisplay:Xref.getNestedForDisplay,
    xrefExists:Xref.exists,
    testOrganism: Organism.test,
    testXref: Xref.test
  };
};

var metadata;
if (!BridgeDb.metadataRequested) {
  console.log('BridgeDb147');
  console.log(BridgeDb);
  BridgeDb.metadataRequested = true;
  MetadataService.get(function(err, returnedMetadata) {
    BridgeDb.metadata = metadata = returnedMetadata;
  });
}

module.exports = BridgeDb;
