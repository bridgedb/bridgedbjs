var jsonLdContext = require('./context.json');
var MetadataService = require('./metadata-service.js');
var Organism = require('./organism.js');
var Xref = require('./xref.js');

var BridgeDb = (function(){

  var metadata;
  if (!metadata) {
    MetadataService.get(function(err, returnedMetadata) {
      metadata = returnedMetadata;
    });
  }

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
    xrefExists:Xref.exists
  };
}());

module.exports = BridgeDb;
