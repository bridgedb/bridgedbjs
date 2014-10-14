var config = require('./config.js');
var jsonLdContext = require('./context.json');
var MetadataService = require('./metadata-service.js');
var Organism = require('./organism.js');
var Xref = require('./xref.js');

var BridgeDb = function(){

  /*
  Organism.test('myorganism', function(err, response) {
    console.log('response from testOrganism');
    console.log(response);
  });

  Xref.test('myxref', function(err, response) {
    console.log('response from testXref');
    console.log(response);
  });
  //*/

  this.getEntityReferenceIdentifiersIri = function(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  };
  this.init = function(options) {
    this.urlStub = options.urlStub || config.urlStub;
  };
  this.organism = Organism(this);
  this.xref = Xref(this);
  this.map = this.xref.map;
  this.getAvailableOrganisms = this.organism.getAvailable;
  this.getOrganismByIdentifier = this.xref.getOrganismByIdentifier;
  this.getXrefs = this.xref.get;
  this.getXrefsNestedForDisplay = this.xref.getNestedForDisplay;
  this.xrefExists = this.xref.exists;

  return Object.create(this);
};

if (!BridgeDb.metadataRequested) {
  BridgeDb.metadataRequested = true;
  MetadataService.metadataRequested = true;
  MetadataService.get()
  .each(function(returnedMetadata) {
    BridgeDb.metadata = returnedMetadata;
  });
}

module.exports = BridgeDb;
