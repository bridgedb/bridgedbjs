/// <reference path="../index.d.ts" />

/* @module main */


import * as clone from 'lodash/clone';
import * as defaultsDeep from 'lodash/defaultsDeep';
import * as config from './config';
import EntityReference from './entity-reference';
import Datasource from './datasource';
import Organism from './organism';
import Xref from './xref';

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#the-context|@context} indicates
 *    an object with information for identifying or defining terms used in the data.
 *    The data is just regular JSON, so you can safely ignore the context. If you
 *    choose to use the context, you can work with JSON-LD tools to view the JSON as
 *    Linked Open Data.
 * @typedef {String|Object|Array<String>|Array<Object>} JsonldContext
*/

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#iris|id} indicates a unique identifier for a
 *                      concept or thing. In JSON-LD terms, this unique identifier is called an IRI,
 *                      which is usually a persistent (stable) URL. You can safely ignore this if
 *                      you don't care about JSON-LD.
 *                      @example http://identifiers.org/ncbigene/1234
 * @typedef {String} Iri
*/

/**
 * The keyword {@link http://www.w3.org/TR/json-ld/#typed-values|type} sets data types in JSON-LD.
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
 * var myBridgeDbInstance = new BridgeDb({
 *   baseIri: 'http://webservice.bridgedb.org/', // Optional
 *   datasourcesMetadataIri:
 *    'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'  // Optional
 * });
 *
 * @param {object} [options] Overwrite any or all of the defaults in [config.js]{@link config}
 * @param {string} [options.baseIri='http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/'] Base
 *    IRI (URL) for your BridgeDb webservice instance.
 *    TODO Enable CORS at bridgedb.org, because the default should be
 *    'http://webservice.bridgedb.org/', but we are forced to use pointer as
 *    a proxy for now for CORS so that web browsers can access the data.
 * @param {string} [options.datasourcesMetadataIri=
 *    'https://cdn.rawgit.com/bridgedb/BridgeDb/master/org.bridgedb.bio/
 *        resources/org/bridgedb/bio/datasources.txt'] Location
 *    (URL) of the datasources.txt file that contains metadata for selected biological datasources.
 *    This metadata includes information such as name (e.g., Entrez Gene),
 *    Miriam identifier (e.g., urn:miriam:ncbigene) and BridgeDb system code (e.g., L).
 * @param {string} [options.organism] Full name in Latin, e.g., Homo sapiens.
 *    Each bridgedbjs instance has one organism associated with it.
 *    Specifying it here will result in faster response times, because bridgedbjs
 *    will not have to infer it from the other provided data.
 * @param {string|object|string[]|object[]} [options.context] default context to use
 */
var BridgeDb = function(options) {
  var instance = this;
  options = options || {};
  instance.config = clone(config);
  instance.config = defaultsDeep(options, instance.config);

  var internalContext = options.context;

  instance.entityReference = Object.create(EntityReference(instance));
  instance.entityReference = Object.create(EntityReference(instance));
  instance.organism = Object.create(Organism(instance));
  if (!!options.organism) {
    instance.organism._setInstanceOrganism(options.organism, false);
  }

  instance.datasource = Object.create(Datasource(instance));
  instance.xref = Object.create(Xref(instance));
};

export default BridgeDb;
