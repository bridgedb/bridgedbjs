/// <reference path="../index.d.ts" />

/* @module EntityReference */

import * as _ from 'lodash';
import * as union from 'lodash/union';
import * as isPlainObject from 'lodash/isPlainObject';
import * as isString from 'lodash/isString';
import * as isArray from 'lodash/isArray';
import * as isFunction from 'lodash/isFunction';
import * as defaults from 'lodash/defaults';
import * as isEmpty from 'lodash/isEmpty';
import * as toPairs from 'lodash/toPairs';
import * as omit from 'lodash/omit';
import * as defaultsDeep from 'lodash/defaultsDeep';
import csv from 'csv-streamify';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/of';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/throw';

import 'rx-extra/add/operator/throughNodeStream';

var csvOptions = {objectMode: true, delimiter: '\t'};

/**
 * Used internally to create a new EntityReference instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var EntityReference = function(instance) {
  var config = instance.config;

  var jsonldRx = instance.jsonldRx;
  var internalContext = config.context;

  // We currently support identifiers.org and BridgeDb IRIs in this library.
  var iriParsers: Object = {
    'identifiers.org': function(iri) {
      iri = decodeURI(iri);
      /*
      var iriComponents = iri.split('identifiers.org');
      var iriPath = iriComponents[iriComponents.length - 1];

      var iriPathComponents = iriPath.split('/');
      var preferredPrefix = iriPathComponents[1];
      var identifier = iriPathComponents[2];
      //*/

      var preferredPrefix = decodeURIComponent(iri.match(/(identifiers.org\/)(.*)(?=\/.*)/)[2]);
      var identifier = decodeURIComponent(iri.match(/(identifiers.org\/.*\/)(.*)$/)[2]);

      return {
        isDataItemIn: {
          'id': 'http://identifiers.org/' + preferredPrefix + '/',
          preferredPrefix: preferredPrefix
        },
        identifier: identifier,
        'id': iri
      };
    },
    'bridgedb.org': function(iri) {
      iri = decodeURI(iri);
      var systemCode = decodeURIComponent(
          iri.match(/(bridgedb.org\/.*\/xrefs\/)(\w+)(?=\/.*)/)[2]);
      var identifier = decodeURIComponent(iri.match(/(bridgedb.org\/.*\/xrefs\/\w+\/)(.*)$/)[2]);
      return {
        organism: decodeURIComponent(iri.match(/(bridgedb.org\/)(.*)(?=\/xrefs)/)[2]),
        isDataItemIn: {
          alternatePrefix: [systemCode],
          systemCode: systemCode,
          exampleIdentifier: identifier,
        },
        identifier: identifier,
        bridgeDbXrefsIri: iri,
        xref: [iri]
      };
    }
  };

  /**
   * See {@link http://www.biopax.org/release/biopax-level3.owl#EntityReference|
   *          biopax:EntityReference}
   * @typedef {Object} EntityReference Entity reference with as many as possible of
   *                    the properties listed below.
   * @property {JsonldContext} @context JSON-LD context.
   * @property {Iri} id JSON-LD IRI.
   * @property {String} displayName See
   *    {@link http://www.biopax.org/release/biopax-level3.owl#displayName|biopax:displayName}
   * @property {String} db See {@link http://www.biopax.org/release/biopax-level3.owl#db|biopax:db}
   * @property {Datasource} isDataItemIn The datasource (database) for the identifier. See
   *                  {@link http://semanticscience.org/resource/SIO_001278|SIO:001278}
   * @property {Array<String>} xref List of IRIs (URLs) for getting Xrefs,
   *                      such as from the BridgeDb webservices or from mygene.info.
   * @property {String} identifier See {@link http://www.biopax.org/release/biopax-level3.owl#id|
   *                      biopax:id} @example: "1234".
   * @property {JsonldType} type Biological type. See
   *    {@link http://www.w3.org/TR/json-ld/#dfn-node-type|JSON-LD documentation}
  */

  /**
   * @private
   * Add an {@link Iri|IRI} to semantically identify the provided entity
   * reference, replacing previous one, if present.
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {Datasource} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.preferredPrefix
   * @return {EntityReference} {@link EntityReference} with an identifiers.org {@link Iri|id}.
   *                Additionally, "owl:sameAs" will be added if a previous, non-identifiers.org IRI
   *                was present. @example: "http://bio2rdf.org/ncbigene/1234".
   */
  function _addIdentifiersIri(entityReference: EntityReference) {
    var datasource = entityReference.isDataItemIn;
    if (!datasource || !datasource.preferredPrefix || !entityReference.identifier) {
      if (instance.debug) {
        var message = 'Could not add an identifiers.org IRI,' +
          ' because the provided entity' +
          ' reference was a datasource name and/or identifier.';
        console.warn(message);
        console.warn(entityReference);
      }
      return entityReference;
    }

    // If the entity reference has a non-identifiers ID, we will move
    // that ID to the property "owl:sameAs" and add an identifiers ID.
    if (!!entityReference.id &&
        entityReference.id.indexOf('identifiers.org') === -1) {
      if (!entityReference['owl:sameAs']) {
        entityReference['owl:sameAs'] = [];
      }
      entityReference['owl:sameAs'] =
        union(entityReference['owl:sameAs'], [entityReference.id]);
    }

    entityReference.id = encodeURI('http://identifiers.org/' +
      datasource.preferredPrefix + '/' +
      entityReference.identifier);
    return entityReference;
  }

  /**
   * Add BridgeDb IRI (URL) for getting xrefs for provided entity reference.
   *
   * If there is already an "xref" property, the following steps will occur:
   * 1) the value of the existing "xref" property will be converted to an array,
   *    unless it is already an array.
   * 2) If the BridgeDb IRI is already in the "xref" property, we're done.
   *    Otherwise, we add the BridgeDb Xrefs IRI (URL) as a new element in the array,
   *    keeping any existing xref elements.
   *
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {Organism} [organism]
   * @param {Datasource} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.systemCode
   * @return {EntityReference} entityReference {@link EntityReference} with
   *                    BridgeDb IRI (URL) added.
   */
  var _addBridgeDbXrefsIri = function(entityReference: EntityReference) {
    if (!entityReference ||
        !entityReference.organism ||
        !entityReference.isDataItemIn ||
        !entityReference.isDataItemIn.systemCode ||
        !entityReference.identifier) {
      if (instance.debug) {
        var message = 'Cannot add BridgeDb Xrefs IRI (URL).' +
          ' See bridgeDb.entityReference._addBridgeDbXrefsIri()' +
          ' method for required parameters';
        console.warn(message);
      }
      return entityReference;
    }

    var xrefs = entityReference.xref = jsonldRx.arrayifyClean(entityReference.xref);

    var bridgeDbXrefsIri = instance.xref._getBridgeDbIriByEntityReference(entityReference);
    if (xrefs.indexOf(bridgeDbXrefsIri) === -1) {
      xrefs.push(bridgeDbXrefsIri);
    }
    return entityReference;
  };

  /**
   * @private
   *
   * Enrich an entity reference using the metadata
   * for biological datasources from datasources.txt.
   *
   * @param {EntityReference} entityReference Expanded entity reference.
   * @return {Observable<EntityReference>} entityReference {@link EntityReference}
   *                                            enriched from data-sources.txt
   */
  function _enrichFromDatasource(entityReference: EntityReference) {
    var timeout = 5 * 1000;
    return instance.datasource.get(entityReference.isDataItemIn)
    .timeout(
        timeout * 0.9,
        Observable.throw(new Error('BridgeDb.entityReference._enrichFromDatasource timed out getting datasources.'))
    )
    .map(function(datasource) {
      entityReference.isDataItemIn = datasource;
      var typeFromDatasource = datasource.subject;
      if (!isEmpty(typeFromDatasource)) {
        typeFromDatasource = isArray(typeFromDatasource) ? typeFromDatasource : [typeFromDatasource];
        entityReference.type = union(
						jsonldRx.arrayify(entityReference.type),
						typeFromDatasource
				);
      }

      if (!!datasource.uriRegexPattern) {
        var directIri = _getDirectIri(entityReference.identifier, datasource);
        if (!entityReference.id && entityReference['@id']) {
          entityReference.id = directIri;
        } else {
          var owlSameAs = jsonldRx.arrayifyClean(entityReference['owl:sameAs'] || []);
          if (owlSameAs.indexOf(directIri) === -1) {
            owlSameAs.push(directIri);
          }
          entityReference['owl:sameAs'] = owlSameAs;
        }
        datasource.exampleResource = directIri;
      }

      return entityReference;
    })
    .map(_addIdentifiersIri)
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference._enrichFromDatasource';
      throw err;
    })
    .timeout(
        timeout,
        Observable.throw(new Error('BridgeDb.entityReference._enrichFromDatasource timed out.'))
    );
  }

  /**
   * Check whether an entity reference with the specified identifier is
   * known by the specified datasource.
   *
   * @param {String} systemCode
   * @param {String} identifier
   * @param {String|Organism} organism {@link Organism} or name in English or Latin or taxonomy IRI
   *       like {@link http://identifiers.org/taxonomy/9606|http://identifiers.org/taxonomy/9606}.
   * @return {Observable<Boolean>} exists Whether specified entity reference exists.
   */
  function exists(systemCode, identifier, organism) {
    return Observable.of(organism)
    .mergeMap(function(organismName) {
      var path = encodeURIComponent(organismName) +
        '/xrefExists/' + systemCode + '/' + identifier;
      var sourceUrl = config.baseIri + path;

			return Observable.ajax(sourceUrl)
			.map((ajaxResponse): string => ajaxResponse.xhr.responseText)
      .do(null, function(err) {
        err.message = err.message || '';
        err.message += ', observed in BridgeDb.EntityReference.exists from XHR request.';
        console.error(err.message);
        console.error(err.stack);
      })
      .map(function(buf) {
        // Determine whether the response is a string with the value "true"

        // NOTE: we use "replace" to strip out anything that would
        // make the Boolean determination incorrect, e.g., line breaks.
        var str = buf.toString().replace(/([^a-z])+/g, '');
        if (str === 'true') {
          return true;
        } else if (str === 'false') {
          return false;
        } else {
          var message = 'Unrecognized response: "' + buf.toString() + '" for ' + sourceUrl;
          throw new Error(message);
        }
      });
    })
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference.exists';
      throw err;
    });
  }

  /**
   * @private
   * Parse provided object or string to return a normalized entity reference
   * in the form of a JS object.
   * Uses only provided input -- no external data lookups.
   * Any provided names/values will be retained as-is, even if doing so prevents
   * other methods in this library from being able to access the data they require,
   * because this library does not clean or transform the input.
   *
   * @param {Object|String} entityReference {@see bridgeDb.entityReference.enrich()}
   *    for details on what constitutes a usable entityReference
   * @return {EntityReference} EntityReference Entity reference converted to object,
   *                      if required, and normalized.
   */
  function _expand(entityReference: string|EntityReference): EntityReference {
    // TODO should we even do this here?
    entityReference = _handleStringInput(entityReference);

    entityReference.type = jsonldRx.arrayifyClean(entityReference.type);
    if (entityReference.type.indexOf('EntityReference') === -1) {
      entityReference.type.push('EntityReference');
    }

    // TODO The code below might have duplication in looping (normalizing pairs),
    // which could be refactored to normalize just once to speed things up.

    // Check for existence of and attempt to parse identifiers.org IRI or BridgeDb Xref IRI (URL).
		toPairs(iriParsers)
    .find(function(iriParserPair: [string, Function]) {
      var iriPattern = new RegExp(iriParserPair[0]);
      var iri = toPairs(entityReference)
			.filter(function(pair) {
				return isString(pair[1]);
			})
			.find(function(value: string) {
        var valueNormalized = String(encodeURI(decodeURI(value))).toLowerCase();
        return iriPattern.test(valueNormalized);
      });

      if (!isEmpty(iri)) {
        iri = encodeURI(decodeURI(iri));
        var parsedIri = iriParserPair[1](iri);
        defaultsDeep(entityReference, parsedIri);
      }
      return iri;
    });

    var organism = entityReference.organism;
    if (!!organism) {
      instance.organism._setInstanceOrganism(organism, false);
    }

		var datasource = entityReference.isDataItemIn;
    if (isEmpty(datasource)) {
      datasource = {};
    } else if (isString(datasource)) {
      datasource = {
        id: datasource
      };
    }

		var conventionalName;
    var name;
		if (!isEmpty(datasource)) {
			name = datasource.name || datasource.conventionalName;

			if (!!name) {
				datasource.name = name;
			}
		}

    var identifier = entityReference.identifier;
    if (!!identifier) {
      datasource.exampleIdentifier = identifier;
    }

		entityReference.isDataItemIn = datasource;

    return entityReference;
  }

  /**
   * Get potential matches for a desired entity reference by free text search for matching
   * symbols or identifiers. See also
   * {@link
   * http://bridgedb.org/apidoc/2.0/org/bridgedb/IDMapper.html#freeSearch(java.lang.String,%20int)|
   * Java documentation}.
   * TODO the above link is dead. Where's the updated link?
   *
   * TODO: this might actually be attributeSearch, and freeSearch might be a different method,
   * one that corresponds to this webservice endpoint:
   * http://www.bridgedb.org/swagger/#!/Genes/get_organism_search_query
   * Was freeSearch changed to just be called "search"?
   *
   * @example
   * myBridgeDbInstance.entityReference.freeSearch({
   *   attribute: 'Nfkb1',
   *   organism: 'Mouse'
   * })
   * .subscribeOnNext(function(searchResult) {
   *   console.log('Result for Nfkb1');
   *   console.log(searchResult);
   * });
   *
   * @param {Object} args
   * @param {String} args.attribute - Attribute value to be used as search term
   * @param {String|Organism} organism {@link Organism} or name in English or Latin or taxonomy
   *  IRI like {@link http://identifiers.org/taxonomy/9606|http://identifiers.org/taxonomy/9606}.
   * @param {JsonldType} [args.type] - Entity reference type, such as ProteinReference,
   *              DnaReference, SmallMoleculeReference, etc.
   *              Not currently being used, but we might use it in the future to
   *              help narrow down the search results.
   * @param {String} [args.db] - Desired datasource name, such as Ensembl or Uniprot
   * @return {Observable<EntityReference>} entityReference {@link EntityReference}, enriched
   *                                    from data-sources.txt and BridgeDb organism data.
   */
  function freeSearch(args) {
    var attributeValue = args.attribute;
    var type = args.type;
    var organism = args.organism || instance.organism;

    if (!organism) {
      throw new Error('Missing argument "organism"');
    }

    return Observable.of(organism)
    .mergeMap(instance.organism._getInstanceOrganism)
		// TODO why do I need to specify organism as type below?
		// why doesn't it get that from instance.organism._getInstanceOrganism?
    .map(function(organism: organism) {
      return organism.nameLanguageMap.la;
    })
    .map(function(organismName) {
      var path = encodeURIComponent(organismName) +
        '/attributeSearch/' +
        encodeURIComponent(attributeValue);
      return config.baseIri + path;
    })
    .mergeMap(function(sourceUrl) {
      // TODO this is actually pausable
      return RxNode.fromUnpausableStream(
        hyperquest(sourceUrl, {
          withCredentials: false
        })
      );
    })
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference.freeSearch from XHR request.';
      console.error(err.message);
      console.error(err.stack);
    })
    .streamThrough(csv(csvOptions))
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference.freeSearch';
      throw err;
    })
    .map(function(array): EntityReference {
      return {
        identifier: array[0],
        displayName: array[2],
				isDataItemIn: {
					conventionalName: array[1]
				}
      };
    })
    .map(function(searchResult): EntityReference {
      // remove empty properties
      return omit(searchResult, function(value) {
        // Note: I intentionally used 'null' as
        // a string, not a native value, because
        // BridgeDb returns the string value
        return value === 'null';
      });
    })
    .mergeMap(function(searchResult) {
      // NOTE if we just call enrich like
      // .mergeMap(enrich);
      // then the index gets passed in
      // as the second parameter.
      return enrich(searchResult);
    })
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference.freeSearch';
      throw err;
    });
  }

  function _getDirectIri(identifier, datasource) {
    var uriRegexPattern = datasource.uriRegexPattern;
    var identifierPattern = datasource.identifierPattern;
    var identifierPatternWithoutBeginEndRestriction =
      instance.datasource._getIdentifierPatternWithoutBeginEndRestriction(
          identifierPattern);

    var directIri = uriRegexPattern
    .replace(identifierPatternWithoutBeginEndRestriction, identifier)
    .toString();

    return directIri;
  }

  function _handleStringInput(entityReference: string|EntityReference): EntityReference {
    if (!isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        // Convert input from IRI string to object
        return {
          'id': entityReference,
        };
      } else {
        console.error('insufficiently-specified entity reference:');
        console.error(entityReference);
        var message = [
          'Insufficient input data or incorrect format. Cannot identify',
          ' the specified entity reference (above)'
        ].join('');
        throw new Error(message);
      }
		}
		return entityReference;
  }

  /**
   * @param {Object} args
   * @param {String} args.targetPreferredPrefix The Miriam namespace /
   *    identifiers.org preferredPrefix.
   * @param {String|Object} args.sourceEntityReference @see bridgeDb.entityReference.enrich()
   *                        method for what constitutes a usable entityReference
   * @return {Observable<EntityReference>} entityReference One or more
   *    {@link EntityReference|entity references} with the target preferredPrefix.
   */
  function map(args) {
    var targetPreferredPrefix = args.targetPreferredPrefix;
    if (!targetPreferredPrefix) {
      throw new Error('targetPreferredPrefix missing');
    }

    return instance.xref.get(args.sourceEntityReference)
    .filter(function(entityReferenceXref) {
      return entityReferenceXref.isDataItemIn.preferredPrefix ===
        targetPreferredPrefix;
    })
    .do(null, function(err) {
      err.message = err.message || '';
      err.message += ', observed in BridgeDb.EntityReference.map';
      throw err;
    });
  }

  /**
   * Normalize object properties
   *
   * @param {String|Object} entityReference
   * @return {Observable<EntityReference>} Normalized {@link EntityReference}
   */
  function normalize(entityReference) {
    entityReference = _expand(entityReference);

    var organism = entityReference.organism;
    if (!!organism) {
      return Observable.of(entityReference)
      .mergeMap(instance.organism._getInstanceOrganism)
      .map(function(organism) {
        entityReference.organism = organism;
        return entityReference;
      })
      .do(null, function(err) {
        err.message = err.message || '';
        err.message += ', observed in BridgeDb.EntityReference.normalize';
        throw err;
      });
    } else {
      return Observable.of(entityReference)
      .do(null, function(err) {
        err.message = err.message || '';
        err.message += ', observed in BridgeDb.EntityReference.normalize';
        throw err;
      });
    }
    // TODO normalize db, identifier, etc.
  }

  return {
    exists:exists,
    _expand:_expand,
    freeSearch:freeSearch,
    map:map,
    normalize:normalize
  };
};

export default EntityReference;
