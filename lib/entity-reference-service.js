/* @module EntityReferenceService */

var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var request = require('request');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var Utilities = require('./utilities.js');

/**
 * Used internally to create a new EntityReferenceService instance
 * @class
 * @protected
 * @alias entityReferenceService
 * @memberof bridgedb
 * @param instance
 */
var EntityReferenceService = function(instance) {
  'use strict';

  /**
   * @private
   * Add an IRI (JSON-LD "@id") to semantically identify the provided entity reference, replacing previous one, if present.
   *
   * @param {object} entityReference
   * @param {string} entityReference.preferredPrefix Example: "ncbigene"
   * @param {string} entityReference.identifier Example: "1234"
   * @return {object} entityReference
   * @return {string} entityReference['@id'] Example: "http://identifiers.org/ncbigene/1234".
   * @return {Array<string>} entityReference['owl:sameAs'] Only if a previous, non-identifiers.org IRI was present. Example: "http://bio2rdf.org/ncbigene/1234".
   */
  function addIdentifiersIri(entityReference) {
    if (!entityReference.preferredPrefix || !entityReference.identifier) {
      console.warn('Could not add an identifiers.org IRI, because the provided entity reference was missing preferredPrefix and/or identifier.');
      console.log(entityReference);
      return entityReference;
    }

    if (!!entityReference['@id'] && entityReference['@id'].indexOf('identifiers.org') === -1) {
      if (!entityReference['owl:sameAs']) {
        entityReference['owl:sameAs'] = [];
      }
      entityReference['owl:sameAs'].push(entityReference['@id']);
    }

    entityReference['@id'] = 'http://identifiers.org/' + entityReference.preferredPrefix + '/' + entityReference.identifier;
    return entityReference;
  }

  /**
   * Add BridgeDB URL for getting xrefs to provided entity reference.
   * If there is already an "xrefs" property, its value will be converted to
   * an array, if needed, and the BridgeDB URL will be added as a new element,
   * keeping any existing xref elements.
   *
   * @private
   *
   * @param {object} entityReference
   * @param {string} entityReference.organism Organism name in Latin or English
   * @param {<Array>string} entityReference.alternatePrefix The first element must be the BridgeDB systemCode
   * @param {string} entityReference.identifier
   * @return {object} entityReference
   * @return {Array<string>} entityReference.xrefs URL for getting Xrefs from BridgeDB webservices.
   */
  var addBridgedbXrefsUrl = function(entityReference) {
    if (!entityReference || !entityReference.organism || !entityReference.alternatePrefix || !entityReference.identifier) {
      console.warn('Cannot add BridgeDB Xrefs URL. See bridgedb.entityReferenceService.addBridgedbXrefsUrl() method for required parameters');
      return entityReference;
    }
    entityReference.xrefs = entityReference.xrefs || [];
    var xrefs = entityReference.xrefs;
    xrefs = _.isArray(xrefs) ? xrefs : [xrefs];
    xrefs.push(instance.xrefService.getBridgedbUrlByEntityReference(entityReference));
    return entityReference;
  };

  /**
   * Create a Node.js/Highland stream through which entity references
   * can be piped to add a BridgeDB URL for getting xrefs. It will be added
   * as an element in the xrefs array for each entity reference.
   *
   * @return {Stream} entityReferenceTransformationStream
   */
  var createBridgedbXrefsUrlAdderStream = function() {
    return highland.pipeline(function(sourceStream) {
      return highland(sourceStream).map(addBridgedbXrefsUrl);
    });
  };

  /**
   * Enrich entity reference. Default is to enrich as much as possible as much as possible
   * with data from BridgeDB, with the exception of not getting xrefs, but the sources
   * of enrichment data can be controlled by setting options.sources.
   *
   * @param {object|string} entityReference Entity reference must have an identifier
   * (e.g. ENSG00000160791) and means for identifying the database
   *    Acceptable entityReference input arguments:
   *      1. BridgeDB xrefs URL or identifiers.org IRI as string
   *      2. Object with at least one of these properties:
   *        a. { '@id': identifiers.org IRI }
   *        b. { bridgedbUrl: BridgeDB xrefs URL }
   *        c. { bridgedbUri: BridgeDB xrefs URL }
   *        d. { xrefs: [
   *            BridgeDB xrefs URL
   *            ...
   *          ]
   *        }
   *      3. Object with both of these properties:
   *        {
   *          db: database name as specified in datasources.txt
   *          identifier: entity reference identifier, such as ChEBI:1234
   *        }
   *   
   *    Example of BridgeDB xrefs URL: http://webservice.bridgedb.org/Human/xrefs/L/1234
   *    Example of identifiers.org IRI: http://identifiers.org/ncbigene/1234
   *
   * @param {object} [options]
   * @param {string[]} [options.sources] Limit enrichment to selected sources of data.
   *                                     Sources currently include "Organism" and "DatabaseMetadata"
   *                                     (metadata about biological databases from datasources.txt).
   *                                     Default is ['Organism', 'DatabaseMetadata'].
   *                                     Entity reference will always be turned into an object, if
   *                                     it is not already an object, and the data provided will be
   *                                     parsed and normalized, even if sources is specified as an
   *                                     empty array.
   * @return {Stream<object>} entityReference Entity reference with as many as possible of
   *                                          the properties listed below.
   * @return {string} entityReference['@context'] JSON-LD context. You can ignore this if you
   *                                              don't care about semantics.
   * @return {string} entityReference['@id'] JSON-LD IRI. You can also ignore this.
   * @return {string} entityReference.displayName
   * @return {string} entityReference.standardName
   * @return {string} entityReference.db
   * @return {string} entityReference.preferredPrefix
   * @return {Array<string>} entityReference.alternatePrefix
   * @return {string} entityReference.identifier
   * @return {string} entityReference.gpmlType
   * @return {string} entityReference.biopaxType
   */
  var enrich = function(entityReference, options) {
    options = options || {};
    var sources = options.sources || ['Organism', 'DatabaseMetadata'];
    var databaseMetadataEnrichmentEnabled = sources.indexOf('DatabaseMetadata') > -1;
    var organismEnrichmentEnabled = sources.indexOf('Organism') > -1;

    return highland([entityReference]).map(expand)
    .map(function(entityReference) {
      var entityReferenceKeys = _.keys(entityReference);

      // if any one of these are provided, we can get the identity of the specified database
      var propertiesThatCanIdentifyDatabase = [
        'db',
        'preferredPrefix',
        'alternatePrefix',
        'bridgedbSystemCode',
      ];

      if (_.isEmpty(_.intersection(propertiesThatCanIdentifyDatabase, entityReferenceKeys)) || typeof entityReference.identifier === 'undefined') {
        throw new Error('Not enough data provided to identify the specified entity reference: "' + JSON.stringify(entityReference) + '"');
      }

      return entityReference;
    })
    .flatMap(function(entityReference) {
      if (databaseMetadataEnrichmentEnabled) {
        return highland([entityReference]).flatMap(enrichWithDatabaseMetadata);
      } else {
        return highland([entityReference]);
      }
    })
    .flatMap(function(entityReference) {
      // TODO add method to set organism, if it's specified, so we don't need to run this method below
      if (organismEnrichmentEnabled) {
        return highland([entityReference])
        .flatMap(instance.organismService.getByEntityReference)
        .map(function(organism) {
          entityReference.organism = organism.latin;
          return entityReference;
        });
      } else {
        return highland([entityReference]);
      }
    })
    .map(addBridgedbXrefsUrl);
  };

  /**
   * @private
   *
   * Enrich provided entity reference using the metadata
   * for biological databases from datasources.txt.
   *
   * @param {object} entityReference
   * @return {Stream<object>} entityReference Entity reference enriched with database metadata
   * @return {string} entityReference.identifier
   * @return {string} entityReference.PLUS_ALL_OTHER_PROPERTIES_AVAILABLE
   */
  function enrichWithDatabaseMetadata(entityReference) {
    var databasesStream = instance.databaseService.getByEntityReference(entityReference);

    var propertiesToAdd = [
      'gpmlType',
      'biopaxType',
      'db',
      'priority',
      'preferredPrefix',
      'alternatePrefix'
    ];

    return databasesStream.map(function(database) {
      propertiesToAdd.forEach(function(propertyKey) {
        var propertyValue = database[propertyKey];
        if (!!propertyValue) {
          entityReference[propertyKey] = propertyValue;
        }
      });
      entityReference.db = entityReference.db[0];
      return entityReference;
    })
    .map(addIdentifiersIri);
  }

  /**
   * Check whether an entity reference with the specified identifier is known by the specified database.
   *
   * @param {string} bridgedbSystemCode
   * @param {string} identifier
   * @param {string} organism In English or Latin
   * @return {Stream<boolean>} entityReferenceExists
   * @return {boolean}
   */
  function exists(bridgedbSystemCode, identifier, organism) {
    var path = '/' + encodeURIComponent(organism) + '/xrefExists/' + bridgedbSystemCode + '/' + identifier;
    var source = instance.config.apiUrlStub + path;

    return highland(request({
      url: source,
      withCredentials: false
    })).map(function(str) {
      return str.toString() === 'true';
    });
  }

  /**
   * @private
   * Parse provided object or string to return a normalized entity reference in the form of a JS object.
   * Uses only provided input -- no external data lookups.
   * Any provided names/values will be retained as-is, even if doing so prevents
   * other methods in this library from being able to access the data they require,
   * bridgedbjs does not clean or transform the input.
   *
   * @param {object|string} entityReference @see bridgedb.entityReferenceService.enrich() for details on what constitutes a usable entityReference
   * @return {Stream<object>} entityReference Entity reference converted to object, if required, and normalized
   * @return {string} entityReference.identifier
   * @return {string} entityReference.PLUS_ALL_OTHER_PROPERTIES_AVAILABLE
   */
  function expand(entityReference) {
    if (!_.isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        // Convert input from string to object
        entityReference = {entityReference: entityReference};
      } else {
        throw new Error('Not enough data provided to identify the specified entity reference: "' + JSON.stringify(entityReference) + '"');
      }
    }

    // Check for existence of and attempt to parse identifiers.org IRI or BridgeDB Xref URL.
    // TODO this code might have duplication in looping (normalizing pairs),
    // which could be refactored to normalize just once to speed things up.

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

    return entityReference;
  }

  // We only support identifiers.org and BridgeDB IRIs in this library.
  var iriParsers = {
    'identifiers.org': function(iri) {
      var iriComponents = iri.split('identifiers.org');
      var iriPath = iriComponents[iriComponents.length - 1];

      var iriPathComponents = iriPath.split('/');
      var preferredPrefix = iriPathComponents[1];
      var identifier = iriPathComponents[2];

      return {
        preferredPrefix: preferredPrefix,
        identifier: identifier,
        '@id': iri
      };
    },
    /* this is an alternative. which is better?
    'identifiers.org': function(iri) {
      return {
        preferredPrefix: iri.match(/(identifiers.org\/)(.*)(?=\/.*)/)[2],
        identifier: iri.match(/(identifiers.org\/.*\/)(.*)$/)[2],
        id: iri
      };
    },
    //*/
    'bridgedb.org': function(iri) {
      return {
        organism: iri.match(/(bridgedb.org\/)(.*)(?=\/xrefs)/)[2],
        bridgedbSystemCode: iri.match(/(bridgedb.org\/.*\/xrefs\/)(\w+)(?=\/.*)/)[2],
        identifier: iri.match(/(bridgedb.org\/.*\/xrefs\/\w+\/)(.*)$/)[2],
        bridgedbUrl: iri
      };
    }
  };
  var iriParserPairs = _.pairs(iriParsers);
  
  /**
   * @param {object} args
   * @param {string} args.targetPreferredPrefix The Miriam namespace / identifiers.org preferredPrefix.
   * @param {string|object} args.sourceEntityReference @see bridgedbjs.entityReferenceService.enrich()
   *                        method for what constitutes a usable entityReference
   * @return {Stream<array>} entityReferences One or more entity references with the target preferredPrefix.
   * @return {object[]} entityReference
   */
  function map(args) {
    var targetPreferredPrefix = args.targetPreferredPrefix;
    if (!targetPreferredPrefix) {
      throw new Error('targetPreferredPrefix missing');
    }

    return instance.xrefService.get(args.sourceEntityReference)
    .filter(function(entityReferenceXref) {
      return entityReferenceXref.preferredPrefix === targetPreferredPrefix;
    });
  }

  /**
   * Normalize object properties
   *
   * @param {string|object} entityReference
   * @return {Stream<object>} entityReference Normalized entity reference
   * @return {string} entityReference.identifier
   * @return {string} entityReference.PLUS_ALL_OTHER_PROPERTIES_AVAILABLE
   */
  function normalize(entityReference) {
    entityReference = expand(entityReference);

    var organism = entityReference.organism;
    if (!!organism) {
      return highland([entityReference])
      .flatMap(function(entityReference) {
        return instance.organismService.normalize(organism)
        .map(function(organism) {
          entityReference.organism = organism;
          return entityReference;
        });
      });
    } else {
      return highland([entityReference]);
    }
    // TODO normalize db, identifier, etc.
  }

  /**
   * Get potential matches for a desired entity reference when provided a name as a search term.
   *
   * @param {object} args
   * @param {string} args.attribute - Attribute value to be used as search term
   * @param {string} args.organism - Organism name. Currently only accepting Latin and English.
   * @param {string} [args.type] - Entity reference type, such as Protein, Dna, SmallMolecule, etc.
   *                               Not currently being used, but we might use it in the future to
   *                               help narrow down the search results.
   * @param {string} [args.db] - Desired database name, such as Ensembl or Uniprot
   * @return {Stream<object>} entityReference Entity reference, enriched with database metadata and organism
   * @return {object}
   */
  function searchByAttribute(args) {
    var attributeValue = args.attribute;
    var type = args.type;
    var organism = args.organism;

    if (!organism) {
      throw new Error('Missing argument "organism"');
    }

    return highland([organism])//.flatMap(instance.organismService.normalize)
    // get the BridgeDB path
    .map(function(organism) {
      instance.organismService.set(organism);
      var path = '/' + encodeURIComponent(organism) + '/attributeSearch/' + encodeURIComponent(attributeValue);
      return instance.config.apiUrlStub + path;
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
    .errors(function (err, push) {
      console.log(err);
      console.log('in entityReferenceService.searchByAttribute()');
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
        // BridgeDB returns the string value
        return value === 'null';
      });

      return searchResult;
    })
    .flatMap(enrichWithDatabaseMetadata)
    .map(instance.addContext);
  }

  return {
    enrich:enrich,
    exists:exists,
    expand:expand,
    map:map,
    normalize:normalize,
    searchByAttribute:searchByAttribute
  };
};

exports = module.exports = EntityReferenceService;
