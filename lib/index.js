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
    // TODO loop through properties on options.config, if any, and update the instance config values.
    this.config.apiUrlStub = (!!options && options.apiUrlStub) || config.apiUrlStub;
    this.config.datasourcesUrl = (!!options && options.datasourcesUrl) || config.datasourcesUrl;
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
