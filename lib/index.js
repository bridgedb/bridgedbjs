var _ = require('lodash');
var config = require('./config.js');
var EntityReference = require('./entity-reference.js');
var internalContext = require('./context.json');
var Dataset = require('./dataset.js');
var Organism = require('./organism.js');
var Utils = require('./utils.js');
var Xref = require('./xref.js');

/**
 * In JSON-LD, a {@link http://www.w3.org/TR/json-ld/#the-context|@context} adds semantic
 *                      information to regular JSON. You can safely ignore this if you don't care about JSON-LD.
 * @typedef {Object} JsonldContext
*/

/**
 * In JSON-LD, an {@link http://www.w3.org/TR/json-ld/#iris|@id} is an IRI (usually a persistent URL) used
 *                      to uniquely identify a concept or thing.
 *                      You can safely ignore this if you don't care about JSON-LD.
 *                      @example http://identifiers.org/ncbigene/1234
 * @typedef {String} Iri
*/

/**
 * {@link http://nodejs.org/api/stream.html|Node.js stream}. This library additionally uses {@link http://highlandjs.org/|highland}
 * for easier stream handling, so you can use the highland methods on all streams returned.
 * @typedef Stream
*/

/**
 * Creates a new BridgeDb instance.
 * There is no need to use the "new" keyword.
 * @class
 *
 * @example
 * BridgeDb = require('bridgedb'); // Only needed if using Node.js.
 * var myBridgeDbInstance = BridgeDb({
 *   apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
 *   datasetsUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
 * });
 *
 * @param {object} [options] Overwrite any or all of the defaults in [config.js]{@link config}
 * @param {string} [options.apiUrlStub='http://webservice.bridgedb.org'] Base URL for your BridgeDb webservices. One use
 *                can be for defining a CORS proxy to handle in-browser usage.
 * @param {string} [options.datasetsUrl='https://raw.githubusercontent.com/bridgedb/BridgeDb/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt'] Location of the datasources.txt file.
 * @param {string} [options.organism] Full name in Latin. Each instance has an organism associated with it. Specifying it here will result in faster responses.
 */
var BridgeDb = function(options) {
  var instance = {};
  options = options || {};
  instance.config = Object.create(config);
  instance.config =
    Utils._defaultsDeep(options, instance.config);

  instance.addContext = function(inputDoc) {
    // it would be better to reference the context with a URL
    var context = inputDoc['@context'] || [];
    context = _.isArray(context) ? context : [context];
    context = context.concat(internalContext);
    var outputDoc = {
      '@context':context
    };
    return _.defaults(outputDoc, inputDoc);
  };

  instance.entityReference =
    Object.create(EntityReference(instance));
  instance.organism =
    Object.create(Organism(instance));
  if (!!options.organism) {
    instance.organism._setInstanceOrganismName(options.organism, false);
  }

  instance.dataset =
    Object.create(Dataset(instance));
  instance.xref = Object.create(Xref(instance));

  return instance;
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
    module.exports = BridgeDb;
  } else {
    window.BridgeDb = BridgeDb;
  }
}).call(this);
