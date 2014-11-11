var _ = require('lodash');
var config = require('./config.js');
var EntityReferenceService = require('./entity-reference-service.js');
var internalContext = require('./context.json');
var DatabaseService = require('./database-service.js');
var OrganismService = require('./organism-service.js');
var Utilities = require('./utilities.js');
var XrefService = require('./xref-service.js');

/**
 * Creates a new Bridgedb instance.
 * There is no need to use the "new" keyword.
 * @class
 *
 * Installation
 * Browser: <script src="https://bridgedb.github.io/bridgedbjs/dist/index.js"></script>
 * Node.js: npm install bridgedb/bridgedbjs
 *
 * @example
 * Bridgedb = require('bridgedb'); // Only needed if using Node.js.
 * var myBridgedbInstance = Bridgedb({
 *   apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
 *   datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
 * });
 * myBridgedbInstance.entityReferenceService.searchByAttribute({
 *   attribute: 'Nfkb1',
 *   organism: 'Mouse'
 * }).each(function(searchResults) {
 *   console.log('Result for Nfkb1');
 *   console.log(searchResults);
 * });
 * 
 * // Anywhere the return type is listed as a Stream, use "each" as shown above.
 *
 * @param {object} [ options ] - Overwrite any or all of the properties in [config.js]{@link config}
 */
var Bridgedb = function(options) {
  /*
  (function() {
    options = options || {};
    this.config = Object.create(config);
    this.config = Utilities.defaultsDeep(options, this.config);

    this.organismService = Object.create(OrganismService(this));
    this.databaseService = Object.create(DatabaseService(this));
    this.entityReferenceService = Object.create(EntityReferenceService(this));
    this.xrefService = Object.create(XrefService(this));
  })();
  //*/
  var bridgedbInstance = {};
  options = options || {};
  bridgedbInstance.config = Object.create(config);
  bridgedbInstance.config = Utilities.defaultsDeep(options, bridgedbInstance.config);

  bridgedbInstance.addContext = function(inputDoc) {
    // it would be better to reference the context with a URL
    var context = inputDoc['@context'] || [];
    context = _.isArray(context) ? context : [context];
    context.push(internalContext);
    var outputDoc = {
      '@context':context
    };
    return _.defaults(outputDoc, inputDoc);
  };

  bridgedbInstance.entityReferenceService = Object.create(EntityReferenceService(bridgedbInstance));
  bridgedbInstance.organismService = Object.create(OrganismService(bridgedbInstance));
  bridgedbInstance.databaseService = Object.create(DatabaseService(bridgedbInstance));
  bridgedbInstance.xrefService = Object.create(XrefService(bridgedbInstance));

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
    module.exports = Bridgedb;
  } else {
    window.Bridgedb = Bridgedb;
  }
}).call(this);

