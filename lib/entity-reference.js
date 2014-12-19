/* @module EntityReference */

var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utils = require('./utils.js');

/**
 * Used internally to create a new EntityReference instance
 * @class
 * @protected
 * @memberof BridgeDb
 * @param {Object} instance
 */
var EntityReference = function(instance) {
  'use strict';

  /**
   * See {@link http://www.biopax.org/release/biopax-level3.owl#EntityReference|biopax:EntityReference}
   * @typedef {Object} EntityReference Entity reference with as many as possible of the properties listed below.
   * @property {JsonldContext} @context JSON-LD context.
   * @property {Iri} @id JSON-LD IRI.
   * @property {String} displayName See {@link http://www.biopax.org/release/biopax-level3.owl#displayName|biopax:displayName}
   * @property {String} db See {@link http://www.biopax.org/release/biopax-level3.owl#db|biopax:db}
   * @property {Dataset} inDataset The dataset (database) for the identifier. See
   *                  {@link http://rdfs.org/ns/void#inDataset|void:inDataset}
   * @property {Array<String>} xref URL for getting Xrefs, such as from the BridgeDb webservices.
   * @property {String} identifier See {@link http://www.biopax.org/release/biopax-level3.owl#id|biopax:id}
   * @property {JsonldType} @type Biological type. See {@link http://www.w3.org/TR/json-ld/#dfn-node-type|JSON-LD documentation}
  */

  /**
   * @private
   * Add an {@link Iri|IRI} to semantically identify the provided entity
   * reference, replacing previous one, if present.
   *
   * @param {Object} entityReference
   * @param {Dataset} entityReference.inDataset The dataset (database) for the identifier. See
   *                  {@link http://rdfs.org/ns/void#inDataset|void:inDataset}
   * @param {String} entityReference.inDataset.preferredPrefix Example: "ncbigene"
   * @param {String} entityReference.identifier Example: "1234"
   * @return {EntityReference} {@link EntityReference} with an identifiers.org {@link Iri|@id}.
   *                            Additionally, "owl:sameAs" will be added if a previous, non-identifiers.org IRI
   *                            was present. @example: "http://bio2rdf.org/ncbigene/1234".
   */
  function _addIdentifiersIri(entityReference) {
    var dataset = entityReference.inDataset;
    if (!dataset || !dataset.preferredPrefix || !entityReference.identifier) {
      if (instance.debug) {
        var message = 'Could not add an identifiers.org IRI,' +
          ' because the provided entity' +
          ' reference was a dataset name and/or identifier.';
        console.warn(message);
        console.log(entityReference);
      }
      return entityReference;
    }

    if (!!entityReference['@id'] &&
        entityReference['@id'].indexOf('identifiers.org') === -1) {
      if (!entityReference['owl:sameAs']) {
        entityReference['owl:sameAs'] = [];
      }
      entityReference['owl:sameAs'].push(entityReference['@id']);
    }

    entityReference['@id'] = 'http://identifiers.org/' +
      dataset.preferredPrefix + '/' +
      entityReference.identifier;
    return entityReference;
  }

  /**
   * Add BridgeDb URL for getting xrefs for provided entity reference.
   * If there is already an "xref" property, its value will be converted to
   * an array, if needed, and the BridgeDb Xrefs URL will be added as a new element,
   * keeping any existing xref elements.
   *
   * @private
   *
   * @param {Object} entityReference
   * @param {String} entityReference.organism Organism name in Latin or English
   * @param {Dataset} entityReference.inDataset The dataset (database) for the identifier. See
   *                  {@link http://rdfs.org/ns/void#inDataset|void:inDataset}
   * @param {Array<String>} entityReference.inDataset.alternatePrefix The first element must be the BridgeDb systemCode
   * @param {String} entityReference.identifier
   * @return {Object} entityReference {@link EntityReference} with BridgeDb URL added.
   */
  var _addBridgeDbXrefsUrl = function(entityReference) {
    if (!entityReference ||
        !entityReference.organism ||
        !entityReference.inDataset ||
        !entityReference.inDataset.alternatePrefix ||
        !entityReference.identifier) {
      if (instance.debug) {
        var message = 'Cannot add BridgeDb Xrefs URL.' +
          ' See bridgeDb.entityReference._addBridgeDbXrefsUrl()' +
          ' method for required parameters';
        console.warn(message);
      }
      return entityReference;
    }
    entityReference.xref = entityReference.xref || [];
    var xrefs = entityReference.xref;
    xrefs = _.isArray(xrefs) ? xrefs : [xrefs];
    var bridgeDbXrefsUrl =
      instance.xref._getBridgeDbUrlByEntityReference(entityReference);
    xrefs.push(bridgeDbXrefsUrl);
    return entityReference;
  };

  /**
   * Create a Node.js/Highland stream through which entity references
   * can be piped to enrich each one with data from BridgeDb.
   *
   * @param {Object} [options]
   * @param {Boolean} [options.organism=true] Enrich with organism name.
   * @param {Boolean} [options.context=true] Enrich with JSON-LD @context.
   * @param {Boolean} [options.dataset=true] Enrich from data-sources.txt
   *                         (metadata about biological datasets).
   * @param {Boolean} [options.bridgeDbXrefsUrl=true] Enrich with URL for BridgeDb webservices
   *                                        to enable getting xrefs for this entity reference.
   * @return {Stream} entityReferenceTransformationStream
   */
  var createEnrichmentStream = function(options) {
    return highland.pipeline(function(sourceStream) {
      options = options || {};
      var enrichWithProvidedOptions = highland.partial(
        highland.flip(enrich),
        options
      );
      return highland(sourceStream).flatMap(enrichWithProvidedOptions);
    });
  };

  /**
   * Enrich entity reference. Default is to enrich as much as possible as much as possible
   * with data from BridgeDb, with the exception of not getting xrefs, but the data included
   * for enrichment can be controlled by setting options.include.
   *
   * @param {(Object|String|Stream)} input Entity reference(s). Each one must have an identifier
   * (e.g. ENSG00000160791) and means for identifying the dataset.
   *
   *    Acceptable entityReference input arguments:
   *      1. BridgeDb xrefs URL or identifiers.org IRI as string
   *      2. Object with at least one of these properties:
   *        a. { '@id': identifiers.org IRI }
   *        b. { bridgeDbXrefsUrl: BridgeDb xrefs URL }
   *        c. { xref: [
   *            BridgeDb xrefs URL
   *            ...
   *          ]
   *        }
   *      3. Object with both of these properties:
   *        {
   *          db: database name as specified in datasources.txt
   *          identifier: entity reference identifier, such as ChEBI:1234
   *        }
   *
   *    Example of BridgeDb xrefs URL: http://webservice.bridgedb.org/Human/xrefs/L/1234
   *    Example of identifiers.org IRI: http://identifiers.org/ncbigene/1234
   *
   * @param {Object} [options]
   * @param {Boolean} [options.organism=true] Enrich with organism name.
   * @param {Boolean} [options.context=true] Enrich with JSON-LD @context.
   * @param {Boolean} [options.dataset=true] Enrich from data-sources.txt
   *                         (metadata about biological datasets).
   * @param {Boolean} [options.bridgeDbXrefsUrl=true] Enrich with URL for BridgeDb webservices
   *                                        to enable getting xrefs for this entity reference.
   * @return {Stream<EntityReference>} entityReference {@link EntityReference} with as many properties
   *                                  as possible added.
   */
  var enrich = function(input, options) {
    var inputStream;
    if (_.isString(input) || _.isPlainObject(input)) {
      inputStream = highland([input]);
    } else if (_.isArray(input)) {
      inputStream = highland(input);
    } else if (highland.isStream(input)) {
      inputStream = input;
    }
    options = options || {};
    options = _.defaults(options, {
      organism: true,
      context: true,
      dataset: true,
      bridgeDbXrefsUrl: true
    });

    return inputStream.map(_expand)
    .map(function(entityReference) {
      if (!entityReference.inDataset ||
        typeof entityReference.identifier === 'undefined') {
        var message = 'Not enough data provided to identify' +
          ' the specified entity reference: "' +
          JSON.stringify(entityReference) + '"';
        throw new Error(message);
      }

      return entityReference;
    })
    .flatMap(function(entityReference) {
      if (options.dataset) {
        return highland([entityReference]).flatMap(_enrichFromDataset);
      } else {
        return highland([entityReference]);
      }
    })
    .flatMap(function(entityReference) {
      if (options.organism) {
        return highland([entityReference])
        .flatMap(function(entityReference) {
          return instance.organism._getInstanceOrganismName(
            entityReference, 'EntityReference');
        })
        .map(function(organismName) {
          if (!!organismName) {
            entityReference.organism = organismName;
          }
          return entityReference;
        });
      } else {
        return highland([entityReference]);
      }
    })
    .map(function(entityReference) {
      if (options.bridgeDbXrefsUrl) {
        return _addBridgeDbXrefsUrl(entityReference);
      } else {
        return entityReference;
      }
    })
    .map(function(entityReference) {
      if (options.context) {
        return instance.addContext(entityReference);
      } else {
        return entityReference;
      }
    });
  };

  /**
   * @private
   *
   * Enrich an entity reference using the metadata
   * for biological datasets from datasources.txt.
   *
   * @param {Object} entityReference Expanded entity reference.
   * @return {Stream<EntityReference>} entityReference {@link EntityReference} enriched from data-sources.txt
   */
  function _enrichFromDataset(entityReference) {
    var datasetsStream =
      instance.dataset.getOne(entityReference.inDataset);

    return datasetsStream.map(function(dataset) {
      entityReference.inDataset = dataset;
      entityReference.db = entityReference.db || dataset.name[0];
      var type = dataset['@type'];
      if (!_.isEmpty(type)) {
        type = _.isArray(type) ? type : [type];
        entityReference['@type'] = Utils._arrayify(entityReference['@type'])
        .concat(type);
      }

      //*
      if (!!dataset.uriRegexPattern) {
        var directIri = _getDirectIri(entityReference.identifier, dataset);
        if (!entityReference['@id']) {
          entityReference['@id'] = directIri;
        } else {
          entityReference['owl:sameAs'] = entityReference['owl:sameAs'] || [];
          entityReference['owl:sameAs'].push(directIri);
        }
        dataset.exampleResource = directIri;
      }
      //*/

      return entityReference;
    })
    .map(_addIdentifiersIri);
  }

  /**
   * Check whether an entity reference with the specified identifier is known by the specified dataset.
   *
   * @param {String} bridgeDbSystemCode
   * @param {String} identifier
   * @param {String} organism Name in English or Latin
   * @return {Stream<Boolean>} exists Whether specified entity reference exists.
   */
  function exists(bridgeDbSystemCode, identifier, organism) {
    var path = '/' + encodeURIComponent(organism) +
      '/xrefExists/' + bridgeDbSystemCode + '/' + identifier;
    var source = instance.config.baseIri + path;

    return highland(request({
      url: source,
      withCredentials: false
    })).map(function(buf) {
      // NOTE: we use "replace" to strip out anything that would make the Boolean determination incorrect,
      // e.g., like line breaks.
      var str = buf.toString().replace(/([^a-z])+/g, '');
      return str === 'true';
    });
  }

  /**
   * @private
   * Parse provided object or string to return a normalized entity reference in the form of a JS object.
   * Uses only provided input -- no external data lookups.
   * Any provided names/values will be retained as-is, even if doing so prevents
   * other methods in this library from being able to access the data they require,
   * because this library does not clean or transform the input.
   *
   * @param {Object|String} entityReference {@see bridgeDb.entityReference.enrich()} for details on what
   *                      constitutes a usable entityReference
   * @return {EntityReference} EntityReference Entity reference converted to object, if required, and normalized.
   */
  function _expand(entityReference) {
    if (!_.isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        // Convert input from string to object
        entityReference = {entityReference: entityReference};
      } else {
        var message = 'Not enough data provided to identify' +
          ' the specified entity reference: "' +
          JSON.stringify(entityReference) + '"';
        throw new Error(message);
      }
    }

    // TODO this code might have duplication in looping (normalizing pairs),
    // which could be refactored to normalize just once to speed things up.

    // Check for existence of and attempt to parse identifiers.org IRI or BridgeDb Xref URL.
    _(iriParserPairs).map(function(iriParserPair) {
      var iriPattern = new RegExp(iriParserPair[0]);
      var iri = _.find(entityReference, function(value) {
        var valueNormalized = String(value).toLowerCase();
        return iriPattern.test(valueNormalized);
      });

      if (!_.isEmpty(iri)) {
        _.defaults(entityReference, iriParserPair[1](iri));
      }
    });

    var organism = entityReference.organism;
    if (!!organism && _.isEmpty(instance.organism.organismNameNormalized)) {
      instance.organism._setInstanceOrganismName(organism, false);
    }

    entityReference.inDataset = entityReference.inDataset || {};

    var datasetName = entityReference.db ||
      (!!entityReference.inDataset.name && entityReference.inDataset.name);

    if (!!datasetName) {
      entityReference.db = datasetName;
      entityReference.inDataset.name = datasetName;
    }

    var identifier = entityReference.identifier;
    if (!!identifier) {
      entityReference.inDataset.exampleIdentifier = identifier;
    }

    return entityReference;
  }

  /**
   * Get potential matches for a desired entity reference by free text search for matching symbols or identifiers. See also
   * {@link http://bridgedb.org/apidoc/2.0/org/bridgedb/IDMapper.html#freeSearch(java.lang.String,%20int)|Java documentation}.
   *
   * @example
   * myBridgeDbInstance.entityReference.freeSearch({
   *   attribute: 'Nfkb1',
   *   organism: 'Mouse'
   * }).each(function(searchResult) {
   *   console.log('Result for Nfkb1');
   *   console.log(searchResult);
   * });
   *
   * @param {Object} args
   * @param {String} args.attribute - Attribute value to be used as search term
   * @param {String} args.organism - Organism name. Currently only accepting Latin and English.
   * @param {String} [args.type] - Entity reference type, such as Protein, Dna, SmallMolecule, etc.
   *                               Not currently being used, but we might use it in the future to
   *                               help narrow down the search results.
   * @param {String} [args.db] - Desired dataset name, such as Ensembl or Uniprot
   * @return {Stream<EntityReference>} entityReference {@link EntityReference}, enriched from data-sources.txt and BridgeDb organism data.
   */
  function freeSearch(args) {
    var attributeValue = args.attribute;
    var type = args.type;
    var organism = args.organism;

    if (!organism) {
      throw new Error('Missing argument "organism"');
    }

    return highland([organism])
    .flatMap(instance.organism._setInstanceOrganismName)
    // get the BridgeDb path
    .map(function(organismNameNormalized) {
      var path = '/' + encodeURIComponent(organismNameNormalized) +
        '/attributeSearch/' +
        encodeURIComponent(attributeValue);
      return instance.config.baseIri + path;
    })
    .flatMap(function(source) {
      return highland(request({
        url: source,
        withCredentials: false
      })
      .pipe(csv(csvOptions)));
    })
    .map(function(array) {
      return array;
    })
    .errors(function(err, push) {
      console.log(err);
      console.log('in entityReference.freeSearch()');
    })
    .map(function(array) {
      return {
        identifier: array[0],
        db: array[1],
        displayName: array[2]
      };
    })
    .map(function(searchResult) {

      // remove empty properties

      searchResult = _.omit(searchResult, function(value) {
        // Note: I intentionally used 'null' as
        // a string, not a native value, because
        // BridgeDb returns the string value
        return value === 'null';
      });

      return searchResult;
    })
    .flatMap(enrich);
  }

  function _getDirectIri(identifier, dataset) {
    var uriRegexPattern = dataset.uriRegexPattern;
    var identifierPattern = dataset.identifierPattern;
    var identifierPatternWithoutBeginEndRestriction =
      instance.dataset._getIdentifierPatternWithoutBeginEndRestriction(
          identifierPattern);

    var directIri = uriRegexPattern
    .replace(identifierPatternWithoutBeginEndRestriction, identifier)
    .toString();

    return directIri;
  }

  // We currently only support identifiers.org and BridgeDb IRIs in this library.
  var iriParsers = {
    'identifiers.org': function(iri) {
      /*
      var iriComponents = iri.split('identifiers.org');
      var iriPath = iriComponents[iriComponents.length - 1];

      var iriPathComponents = iriPath.split('/');
      var preferredPrefix = iriPathComponents[1];
      var identifier = iriPathComponents[2];
      //*/

      var preferredPrefix = iri.match(/(identifiers.org\/)(.*)(?=\/.*)/)[2];
      var identifier = iri.match(/(identifiers.org\/.*\/)(.*)$/)[2];

      return {
        inDataset: {
          '@id': 'http://identifiers.org/' + preferredPrefix,
          preferredPrefix: preferredPrefix
        },
        identifier: identifier,
        '@id': iri
      };
    },
    'bridgedb.org': function(iri) {
      var bridgeDbSystemCode = iri.match(/(bridgedb.org\/.*\/xrefs\/)(\w+)(?=\/.*)/)[2];
      var identifier = iri.match(/(bridgedb.org\/.*\/xrefs\/\w+\/)(.*)$/)[2];
      return {
        organism: iri.match(/(bridgedb.org\/)(.*)(?=\/xrefs)/)[2],
        inDataset: {
          alternatePrefix: [bridgeDbSystemCode],
          exampleIdentifier: identifier,
        },
        identifier: identifier,
        bridgeDbXrefsUrl: iri,
        xrefs: [iri]
      };
    }
  };
  var iriParserPairs = _.pairs(iriParsers);

  /**
   * @param {Object} args
   * @param {String} args.targetPreferredPrefix The Miriam namespace / identifiers.org preferredPrefix.
   * @param {String|Object} args.sourceEntityReference @see bridgeDb.entityReference.enrich()
   *                        method for what constitutes a usable entityReference
   * @return {Stream<EntityReference>} entityReference One or more {@link EntityReference|entity references} with the target preferredPrefix.
   */
  function map(args) {
    var targetPreferredPrefix = args.targetPreferredPrefix;
    if (!targetPreferredPrefix) {
      throw new Error('targetPreferredPrefix missing');
    }

    return instance.xref.get(args.sourceEntityReference)
    .filter(function(entityReferenceXref) {
      return entityReferenceXref.inDataset.preferredPrefix ===
        targetPreferredPrefix;
    });
  }

  /**
   * Normalize object properties
   *
   * @param {String|Object} entityReference
   * @return {Stream<EntityReference>} Normalized {@link EntityReference}
   */
  function normalize(entityReference) {
    entityReference = _expand(entityReference);

    var organism = entityReference.organism;
    if (!!organism) {
      return highland([entityReference])
      .flatMap(instance.organism._setInstanceOrganismName)
      .map(function(organismNameNormalized) {
        entityReference.organism = organismNameNormalized;
        return entityReference;
      });
    } else {
      return highland([entityReference]);
    }
    // TODO normalize db, identifier, etc.
  }

  return {
    createEnrichmentStream:createEnrichmentStream,
    enrich:enrich,
    exists:exists,
    _expand:_expand,
    freeSearch:freeSearch,
    map:map,
    normalize:normalize
  };
};

exports = module.exports = EntityReference;
