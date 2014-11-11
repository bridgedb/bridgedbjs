var _ = require('lodash');
var config = require('./config.js');
var EntityReferenceService = require('./entity-reference-service.js');
var internalContext = require('./context.json');
var DatabaseService = require('./database-service.js');
var OrganismService = require('./organism-service.js');
var Utilities = require('./utilities.js');
var XrefService = require('./xref-service.js');

var Bridgedb = {
  init: function(options) {
    options = options || {};
    this.config = Object.create(config);
    this.config = Utilities.defaultsDeep(options, this.config);

    this.organismService = Object.create(OrganismService(this));
    this.databaseService = Object.create(DatabaseService(this));
    this.entityReferenceService = Object.create(EntityReferenceService(this));
    this.xrefService = Object.create(XrefService(this));
  },
  config: config,
  addContext: function(inputDoc) {
    // it would be better to reference the context with a URL
    var context = inputDoc['@context'] || [];
    context = _.isArray(context) ? context : [context];
    context.push(internalContext);
    var outputDoc = {
      '@context':context
    };
    return _.defaults(outputDoc, inputDoc);
  },
  organismService: OrganismService(this),
  databaseService: DatabaseService(this),
  entityReferenceService: EntityReferenceService(this),
  xrefService: XrefService(this)
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

