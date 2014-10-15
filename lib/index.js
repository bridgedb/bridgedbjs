var config = require('./config.js');
var jsonLdContext = require('./context.json');
var EntityReferenceService = require('./entity-reference-service.js');
var MetadataService = require('./metadata-service.js');
var OrganismService = require('./organism-service.js');
var Xref = require('./xref.js');

var BridgeDb = {
  getEntityReferenceIdentifiersIri: function(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  },
  init: function(options) {
    this.config = Object.create(config);
    // TODO loop through properties on options.config, if any, and update the instance config values.
    this.config.apiUrlStub = (!!options && options.apiUrlStub) || config.apiUrlStub;
    this.config.datasourcesUrl = (!!options && options.datasourcesUrl) || config.datasourcesUrl;
    this.organismService = Object.create(OrganismService(this));
    this.xref = Object.create(Xref(this));
    this.metadataService = Object.create(MetadataService(this));
    this.entityReferenceService = Object.create(EntityReferenceService(this));
  },
  config: config,
  organismService: OrganismService(this),
  xref: Xref(this),
  metadataService: MetadataService(this),
  entityReferenceService: EntityReferenceService(this)
};

var BridgeDbInstanceCreator = function(options) {
  var bridgedbInstance = Object.create(BridgeDb);
  bridgedbInstance.init(options);
  return bridgedbInstance;
};

module.exports = BridgeDbInstanceCreator;
