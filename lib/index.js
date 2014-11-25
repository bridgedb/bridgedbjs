var _ = require('lodash');
var config = require('./config.js');
var EntityReference = require('./entity-reference.js');
var internalContext = require('./context.json');
var DataSource = require('./data-source.js');
var Organism = require('./organism.js');
var Utilities = require('./utilities.js');
var Xref = require('./xref.js');

/**
 * Creates a new BridgeDb instance.
 * There is no need to use the "new" keyword.
 * @class
 *
 * @example
 * BridgeDb = require('bridgedb'); // Only needed if using Node.js.
 * var myBridgeDbInstance = BridgeDb({
 *   apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
 *   dataSourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
 * });
 *
 * @param {object} [options] Overwrite any or all of the properties in [config.js]{@link config}
 */
var BridgeDb = function(options) {
  var bridgedbInstance = {};
  options = options || {};
  bridgedbInstance.config = Object.create(config);
  bridgedbInstance.config =
    Utilities.defaultsDeep(options, bridgedbInstance.config);

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

  bridgedbInstance.entityReference =
    Object.create(EntityReference(bridgedbInstance));
  bridgedbInstance.organism =
    Object.create(Organism(bridgedbInstance));
  bridgedbInstance.dataSource =
    Object.create(DataSource(bridgedbInstance));
  bridgedbInstance.xref = Object.create(Xref(bridgedbInstance));

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
    module.exports = BridgeDb;
  } else {
    window.BridgeDb = BridgeDb;
  }
}).call(this);
