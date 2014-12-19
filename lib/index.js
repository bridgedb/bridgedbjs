var _ = require('lodash');
var config = require('./config.js');
var EntityReference = require('./entity-reference.js');
var internalContext = require('./context.json');
var Dataset = require('./dataset.js');
var Organism = require('./organism.js');
var Utils = require('./utils.js');
var Xref = require('./xref.js');

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#the-context|@context} indicates an object with information for
 *    identifying or defining terms used in the data. The data is just regular JSON, so you can safely ignore the
 *    context. If you choose to use the context, you can work with JSON-LD tools to view the JSON as
 *    Linked Open Data.
 * @typedef {String|Object|Array<String>|Array<Object>} JsonldContext
*/

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#iris|@id} indicates a unique identifier for a
 *                      concept or thing. In JSON-LD terms, this unique identifier is called an IRI,
 *                      which is usually a persistent (stable) URL. You can safely ignore this if
 *                      you don't care about JSON-LD.
 *                      @example http://identifiers.org/ncbigene/1234
 * @typedef {String} Iri
*/

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#typed-values|@type} sets data types in JSON-LD.
 *                      You can safely ignore this if you don't care about JSON-LD.
 * @typedef {String|String[]} JsonldType
*/

/**
 * {@link http://nodejs.org/api/stream.html|Node.js stream}. This library additionally uses
 *      {@link http://highlandjs.org/|highland} for easier stream handling, so you can use
 *      the highland methods on all streams returned.
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
 *   baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
 *   datasetsMetadataIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
 * });
 *
 * @param {object} [options] Overwrite any or all of the defaults in [config.js]{@link config}
 * @param {string} [options.baseIri='http://webservice.bridgedb.org/'] Base IRI (URL) for your BridgeDb
 *                webservice instance. One use for this option is defining a CORS proxy to support in-browser
 *                usage, because the BridgeDb webservice does not currently support CORS.
 * @param {string} [options.datasetsMetadataIri='https://raw.githubusercontent.com/bridgedb/BridgeDb/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt'] Location
 *                  (URL) of the datasources.txt file that contains metadata for selected biological datasets.
 *                  This metadata includes information such as name (e.g., Entrez Gene),
 *                  Miriam identifier (e.g., urn:miriam:ncbigene) and BridgeDb system code (e.g., L).
 * @param {string} [options.organism] Full name in Latin, e.g., Homo sapiens. Each bridgedbjs instance
 *                                    has one organism associated with it. Specifying it here will result
 *                                    in faster response times, because bridgedbjs will not have to infer
 *                                    it from the other provided data.
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
