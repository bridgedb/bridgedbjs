var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var jsonld = require('jsonld');
var internalContext = require('./context.json');
var EntityReferenceService = require('./entity-reference-service.js');
var MetadataService = require('./metadata-service.js');
var OrganismService = require('./organism-service.js');
var Utilities = require('./utilities.js');
var XrefService = require('./xref-service.js');

var compactStreaming = highland.wrapCallback(jsonld.compact);
/*
.errors(function (err, push) {
  console.log(err);
  console.log('in compactStreaming()');
  // do nothing. this just filters out errors.
});
//*/

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

    // TODO the contexts are not fully thought out WRT multi-instance.
    var that = this;

    var inputContext = options.inputContext || {
      '@vocab':internalContext['@vocab'],
      bridgedbInput:internalContext.bridgedbInput
    };
    var outputContext = options.outputContext || {};

    var compactInputWithCallback = function(doc, compactInputCallback) {
      console.log('doc as input');
      console.log(JSON.stringify(doc, null, 2));
      //inputContext = Utilities.defaultsDeep(inputContext || {}, doc['@context']);
      /*
      inputContext = inputContext || [];
      inputContext = _.isArray(inputContext) ? inputContext : [inputContext];
      //*/

      /*
      var docOriginalContext = doc['@context'];
      var docPrimaryContext;
      if (!docOriginalContext) {
        docOriginalContext = doc['@context'] = [{'@vocab': 'http://www.example.org/bridgedb/input-vocab/'}];
      } else if (_.isPlainObject(docOriginalContext)) {
        doc['@context'].bridgedbInput = {
          '@id':docPrimaryContext['@vocab'],
          '@type':'@id'
        };
        docOriginalContext = [doc['@context']];
      } else {
        docPrimaryContext = _.isArray(docOriginalContext) ? docOriginalContext[docOriginalContext.length - 1] : docOriginalContext;
        docPrimaryContext.bridgedbInput = {
          '@id':docPrimaryContext['@vocab'],
          '@type':'@id'
        };
        // TODO does this change doc['@context'] ?
      }
      doc['@context'].unshift(inputContext);
      //*/

      var docOriginalContext = doc['@context'] = _([
        inputContext,
        doc['@context']
      ]).flatten().compact().value();

      //* TODO This seems like a kludge. Is there a better way to handle this?
      var docKeys = _.keys(doc);
      var preferredPrefixContext = {};
      // If the input only has properties @context and @id, it will just be an empty array after being expanded.
      // The step below handles that case by adding a zero length string as the value for preferredPrefix.
      if (docKeys.length === 2) {
        doc.preferredPrefix = '';
        doc['@context'].unshift({
          'idot': internalContext.idot,
          'preferredPrefix': internalContext.preferredPrefix
        });
      }
      //*/

      jsonld.compact(doc, internalContext, function(err, compacted) {
        compacted['bridgedbInput:originalContext'] = JSON.stringify(docOriginalContext);
        console.log('compacted input using internalContext');
        console.log(JSON.stringify(compacted, null, 2));
        return compactInputCallback(err, compacted);
      });

      /*
      jsonld.expand(doc, {keepFreeFloatingNodes:true}, function(err, expanded) {
        console.log('expanded input');
        console.log(expanded);
        jsonld.compact(expanded, internalContext, function(err, compacted) {
          compacted['bridgedbInput:originalContext'] = JSON.stringify(docOriginalContext);
          console.log('compacted input using internalContext');
          console.log(compacted);
          return compactInputCallback(err, compacted);
        });
      });
      //*/

      //doc['@context'] = inputContext;
      //that.config.inputContext = inputContext;
      /* TODO This seems like a kludge. Is there a better way to handle this?
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
      /*
      doc.originalContext = {
        '@context':doc['@context']
      };
      //*/

      /*
      console.log('doc2');
      console.log(JSON.stringify(doc, null, 2));
      jsonld.expand(doc, function(err, expanded) {
        console.log('expanded');
        console.log(JSON.stringify(expanded, null, 2));
      });
      //*/
      
      //*
      //compactStreaming(doc, internalContext).each(function(compacted) {
      /*
      jsonld.compact(doc, internalContext, function(err, compacted) {
        compacted['bridgedbInput:originalContext'] = JSON.stringify(doc['@context']);
        return compactInputCallback(err, compacted);
      });
      //*/
    };
    this.compactInput = highland.wrapCallback(compactInputWithCallback);

    var compactOutputWithCallback = function(doc, outputCallback) {
      console.log('doc1 output');
      console.log(JSON.stringify(doc, null, 2));

      var supplementedOutputContext = _([
        internalContext,
        JSON.parse(doc['bridgedbInput:originalContext']),
        outputContext
      ]).flatten().compact().value();
      delete doc['bridgedbInput:originalContext'];
      console.log('supplementedOutputContext');
      console.log(JSON.stringify(supplementedOutputContext, null, 2));
      
      jsonld.compact(doc, supplementedOutputContext, function(err, compacted) {
        console.log('compacted output');
        console.log(JSON.stringify(compacted, null, 2));
        return outputCallback(err, compacted);
      });
    };
    this.compactOutput = highland.wrapCallback(compactOutputWithCallback);

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

