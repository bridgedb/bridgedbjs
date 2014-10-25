var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var EntityReference = function(instance) {

  /*
  var bridgedbUrlTermVariants = [
    'bridgedbUrl',
    'bridgedbUri',
    'bridgedbIri',
    'bridgedbLink',
    'bridgedbHref',
    'bridgedbReference',
    'bridgedbXref',
    'bridgedbXrefs',
    'bridgedb'
  ];

  var bridgedbUrlTermVariantsNormalized = bridgedbUrlTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });
  //*/

  var organismTermVariants = [
    'organism',
    'species'
  ];

  // NOTE: this doesn't actually change anything right now, but it could in the
  // future if more term variants are added.
  var organismTermVariantsNormalized = organismTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });

  var dbTermVariants = [
    'db',
    'database',
    'dbName',
    'collection',
    'datasource',
    'data-source'
  ];

  var dbTermVariantsNormalized = dbTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });

  var identifierTermVariants = [
    'identifier',
    'id',
    'entity'
  ];

  // NOTE: this doesn't actually change anything right now, but it could in the
  // future if more term variants are added.
  var identifierTermVariantsNormalized = identifierTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });

  /*
  var iriTermVariants = [
    'identifier',
    'id',
    'entity',
    'entityReference',
    '@id',
    'iri',
    'uri',
    'url',
    'purl',
    'identifiersId',
    'identifiersOrgId',
    'identifiersOrg',
    'link',
    'href',
    'about',
    'rdf:about',
    'rdf:ID'
  ];

  var iriTermVariantsNormalized = iriTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });
  //*/

  function addIdentifiersDotOrgIri(entityReference) {
    if (!entityReference.namespace || !entityReference.identifier) {
      console.warn('Could not add an identifiers.org IRI, because the provided entity reference was missing a namespace and/or an identifier.');
      console.log(entityReference);
      return entityReference;
    }

    entityReference.id = 'http://identifiers.org/' + entityReference.namespace + '/' + entityReference.identifier;
    return entityReference;
  }

  /**
   * enrich
   *
   * Enrich entity reference as much as possible from BridgeDB, except don't get xrefs.
   *
   * @param {object} entityReference
   * @param {object} [metadata]
   * @return {object} enriched entity reference, with metadata and organism
   */
  var enrich = function(entityReference, metadata) {
    return enrichFromMetadata(entityReference, metadata)
    .map(function(entityReference) {
      return entityReference;
    })
    .flatMap(function(entityReference) {
      // TODO add method to set organism, if it's specified, so we don't need to run this method below
      // same for getByIdentifiersDotOrgIri
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
   * @return {object} enriched entity reference
   */
  function enrichFromMetadata(entityReference, metadata) {
    var metadataStream;
    if (!!metadata) {
      metadataStream = highland([ metadata ]);
    } else {
      metadataStream = instance.metadataService.getByEntityReference(entityReference);
    }

    return metadataStream.map(function(metadataRow) {
      delete metadataRow.exampleIdentifier;
      delete metadataRow.website;
      return _.defaults(entityReference, metadataRow);
    })
    .map(addIdentifiersDotOrgIri);
  }

  /**
   * expand
   *
   * Expand to object, filling in properties using only information provided
   * Any provided names/values will be retained as-is, even if doing so prevents
   * other methods in this library from being able to access the data they require.
   * Use normalize to convert provided names/values to standardized names/values.
   *
   * @param {object|string} entityReference
   * @return {object} entityReference
   */
  function expand(entityReference) {
    // TODO look at using data from miriam/identifiers.org: http://identifiers.org/documentation

    // If the input is a string, such as a BridgeDB webservice URL or an identifiers.org IRI.
    if (!_.isPlainObject(entityReference)) {
      if (typeof entityReference === 'string') {
        entityReference = {entityReference: entityReference};
      } else {
        throw new Error('Cannot process input: ' + entityReference.toString());
      }
    }

    // get any data from attached URIs, such as identifiers.org IRI or BridgeDB Xref URL.
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

    // Check whether db/namespace and identifier were provided

    var db = _.last(_.find(_.pairs(entityReference), function(pair) {
      return dbTermVariantsNormalized.indexOf(pair[0].toLowerCase()) > -1;
    }));

    if (!!db) {
      entityReference.db = entityReference.db || db;
    }

    var identifier = _.last(_.find(_.pairs(entityReference), function(pair) {
      return identifierTermVariantsNormalized.indexOf(pair[0].toLowerCase()) > -1;
    }));

    if (!!identifier) {
      entityReference.identifier = entityReference.identifier || identifier;
    }

    // Check whether an organism was provided

    var organism = _.last(_.find(_.pairs(entityReference), function(pair) {
      return organismTermVariantsNormalized.indexOf(pair[0].toLowerCase()) > -1;
    }));

    if (!!organism) {
      entityReference.organism = entityReference.organism || organism;
    }

    return entityReference;
  }

  /**
   * get
   *
   * @param {object|string} args
   * @return {object} entityReference - with as many as possible of the properties listed below
   * @return {string} entityReference.id
   * @return {string} entityReference.displayName
   * @return {string} entityReference.standardName
   * @return {string} entityReference.db
   * @return {string} entityReference.namespace
   * @return {string} entityReference.identifier
   * @return {string} entityReference.gpmlType
   * @return {string} entityReference.biopaxType
   */
  function get(args) {
    var entityReference = expand(args);

    var bridgedbUrl = entityReference.bridgedbUrl;
    if (!!bridgedbUrl) {
      return getByBridgedbUrlStreaming(bridgedbUrl);
    }

    // If no bridgedb URL was provided, we'll try checking whether db and identifier were provided

    var organism = entityReference.organism;
    var db = entityReference.db;
    var namespace = entityReference.namespace;
    var identifier = entityReference.identifier;
    if ((!!db || !!namespace) && typeof identifier !== 'undefined') {
      return enrich(entityReference);
    }

    // otherwise, we give up
    throw new Error('Not enough data specified to identify provided entity reference.');
  }

  function getByBridgedbUrlStreaming(url) {
    var bridgedbUrlComponents = url.split(config.apiUrlStub);
    var path = bridgedbUrlComponents[bridgedbUrlComponents.length - 1];

    var bridgedbPathComponents = path.split('/');
    var bridgedbSystemCode = bridgedbPathComponents[3];
    var identifier = bridgedbPathComponents[4];

    var entityReference = {};
    entityReference.identifier = identifier;

    return instance.metadataService.getByBridgedbSystemCode(bridgedbSystemCode).flatMap(function(metadataRow) {
      return enrich(entityReference, metadataRow);
    });
  }

  function getByBridgedbUrlWithCallback(url, callback) {
    getByBridgedbUrlStreaming(url).each(function(entityReference) {
      return callback(null, entityReference);
    });
  }

  function getByBridgedbUrl(url, callback) {
    if (!callback) {
      return getByBridgedbUrlStreaming(url);
    } else {
      return getByBridgedbUrlWithCallback(url, callback);
    }
  }

  // TODO look at whether we should support purl
  // TODO identifiers.org has alternative URI schemes listed.
  var iriParsers = {
    'identifiers.org': function(iri) {
      var iriComponents = iri.split('identifiers.org');
      var iriPath = iriComponents[iriComponents.length - 1];

      var iriPathComponents = iriPath.split('/');
      var namespace = iriPathComponents[1];
      var identifier = iriPathComponents[2];

      return {
        namespace: namespace,
        identifier: identifier,
        iri: iri,
        id: iri
      };
    },
    /*
    'identifiers.org': function(iri) {
      return {
        namespace: iri.match(/(identifiers.org\/)(.*)(?=\/.*)/)[2],
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
   * getByIri
   *
   * @param {object} args
   * @param {string} args.iri - IRI such as from identifiers.org. Example: 'http://identifiers.org/ncbigene/100010' for an Entrez Gene entity. Also allowed: "args.id".
   * @param {string} [ args.organism ] - Optional Latin or English name. Specifying it will make queries run much faster.
   * @return
   */
  function getByIri(args) {
    var iri = args.iri || args.id;
    var organism = args.organism;

    var iriParser = _.last(_.find(iriParserPairs, function(iriParserPair) {
      return iri.indexOf(iriParserPair[0]) > -1;
    }));

    if (!iriParser) {
      return new Error('Unable to parse provided IRI "' + iri + '"');
    }

    var entityReference = iriParser(iri);


    return instance.metadataService.getByIdentifiersDotOrgNamespace(entityReference.namespace)
    .flatMap(function(metadataRow) {
      return enrich(entityReference, metadataRow);
    });
  }

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
   * @param args
   *  targetNamespace required. This namespace is the Miriam/identifiers.org namespace.
   * @param callback
   * @return Array containing IRIs to target database
   */
  function map(args, callback) {
    var targetNamespace = args.targetNamespace;
    if (!targetNamespace) {
      return callback('targetNamespace missing');
    }
    get(args, function(err, entityReferenceXrefs) {
      if (err) {
        console.log(err);
        console.log('in entityReferenceService.map()');
        console.log(this.toString());
        console.log(this);
      }
      var targetReferences = entityReferenceXrefs.filter(function(entityReferenceXref) {
        return entityReferenceXref.namespace === targetNamespace;
      });
      if (targetReferences.length > 0) {
        var targetIds = targetReferences.map(function(targetReference) {
          return targetReference.id;
        });
        return callback(null, targetIds);
      } else {
        return callback('No entity references available for targetNamespace "' + targetNamespace + '"');
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
   * @return
   */
  function searchByAttribute(args) {
    var attributeValue = args.attribute;
    var type = args.type;
    var organism = args.organism;
    console.log(args);

    if (!organism) {
      throw new Error('Missing argument "organism"');
    }

    return highland([organism])//.flatMap(instance.organismService.normalize)
    // get the BridgeDB path
    .map(function(organism) {
      console.log('organism');
      console.log(organism);
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
    // TODO find out whether this also filters out the end event
    .errors(function (err, push) {
      console.log(err);
      console.log('in entityReferenceService.searchByAttribute()');
      //console.log(this.toString());
      //console.log(this);
      // do nothing. this just filters out errors.
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
    /*
    .flatMap(function(searchResult) {
      console.log('searchResult');
      console.log(searchResult);
      return highland([searchResult]);
    });
    //*/
    /*
    .flatMap(function(searchResult) {
      console.log('searchResult');
      console.log(searchResult);
      //return highland(enrichFromMetadata(searchResult)).sequence();
      //return highland([searchResult]).flatMap(enrichFromMetadata);
    });
    //*/
    .flatMap(enrichFromMetadata);
  }

  return {
    enrich:enrich,
    expand:expand,
    get:get,
    getByIri:getByIri,
    getByBridgedbUrl:getByBridgedbUrl,
    getByBridgedbUrlStreaming:getByBridgedbUrlStreaming,
    getByBridgedbUrlWithCallback:getByBridgedbUrlWithCallback,
    map:map,
    normalize:normalize,
    searchByAttribute:searchByAttribute
  };
};

exports = module.exports = EntityReference;
