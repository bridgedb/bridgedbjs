var _ = require('lodash');
var config = require('./config.js');
var jsonld = require('jsonld');
var internalContext = require('./context.json');
var EntityReferenceService = require('./entity-reference-service.js');
var MetadataService = require('./metadata-service.js');
var OrganismService = require('./organism-service.js');
var Utilities = require('./utilities.js');
var XrefService = require('./xref-service.js');

var Bridgedb = {
  getEntityReferenceIdentifiersIri: function(metadataForDbName, dbId, callback) {
    var iri = metadataForDbName.linkoutPattern.replace('$id', dbId);
    return iri;
  },
  init: function(options) {
    options = options || {};
    this.config = Object.create(config);
    // TODO this isn't done yet.
    // we need to handle several cases.
    // 1. How do we not overwrite the user's property names if they conflict with what
    //    we are using, for example, a user could use "id" to refer to biopax:id and
    //    we might use "id" to refer to "@id".
    // 2. How do we handle cases where the user uses a different term from what we use,
    //    for example, we might use "identifier" to refer to biopax:id, but the user
    //    might have data that uses "ID".
    //
    // We need to consider a way to make these work for the case where the user's
    // data has a @context and for the case where the user just sets these values
    // as a configurable option.
    this.config = Utilities.defaultsDeep(options, this.config);

    var compactInputFull = function(internalContext, inputContext, doc) {
      console.log('doc1');
      console.log(doc);

      inputContext = Utilities.defaultsDeep({}, inputContext);
      inputContext = Utilities.defaultsDeep(inputContext, doc['@context']);

      if (!inputContext['@vocab']) {
        inputContext['@vocab'] = 'http://www.example.org/bridgedb/input-vocab/';
      } else {
        inputContext.bridgedbInput = {
          '@id':inputContext['@vocab'],
          '@type':'@id'
        };
      }

      doc['@context'] = inputContext;

      //* TODO This seems like a kludge. Is there a better way to handle this?
      var docKeys = _.keys(doc);
      var preferredPrefix = doc.preferredPrefix;
      // If the input only has properties @context and @id, it will just be an empty array after being expanded.
      // The step below handles that case by adding a zero length string as the value for preferredPrefix.
      if (docKeys.length === 2 && !preferredPrefix) {
        doc.preferredPrefix = '';
        if (!doc['@context'].preferredPrefix) {
          doc['@context'].idot = internalContext.idot;
          doc['@context'].preferredPrefix = internalContext.preferredPrefix;
        }
      }
      //*/
      console.log('doc2');
      console.log(JSON.stringify(doc, null, 2));
      /*
      jsonld.expand(doc, function(err, expanded) {
        console.log('expanded');
        console.log(JSON.stringify(expanded, null, 2));
      });
      //*/
      
      //*
      jsonld.compact(doc, internalContext, function(err, compacted) {
        console.log('compacted');
        console.log(JSON.stringify(compacted, null, 2));
      });
      //*/
    };

    this.compactInput = _.partial(compactInputFull, internalContext, this.config.inputContext);
    //this.compactOutput = _.partial(compactServiceFull, internalContext, this.config.context);

    this.organismService = Object.create(OrganismService(this));
    this.metadataService = Object.create(MetadataService(this));
    this.entityReferenceService = Object.create(EntityReferenceService(this));
    this.xrefService = Object.create(XrefService(this));
  },
  config: config,
  organismService: OrganismService(this),
  metadataService: MetadataService(this),
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

