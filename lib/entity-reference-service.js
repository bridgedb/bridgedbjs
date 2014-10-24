var _ = require('lodash');
var config = require('./config.js');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsvParser = require('csv-parser')({
  separator: '\t'
});
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
    'collection'
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

  var enrich = function(entityReference, metadata) {
    var metadataStream;
    if (!!metadata) {
      metadataStream = highland([ metadata ]);
    } else {
      metadataStream = instance.metadataService.getByEntityReference(entityReference);
    }
    return metadataStream.map(function(metadataRow) {
      console.log('metadataRow');
      console.log(metadataRow);
      delete metadataRow.exampleIdentifier;
      delete metadataRow.website;
      return _.defaults(entityReference, metadataRow);
    })
    .map(addIdentifiersDotOrgIri)
    .map(function(entityReference) {
      console.log('entityReference345');
      console.log(entityReference);
      return entityReference;
    })
    //*
    .flatMap(function(entityReference) {
      console.log('entityReference345b');
      console.log(entityReference);
      /*
      instance.organismService.getByEntityReference(entityReference).each(function(organism) {
        console.log('organism1157');
        console.log(organism);
      });
      //*/
      // TODO add method to set organism, if it's specified, so we don't need to run this method below
      // same for getByIdentifiersDotOrgIri
      return highland([entityReference])
      .flatMap(instance.organismService.getByEntityReference)
      /*
      .map(function(entityReference) {
        console.log('entityReference');
        console.log(entityReference);
        return entityReference.id;
      })
      .flatMap(instance.organismService.getByIri)
      //*/
      .map(function(organism) {
        console.log('organism335');
        console.log(organism);
        console.log('entityReference335');
        console.log(entityReference);
        entityReference.organism = organism.latin;
        return entityReference;
      });
    });
  };

  function enrichFromMetadata(entityReference, metadata) {
    var desiredMetadataProperties = [
      'db',
      'namespace',
      'type',
      'bridgedbSystemCode'
    ];

    _.pairs(metadata).filter(function(pair) {
      return desiredMetadataProperties.indexOf(pair[0]) > -1;
    })
    .map(function(pair) {
      entityReference[pair[0]] = pair[1];
    });

    return addIdentifiersDotOrgIri(entityReference);
  }

  /*
  function enrichFromMetadata(entityReference, metadata) {
    var desiredMetadataProperties = [
      'db',
      'namespace',
      'type',
      'bridgedbSystemCode'
    ];

    _.pairs(metadata).filter(function(pair) {
      return desiredMetadataProperties.indexOf(pair[0]) > -1;
    })
    .map(function(pair) {
      entityReference[pair[0]] = pair[1];
    });

    return addIdentifiersDotOrgIri(entityReference);
  }
  //*/

  /**
   * get
   *
   * @param {object|string} args
   * @return { object } - of this form:
           {
             "id": "http://identifiers.org/pdb/3NA3",
             displayName: "3NA3",
             standardName: "MutL protein homolog 1 isoform 1"
             "db": "PDB",
             "namespace": "pdb",
             "identifier": "3NA3",
             "type": "ProteinReference"
           },
   */
  function get(args) {
    var entityReference = expand(args);

    var bridgedbUrl = entityReference.bridgedbUrl;
    if (!!bridgedbUrl) {
      return getByBridgedbUrlStreaming(bridgedbUrl);
    }

    console.log('entityReference1234');
    console.log(entityReference);

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
   * getByDbAndIdentifierStreaming
   *
   * @param db string - name or identifiers.org namespace for database
   * @param identifier string - The primary identifier in the external database of the object to which this xref refers, e.g. '100010' for an Entrez Gene entity
   * @param [ organism ] - Optional Latin or English name. Specifying it will make queries run much faster.
   * @return
   */
  function getByDbAndIdentifierStreaming(args) {
    var db = args.db;
    var identifier = args.identifier;
    var organism = args.organism;

    var entityReference = {};
    entityReference.db = db;
    entityReference.identifier = identifier;

    return instance.metadataService.getByDb(db).flatMap(function(metadataRow) {
      return enrich(entityReference, metadataRow);
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
    var organism = args.organism;
    var type = args.type;
    var endTsvDataStream = false;

    return highland([args.organism])
    .flatMap(instance.organismService.normalize)
    .flatMap(function(normalizedOrganism) {
      var searchResults = [];

      //http://webservice.bridgedb.org/Mouse/attributeSearch/Nfkb1
      var path = '/' + encodeURIComponent(normalizedOrganism) + '/attributeSearch/' + encodeURIComponent(attributeValue);
      var source = instance.config.apiUrlStub + path;
      //ENSMUSG00000028163	Ensembl	Nfkb1
      var headers = ['identifier', 'db', 'displayName'].join('\t') + '\n';

      /*****************************************
       * TSV parser stream
       ****************************************/

      var tsvStream = highland([headers]).concat(
        request({
        url: source,
        withCredentials: false
        }, function(error, response, body) {
          var args = {};
          response = response;
          args.error = error;
          args.body = body;
          args.source = source;
          httpErrors(args);
          tsvStream.end();
          tsvParser.end();
        })
      )
      //* TODO still need to check that this is correct
      .errors(function (err, push) {
        // do nothing. this just filters out errors.
      })
      //*/
      .pipe(tsvParser);

      /*****************************************
       * Request data stream
       ****************************************/

      var tsvDataStream = highland('data', tsvStream)
      //*
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
      //*/
      //*
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
      .consume(function(err, searchResult, push, next) {
        if (err) {
          // pass errors along the stream and consume next value
          push(err);
          next();
        } else if (searchResult === highland.nil) {
          // pass nil (end event) along the stream
          push(null, searchResult);
        } else if (endTsvDataStream) {
          // pass nil (end event) along the stream
          push(null, highland.nil);
        } else {
          instance.metadataService.getByDb(searchResult.db).each(function(metadataRow) {
            var enrichedSearchResult = enrichFromMetadata(searchResult, metadataRow);
            push(null, enrichedSearchResult);
          });
          //*/
        }
      })
      .map(function(searchResult) {
        searchResults.push(searchResult);
        return searchResults;
      })
      // TODO why doesn't .collect() work?
      // It never appears to have an end
      .debounce(1000);

      /*****************************************
       * Request end stream
       ****************************************/

      highland('end', tsvStream).each(function() {
        tsvParser.end();
        tsvStream.end();
        var endTsvDataStream = true; 
        return searchResults;
      });

      return tsvDataStream;

    });
  }

  /**
   * expand
   *
   * Expand to object, filling in properties using only information provided
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

    var bridgedbUrl = _.find(entityReference, function(value) {
      var valueNormalized = String(value).toLowerCase();
      return !!valueNormalized.match(/webservice.bridgedb.org\/.*\/xrefs\/.*\/.*$/);
    });

    if (!_.isEmpty(bridgedbUrl)) {
      _.defaults(entityReference, iriParsers['bridgedb.org'](bridgedbUrl));
    }

    // Check whether an identifiers.org IRI was provided

    var identifiersDotOrgIri = _.find(entityReference, function(arg) {
      var valueNormalized = String(arg).toLowerCase();
      return !!valueNormalized.match(/identifiers.org\/.*\/.*$/);
    });

    if (!_.isEmpty(identifiersDotOrgIri)) {
      _.defaults(entityReference, iriParsers['identifiers.org'](identifiersDotOrgIri));
    }

    var keysNormalized = _.keys(entityReference).map(function(key) {
      return key.toLowerCase();
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

    console.log('entityReference');
    console.log(entityReference);
    return entityReference;

    /*
    var organismKeyNormalized = _.find(keysNormalized, function(keyNormalized) {
      return organismTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var organism;
    if (!!organismKeyNormalized) {
      var organismIndex = keysNormalized.indexOf(organismKeyNormalized);
      organism = entityReference[organismIndex];
    }
    //*/

    /*
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
    //*/
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

  return {
    enrich:enrich,
    get:get,
    getByIri:getByIri,
    getByDbAndIdentifierStreaming:getByDbAndIdentifierStreaming,
    getByBridgedbUrl:getByBridgedbUrl,
    getByBridgedbUrlStreaming:getByBridgedbUrlStreaming,
    getByBridgedbUrlWithCallback:getByBridgedbUrlWithCallback,
    expand:expand,
    searchByAttribute:searchByAttribute
  };
};

exports = module.exports = EntityReference;
