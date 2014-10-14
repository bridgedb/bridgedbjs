var config = require('./config.js');
var jsonLdContext = require('./context.json');
var MetadataService = require('./metadata-service.js');
var Organism = require('./organism.js');
var Xref = require('./xref.js');

var BridgeDb = {
  getEntityReferenceIdentifiersIri: function(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  },
  init: function(options) {
    console.log('BridgeDb instance');
    console.log(options);
    this.config = Object.create(config);
    this.config.urlStub = options.urlStub || config.urlStub;
    this.organism = Object.create(Organism(this));
    this.xref = Object.create(Xref(this));
  },
  config: config,
  organism: Organism(this),
  xref: Xref(this)
};

var BridgeDbInstanceCreator = function(options) {
  var bridgedbInstance = Object.create(BridgeDb);
  bridgedbInstance.init(options);
  return bridgedbInstance;
};

module.exports = BridgeDbInstanceCreator;
