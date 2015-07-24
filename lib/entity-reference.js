/* @module EntityReference */

var _ = require('lodash');
var config = require('./config.js');
var csv = require('csv-streamify');
var csvOptions = {objectMode: true, delimiter: '\t'};
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var internalContext = require('./context.json');
var hyperquest = require('hyperquest');
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

  var jsonldRx = instance.jsonldRx;

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
   * @property {Dataset} isDataItemIn The dataset (database) for the identifier. See
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
   * @param {Dataset} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.preferredPrefix
   * @return {EntityReference} {@link EntityReference} with an identifiers.org {@link Iri|id}.
   *                Additionally, "owl:sameAs" will be added if a previous, non-identifiers.org IRI
   *                was present. @example: "http://bio2rdf.org/ncbigene/1234".
   */
  function _addIdentifiersIri(entityReference) {
    var dataset = entityReference.isDataItemIn;
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

    // If the entity reference has a non-identifiers ID, we will move
    // that ID to the property "owl:sameAs" and add an identifiers ID.
    if (!!entityReference.id &&
        entityReference.id.indexOf('identifiers.org') === -1) {
      if (!entityReference['owl:sameAs']) {
        entityReference['owl:sameAs'] = [];
      }
      entityReference['owl:sameAs'] =
        _.union(entityReference['owl:sameAs'], [entityReference.id]);
    }

    entityReference.id = 'http://identifiers.org/' +
      dataset.preferredPrefix + '/' +
      entityReference.identifier;
    return entityReference;
  }

  /**
   * Add BridgeDb IRI (URL) for getting xrefs for provided entity reference.
   * If there is already an "xref" property, its value will be converted to
   * an array, if needed, and the BridgeDb Xrefs IRI (URL) will be added as a new element,
   * keeping any existing xref elements.
   *
   * @private
   *
   * @param {EntityReference} entityReference
   * @param {String} entityReference.identifier
   * @param {Organism} [organism]
   * @param {Dataset} entityReference.isDataItemIn
   * @param {String} entityReference.isDataItemIn.bridgeDbSystemCode
   * @return {EntityReference} entityReference {@link EntityReference} with
   *                    BridgeDb IRI (URL) added.
   */
  var _addBridgeDbXrefsIri = function(entityReference) {
    if (!entityReference ||
        !entityReference.organism ||
        !entityReference.isDataItemIn ||
        !entityReference.isDataItemIn.bridgeDbSystemCode ||
        !entityReference.identifier) {
      if (instance.debug) {
        var message = 'Cannot add BridgeDb Xrefs IRI (URL).' +
          ' See bridgeDb.entityReference._addBridgeDbXrefsIri()' +
          ' method for required parameters';
        console.warn(message);
      }
      return entityReference;
    }

    entityReference.xref = entityReference.xref || [];

    // Note defining "xrefs" here instead of in one line above
    // in order to make sure "xrefs" is linked to
    // entityReference.xref in all cases, including the case
    // where entityReference.xref was just defined as an
    // empty array above.
    var xrefs = entityReference.xref;
    xrefs = entityReference.xref = _.isArray(xrefs) ? xrefs : [xrefs];

    var bridgeDbXrefsIri =
      instance.xref._getBridgeDbIriByEntityReference(entityReference);
    xrefs.push(bridgeDbXrefsIri);
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
   * @param {Boolean} [options.xref=true] Enrich with IRI (URL) for BridgeDb webservices
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
   * Enrich entity reference. Default is to enrich as much as possible with data from BridgeDb,
   * with the exception of not dereferencing any xref IRIs, but this enrichment can be controlled
   * by setting the relevant option(s) to false.
   *
   * @param {(Object|String|Stream)} input Entity reference(s). Each one must have an identifier
   * (e.g. ENSG00000160791) and means for identifying the dataset.
   *
   *    Acceptable entityReference input arguments:
   *      1. BridgeDb xref IRI (URL) or identifiers.org IRI as string
   *        BridgeDb xref IRI @example:
   *        'http://webservice.bridgedb.org/Human/xrefs/L/1234'
   *        identifiers.org IRI @example:
   *        'http://identifiers.org/ncbigene/1234'
   *      2. Object with at least one of these properties:
   *        a. { 'id': identifiers.org IRI }
   *        b. { bridgeDbXrefsIri: BridgeDb xref IRI }
   *        c. { xref: [
   *               BridgeDb xref IRI
   *               ...
   *             ]
   *           }
   *      3. Object with both of these properties:
   *        {
   *          db: official, standardized database name
   *          identifier: entity reference identifier, such as ChEBI:1234
   *        }
   *      4. Object with both of these properties:
   *        {
   *          bridgeDbDatasourceName: database name as used in BridgeDb
   *          identifier: entity reference identifier, such as ChEBI:1234
   *        }
   *
   * @param {Object} [options]
   * @param {Boolean} [options.organism=true] Enrich with organism name.
   * @param {Boolean} [options.context=true] Enrich with JSON-LD @context.
   * @param {Boolean} [options.dataset=true] Enrich from data-sources.txt
   *                         (metadata about biological datasets).
   * @param {Boolean} [options.xref=true] Enrich with IRI (URL) for BridgeDb webservices
   *                                        to enable getting xrefs for this entity reference.
   * @return {Stream<EntityReference>} entityReference {@link EntityReference} with as many
   *                    properties as possible added, unless otherwise specified by options.
   */
  var enrich = function(input, options) {
    var inputStream;
    if (_.isString(input) || _.isPlainObject(input)) {
      inputStream = highland([_handleStringInput(input)]);
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
      xref: true
    });

    return inputStream
      .flatMap(instance.addContext)
      .consume(function(err, entityReference, push, next) {
        if (err) {
          // pass errors along the stream and consume next value
          push(err);
          next();
        } else if (entityReference === highland.nil) {
          // pass nil (end event) along the stream
          push(null, entityReference);
        } else {
          var bridgeDbInputOriginalContext = entityReference['@context'];
          jsonldRx.replaceContext(entityReference, internalContext)
            .subscribe(function(entityReference) {
              entityReference.bridgeDbInputOriginalContext = bridgeDbInputOriginalContext;

              // TODO can we get rid of this checking to ensure removal of empty type values?
              var entityReferenceType = entityReference.type;
              if (entityReferenceType) {
                entityReferenceType = jsonldRx.arrayifyClean(entityReference.type);
                entityReference.type = entityReferenceType.filter(function(value) {
                  return value;
                });
              }
              push(null, entityReference);
              next();
            }, function(err) {
              push(err);
              next();
            }, function() {
            });
        }
      })
      .map(_expand)
      .map(function(entityReference) {
        if (!entityReference.isDataItemIn ||
          typeof entityReference.identifier === 'undefined') {
          var message = 'Not enough data provided to identify' +
            ' the specified entity reference: "' +
            JSON.stringify(entityReference) + '"';
          throw new Error(message);
        }

        return entityReference;
      })
      .flatMap(function(entityReference) {
        // TODO can we get rid of this checking to ensure removal of empty type values?
        var entityReferenceType = entityReference.type;
        if (entityReferenceType) {
          entityReferenceType = jsonldRx.arrayifyClean(entityReference.type);
          entityReference.type = entityReferenceType.filter(function(value) {
            return value;
          });
        }

        if (options.dataset) {
          return _enrichFromDataset(entityReference);
        } else {
          return highland([entityReference]);
        }
      })
      .flatMap(function(entityReference) {
        if (options.organism || options.xref) {
          return instance.organism._getInstanceOrganism(entityReference)
          .map(function(organism) {
            if (!!organism) {
              entityReference.organism = organism;
            }
            return entityReference;
          });
        } else {
          return highland([entityReference]);
        }
      })
      .map(function(entityReference) {
        if (options.xref) {
          var entityReferenceWithBridgeDbXrefsIri =
            _addBridgeDbXrefsIri(entityReference);

          var dataset = entityReference.isDataItemIn;
          var preferredPrefix = dataset && dataset.preferredPrefix;
          var preferredPrefixesSupportedByMyGeneInfo = [
            'ensembl',
            'ncbigene'
          ];
          if (preferredPrefixesSupportedByMyGeneInfo.indexOf(preferredPrefix) > -1) {
            entityReference.xref = entityReference.xref || [];
            entityReference.xref.push(
              encodeURI('http://mygene.info/v2/gene/' + entityReference.identifier));
          }

          if (!options.organism) {
            // We needed to get the organism in order to get the BridgeDb Xrefs IRI,
            // but we delete it here if the user didn't want it.
            delete entityReferenceWithBridgeDbXrefsIri.organism;
          }
          return entityReferenceWithBridgeDbXrefsIri;
        } else {
          return entityReference;
        }
        //*/
      })
      .consume(function(err, entityReference, push, next) {
        if (err) {
          // pass errors along the stream and consume next value
          push(err);
          next();
        } else if (entityReference === highland.nil) {
          // pass nil (end event) along the stream
          push(null, entityReference);
        } else {
          var bridgeDbInputOriginalContext = entityReference.bridgeDbInputOriginalContext;
          delete entityReference.bridgeDbInputOriginalContext;
          // TODO can we get rid of this checking to ensure removal of empty type values?
          var entityReferenceType = entityReference.type;
          if (entityReferenceType) {
            entityReferenceType = jsonldRx.arrayifyClean(entityReference.type);
            entityReference.type = entityReferenceType.filter(function(value) {
              return value;
            });
          }

          jsonldRx.replaceContext(entityReference, bridgeDbInputOriginalContext)
            .subscribe(function(value) {
              if (!options.context) {
                delete value['@context'];
              }

              // TODO can we get rid of this checking to ensure removal of empty type values?
              var entityReferenceType = entityReference.type;
              if (entityReferenceType) {
                entityReferenceType = jsonldRx.arrayifyClean(entityReference.type);
                entityReference.type = entityReferenceType.filter(function(value) {
                  return value;
                });
              }
              push(null, value);
              next();
            }, function(err) {
              push(err);
              next();
            }, function() {
            });
        }
      });
      /*
      .flatMap(function(entityReference) {
        if (options.context) {
          return instance.addContext(entityReference);
        } else {
          return highland([entityReference]);
        }
      });
      //*/
  };

  /**
   * @private
   *
   * Enrich an entity reference using the metadata
   * for biological datasets from datasources.txt.
   *
   * @param {EntityReference} entityReference Expanded entity reference.
   * @return {Stream<EntityReference>} entityReference {@link EntityReference}
   *                                            enriched from data-sources.txt
   */
  function _enrichFromDataset(entityReference) {
    var datasetsStream =
      instance.dataset.get(entityReference.isDataItemIn);

    return datasetsStream.map(function(dataset) {
      entityReference.isDataItemIn = dataset;
      entityReference.db = entityReference.db || dataset.name;
      var typeFromDataset = dataset.subject;
      if (!_.isEmpty(typeFromDataset)) {
        typeFromDataset = _.isArray(typeFromDataset) ? typeFromDataset :
          [typeFromDataset];
        entityReference.type = _.union(
          jsonldRx.arrayify(entityReference.type), typeFromDataset);
      }

      //*
      if (!!dataset.uriRegexPattern) {
        var directIri = _getDirectIri(entityReference.identifier, dataset);
        if (!entityReference.id) {
          entityReference.id = directIri;
        } else {
          var owlSameAs = jsonldRx.arrayifyClean(entityReference['owl:sameAs'] || []);
          if (owlSameAs.indexOf(directIri) === -1) {
            owlSameAs.push(directIri);
          }
          entityReference['owl:sameAs'] = owlSameAs;
        }
        dataset.exampleResource = directIri;
      }
      //*/

      return entityReference;
    })
    .map(_addIdentifiersIri);
  }

  /**
   * Check whether an entity reference with the specified identifier is
   * known by the specified dataset.
   *
   * @param {String} systemCode
   * @param {String} identifier
   * @param {String|Organism} organism {@link Organism} or name in English or Latin or taxonomy IRI
   *       like {@link http://identifiers.org/taxonomy/9606|http://identifiers.org/taxonomy/9606}.
   * @return {Stream<Boolean>} exists Whether specified entity reference exists.
   */
  function exists(systemCode, identifier, organism) {
    return highland([organism]).flatMap(function(organismName) {
      var path = encodeURIComponent(organismName) +
        '/xrefExists/' + systemCode + '/' + identifier;
      var source = instance.config.baseIri + path;

      return highland(hyperquest(source, {
        withCredentials: false
      })).map(function(buf) {
        // NOTE: we use "replace" to strip out anything that would
        // make the Boolean determination incorrect, e.g., line breaks.
        var str = buf.toString().replace(/([^a-z])+/g, '');
        return str === 'true';
      });
    });
  }

  function _handleStringInput(entityReference) {
    if (!_.isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        // Convert input from IRI string to object
        return {
          'id': entityReference,
        };
      } else {
        console.log('specified entity reference:');
        console.log(entityReference);
        var message = 'Insufficient input data or incorrect format. Cannot identify' +
          ' the specified entity reference: "' +
          JSON.stringify(entityReference) + '"';
        throw new Error(message);
      }
    }
    return entityReference;
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
  function _expand(entityReference) {
    // TODO should we even do this here?
    _handleStringInput(entityReference);

    entityReference.type = jsonldRx.arrayify(entityReference.type);
    if (entityReference.type.indexOf('EntityReference') === -1) {
      entityReference.type.push('EntityReference');
    }

    // TODO The code below might have duplication in looping (normalizing pairs),
    // which could be refactored to normalize just once to speed things up.

    // Check for existence of and attempt to parse identifiers.org IRI or BridgeDb Xref IRI (URL).
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
    if (!!organism) {
      instance.organism._setInstanceOrganism(organism, false);
    }

    entityReference.isDataItemIn = entityReference.isDataItemIn || {};

    var db = entityReference.db ||
      (!!entityReference.isDataItemIn.name &&
       entityReference.isDataItemIn.name);

    if (!!db) {
      entityReference.db = db;
      entityReference.isDataItemIn.name = db;
    }

    var bridgeDbDatasourceName = entityReference.bridgeDbDatasourceName ||
      (!!entityReference.isDataItemIn.bridgeDbDatasourceName &&
       entityReference.isDataItemIn.bridgeDbDatasourceName);
    if (!!bridgeDbDatasourceName) {
      entityReference.bridgeDbDatasourceName = bridgeDbDatasourceName;
      entityReference.isDataItemIn.bridgeDbDatasourceName = bridgeDbDatasourceName;
    }

    var identifier = entityReference.identifier;
    if (!!identifier) {
      entityReference.isDataItemIn.exampleIdentifier = identifier;
    }

    return entityReference;
  }

  /**
   * Get potential matches for a desired entity reference by free text search for matching
   * symbols or identifiers. See also
   * {@link
   * http://bridgedb.org/apidoc/2.0/org/bridgedb/IDMapper.html#freeSearch(java.lang.String,%20int)|
   * Java documentation}.
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
   * @param {String|Organism} organism {@link Organism} or name in English or Latin or taxonomy
   *  IRI like {@link http://identifiers.org/taxonomy/9606|http://identifiers.org/taxonomy/9606}.
   * @param {JsonldType} [args.type] - Entity reference type, such as ProteinReference,
   *              DnaReference, SmallMoleculeReference, etc.
   *              Not currently being used, but we might use it in the future to
   *              help narrow down the search results.
   * @param {String} [args.db] - Desired dataset name, such as Ensembl or Uniprot
   * @return {Stream<EntityReference>} entityReference {@link EntityReference}, enriched
   *                                    from data-sources.txt and BridgeDb organism data.
   */
  function freeSearch(args) {
    var attributeValue = args.attribute;
    var type = args.type;
    var organism = args.organism ||
      instance.instanceOrganismNonNormalized;

    if (!organism) {
      throw new Error('Missing argument "organism"');
    }

    //* TODO why does the following work, but the subsequent two don't?
    return highland([organism])
    .flatMap(function(organism) {
      return instance.organism._getInstanceOrganism(organism).fork();
    })
    //*/
    //return instance.organism._getInstanceOrganism(organism).fork()
    //return instance.organism._getInstanceOrganism(organism)
    .map(function(organism) {
      return organism.nameLanguageMap.la;
    })
    .map(function(organismName) {
      var path = encodeURIComponent(organismName) +
        '/attributeSearch/' +
        encodeURIComponent(attributeValue);
      return instance.config.baseIri + path;
    })
    .flatMap(function(source) {
      return highland(hyperquest(source, {
        withCredentials: false
      })
      .pipe(csv(csvOptions)));
    })
    .errors(function(err, push) {
      console.error('in bridgedb.entityReference.freeSearch()');
      push(err);
    })
    .map(function(array) {
      return {
        identifier: array[0],
        bridgeDbDatasourceName: array[1],
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
      var bridgeDbSystemCode = decodeURIComponent(
          iri.match(/(bridgedb.org\/.*\/xrefs\/)(\w+)(?=\/.*)/)[2]);
      var identifier = decodeURIComponent(iri.match(/(bridgedb.org\/.*\/xrefs\/\w+\/)(.*)$/)[2]);
      return {
        organism: decodeURIComponent(iri.match(/(bridgedb.org\/)(.*)(?=\/xrefs)/)[2]),
        isDataItemIn: {
          alternatePrefix: [bridgeDbSystemCode],
          bridgeDbSystemCode: bridgeDbSystemCode,
          exampleIdentifier: identifier,
        },
        identifier: identifier,
        bridgeDbXrefsIri: iri,
        xref: [iri]
      };
    }
  };
  var iriParserPairs = _.pairs(iriParsers);

  /**
   * @param {Object} args
   * @param {String} args.targetPreferredPrefix The Miriam namespace /
   *    identifiers.org preferredPrefix.
   * @param {String|Object} args.sourceEntityReference @see bridgeDb.entityReference.enrich()
   *                        method for what constitutes a usable entityReference
   * @return {Stream<EntityReference>} entityReference One or more
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
      .flatMap(instance.organism._setInstanceOrganism)
      .map(function(organism) {
        entityReference.organism = organism;
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
