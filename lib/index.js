var config = require('./config.js');
var jsonLdContext = require('./context.json');
var EntityReferenceService = require('./entity-reference-service.js');
var MetadataService = require('./metadata-service.js');
var OrganismService = require('./organism-service.js');
var Xref = require('./xref.js');

var Bridgedb = {
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
    this.metadataService = Object.create(MetadataService(this));
    this.entityReferenceService = Object.create(EntityReferenceService(this));
    this.xref = Object.create(Xref(this));
  },
  config: config,
  organismService: OrganismService(this),
  metadataService: MetadataService(this),
  entityReferenceService: EntityReferenceService(this),
  xref: Xref(this)
};

var BridgedbInstanceCreator = function(options) {
  var bridgedbInstance = Object.create(Bridgedb);
  bridgedbInstance.init(options);
  return bridgedbInstance;
};

(function() {
  var isBrowser;
  // detect environment: browser vs. Node.js
  // I would prefer to use the code from underscore.js or lodash.js, but it doesn't appear to work for me,
  // possibly because I'm using browserify.js and want to detect browser vs. Node.js, whereas
  // the other libraries are just trying to detect whether we're in CommonJS or not.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    isBrowser = true;
  }

  if (!isBrowser) {
    module.exports = BridgedbInstanceCreator;
  } else {
    window.Bridgedb = BridgedbInstanceCreator;
  }
}).call(this);

