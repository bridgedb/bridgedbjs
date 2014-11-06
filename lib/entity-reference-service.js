var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var EntityReferenceService = function(instance) {
  'use strict';

  /**
   * addIdentifiersIri
   *
   * Add an IRI (JSON-LD "@id") to semantically identify the provided entity reference, replacing previous one, if present.
   *
   * @param {object} entityReference
   * @param {string} entityReference.preferredPrefix - e.g., "ncbigene"
   * @param {string} entityReference.identifier - e.g., "1234"
   * @return {object} entityReference
   * @return {string} entityReference['@id'] - e.g., "http://identifiers.org/ncbigene/1234".
   * @return {string} [entityReference['owl:sameAs']] - only if a previous, non-identifiers.org IRI was present, e.g., "http://bio2rdf.org/ncbigene/1234".
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
   * enrich
   *
   * Enrich entity reference as much as possible from BridgeDB, except don't get xrefs.
   *
   * @param {object} entityReference
   * @param {object} [metadata]
   * @return {stream} entityReferenceStream - will have one object, as described below:
   *         {object} entityReference - with as many as possible of the properties listed below
   *         {string} entityReference['@id]
   *         {string} entityReference.displayName
   *         {string} entityReference.standardName
   *         {string} entityReference.db
   *         {string} entityReference.preferredPrefix
   *         {string} entityReference.identifier
   *         {string} entityReference.gpmlType
   *         {string} entityReference.biopaxType
   */
  var enrich = function(entityReference, metadata) {
    return enrichFromMetadata(entityReference, metadata)
    .flatMap(function(entityReference) {
      // TODO add method to set organism, if it's specified, so we don't need to run this method below
      return highland([entityReference])
      .flatMap(instance.organismService.getByEntityReference)
      .map(function(organism) {
        entityReference.organism = organism.latin;
        return entityReference;
      });
    });
  };

  /**
   * enrichFromMetadata
   *
   * Enrich provided entity reference with all data possible from the datasources.txt metadata.
   *
   * @param {object} entityReference
   * @param {object} [metadata]
   * @return {stream} entityReferenceStream - will have one object, as described below
   *         {object} entityReference - enriched
   */
  function enrichFromMetadata(entityReference, metadata) {
    var metadataStream;
    if (!!metadata) {
      metadataStream = highland([ metadata ]);
    } else {
      metadataStream = instance.metadataService.getByEntityReference(entityReference);
    }

    var propertiesToAdd = [
      'gpmlType',
      'biopaxType',
      'db',
      'priority',
      'preferredPrefix',
      'alternatePrefix'
    ];

    return metadataStream.map(function(metadataRow) {
      propertiesToAdd.forEach(function(propertyKey) {
        var propertyValue = metadataRow[propertyKey];
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
   * expand
   *
   * Parse provided object or string to return a normalized entity reference in the form of a JS object.
   * Uses only provided input -- no external data lookups.
   * Any provided names/values will be retained as-is, even if doing so prevents
   * other methods in this library from being able to access the data they require.
   * This library does not clean or transform the input.
   *
   * @param {object|string} entityReference - See "get" method for details on what constitutes a usable entityReference
   * @return {object} entityReference - converted to object, if required, and normalized
   */
  function expand(entityReference) {
    if (!_.isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        // Convert input from string to object
        entityReference = {entityReference: entityReference};
      } else {
        throw new Error('Not enough data provided to identify the specified entity reference: "' + String(entityReference) + '"');
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

  /**
   * get
   *
   * @param {object|string} entityReference - has an identifier (e.g. ENSG00000160791) and means for identifying the database
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
   * @return {stream} entityReferenceStream - will have one object, as described below
   *         {object} entityReference - enriched with metadata and organism
   */
  function get(args) {
    var entityReference = expand(args);

    var entityReferenceKeys = _.keys(entityReference);

    // if any one of these are provided, we can deduce the identity of the specified database
    var validMeansForIdentifyingDb = [
      'db',
      'preferredPrefix',
      'alternatePrefix',
      'bridgedbSystemCode',
    ];

    if (_.isEmpty(_.intersection(validMeansForIdentifyingDb, entityReferenceKeys)) || typeof entityReference.identifier === 'undefined') {
      throw new Error('Not enough data provided to identify the specified entity reference: "' + JSON.stringify(entityReference) + '"');
    }

    return enrich(entityReference);
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
   * normalize
   *
   * Normalize object properties
   *
   * @param {object} entityReference
   * @return {stream} normalized entityReference
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
   * map
   *
   * @param {object} args
   * @param {string} args.targetPreferredPrefix - The Miriam namespace / identifiers.org preferredPrefix.
   * @callback
   * @return {array} ids - IRIs for target preferredPrefix
   */
  function map(args, callback) {
    var targetPreferredPrefix = args.targetPreferredPrefix;
    if (!targetPreferredPrefix) {
      return callback('targetPreferredPrefix missing');
    }
    get(args, function(err, entityReferenceXrefs) {
      if (err) {
        console.log(err);
        console.log('in entityReferenceService.map()');
      }
      var targetReferences = entityReferenceXrefs.filter(function(entityReferenceXref) {
        return entityReferenceXref.preferredPrefix === targetPreferredPrefix;
      });
      if (targetReferences.length > 0) {
        var targetIds = targetReferences.map(function(targetReference) {
          return targetReference.id;
        });
        return callback(null, targetIds);
      } else {
        return callback('No entity references available for targetPreferredPrefix "' + targetPreferredPrefix + '"');
      }
    });
  }
  /**
   * searchByAttribute
   *
   * Get potential matches for a desired entity reference when provided a name as a search term
   *
   * @param {object} args
   * @param {string} args.attribute - Attribute value to be used as search term
   * @param {string} args.organism - Organism name. Currently only accepting Latin and English.
   * @param {string} [args.type] - Entity reference type, such as Protein, Dna, SmallMolecule, etc.
   *                               Not currently being used, but we might use it in the future to
   *                               help narrow down the search results.
   * @param {string} [args.db] - Desired database name, such as Ensembl or Uniprot
   * @return {stream} entityReferenceStream - if there is one or more matching entity references, they will be returned as objects, as described below
   *         {object} entityReference - enriched with metadata and organism
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
      .pipe(tsv));
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
    .flatMap(enrichFromMetadata)
    .map(instance.addContext);
  }

  return {
    enrich:enrich,
    expand:expand,
    // TODO I don't think "get" should be part of the public API
    get:get,
    map:map,
    normalize:normalize,
    searchByAttribute:searchByAttribute
  };
};

exports = module.exports = EntityReferenceService;
