var _ = require('lodash');
var config = require('./config.js');
var tsvParser = require('csv-parser')({
  separator: '\t'
});
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
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
    'namespace'
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
      console.warn('Could not add an identifers.org IRI, because the provided entity reference was missing a namespace and/or an identifier.');
      return entityReference;
    }

    entityReference.id = 'http://identifiers.org/' + entityReference.namespace + '/' + entityReference.identifier;
    return entityReference;
  }

  function enrichFromMetadata(entityReference, metadata) {
    console.log('enrichFromMetadata');
    console.log(entityReference);
    console.log(metadata);
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
    // TODO look at using data from miriam/identifiers.org: http://identifiers.org/documentation

    // If the input is a string, such as a BridgeDB webservice URL or an identifiers.org IRI.
    if (!_.isPlainObject(args)) {
      if (typeof args === 'string') {
        args = {arg: args};
      } else {
        throw new Error('Cannot process input: ' + args.toString());
      }
    }

    var keysNormalized = _.keys(args).map(function(arg) {
      return arg.toLowerCase();
    });

    /*
    var bridgedbUrlProvided = _.first(keysNormalized.filter(function(keyNormalized) {
      return bridgedbUrlTermVariantsNormalized.indexOf(keyNormalized) > -1;
    }));
    //*/

    var bridgedbUrlProvided = _.find(args, function(arg) {
      var valueNormalized = String(arg).toLowerCase();
      return !!valueNormalized.match(/webservice.bridgedb.org\/.*\/xrefs\/.*\/.*$/);
    });

    if (!_.isEmpty(bridgedbUrlProvided)) {
      return getByBridgedbUrlStreaming(bridgedbUrlProvided);
    }

    // if no bridgedbUrl was provided, let's try checking whether an identifiers.org IRI was provided

    var organismKeyNormalized = _.find(keysNormalized, function(keyNormalized) {
      return organismTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var organism;
    if (!!organismKeyNormalized) {
      var organismIndex = keysNormalized.indexOf(organismKeyNormalized);
      organism = args[organismIndex];
    }

    var identifiersDotOrgIri = _.find(args, function(arg) {
      var valueNormalized = String(arg).toLowerCase();
      return !!valueNormalized.match(/identifiers.org\/.*\/.*$/);
    });

    if (!_.isEmpty(identifiersDotOrgIri)) {
      return getByIri({
        id: identifiersDotOrgIri,
        organism: organism
      });
    }

    // If no success up to here, we'll try checking whether db/namespace and identifier were provided

    var dbKeyNormalized = _.find(keysNormalized, function(keyNormalized) {
      return dbTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var db;
    if (!!dbKeyNormalized) {
      var dbIndex = keysNormalized.indexOf(dbKeyNormalized);
      db = args[dbIndex];
    }

    var identifierKeyNormalized = _.find(keysNormalized, function(keyNormalized) {
      return identifierTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var identifier;
    if (!!identifierKeyNormalized) {
      var identifierIndex = keysNormalized.indexOf(identifierKeyNormalized);
      identifier = args[identifierIndex];
    }

    if (!!organism && !!db && typeof identifier !== 'undefined') {
      return getByDbAndIdentifierStreaming({
        db: db,
        identifier: identifier,
        organism: organism
      });
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

    return instance.metadataService.getByBridgedbSystemCode(bridgedbSystemCode).map(function(metadataRow) {
      return enrichFromMetadata(entityReference, metadataRow);
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
        identifier: identifier
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
      return new Error('Unable to parse provied IRI "' + iri + '"');
    }

    var entityReference = iriParser(iri);

    return instance.metadataService.getByIdentifiersDotOrgNamespace(entityReference.namespace).map(function(metadataRow) {
      entityReference = enrichFromMetadata(entityReference, metadataRow);
      return metadataRow.db;
    })
    .flatMap(instance.metadataService.getBridgedbSystemCodeByDb)
    .map(function(bridgedbSystemCode) {
      entityReference.bridgedbSystemCode = bridgedbSystemCode;
      return iri;
    })
    .flatMap(instance.organismService.getByIri)
    .map(function(organism) {
      entityReference.organism = organism;
      return entityReference;
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

    return instance.metadataService.getByDb(db).map(function(metadataRow) {
      entityReference = enrichFromMetadata(entityReference, metadataRow);
      return entityReference.id;
    })
    // TODO add method to set organism, if it's specified, so we don't need to run this method below
    // same for getByIdentifiersDotOrgIri
    .flatMap(instance.organismService.getByIri)
    .map(function(organism) {
      entityReference.organism = organism;
      return entityReference;
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

    var searchResults = [];

    return highland([args.organism]).flatMap(instance.organismService.normalize)
    .flatMap(function(normalizedOrganism) {
      //http://webservice.bridgedb.org/Mouse/attributeSearch/Nfkb1
      var path = '/' + encodeURIComponent(normalizedOrganism) + '/attributeSearch/' + encodeURIComponent(attributeValue);
      var source = instance.config.apiUrlStub + path;
      //ENSMUSG00000028163	Ensembl	Nfkb1
      var headers = ['identifier', 'db', 'displayName'].join('\t') + '\n';

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
      .errors(function (err, push) {
        // do nothing. this just filters out errors.
      })
      .pipe(tsvParser);

      var searchResult;

      return highland('data', tsvStream)
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
      /*
      .map(function(searchResult) {

        // remove empty properties

        searchResult = _.omit(searchResult, function(value) {
          // Note: I intentionally used 'null' as
          // a string, not a native value, because
          // BridgeDB returns the string value
          return value === 'null';
        });

        console.log('searchResult');
        console.log(searchResult);

        return searchResult.db;
      })
      //.flatMap(instance.metadataService.getByDb)
      //*/
      /*
      .map(function(metadataRow) {
        return enrichFromMetadata(searchResult, metadataRow);
      })
      .map(function(searchResult) {
        searchResults.push(searchResult);
        return searchResult;
      })
      //*/
      /*
      .map(function(thisSearchResult) {
        searchResult = thisSearchResult;
        console.log('searchResult');
        console.log(searchResult);
        return thisSearchResult.db;
      })
      .doto(instance.metadataService.getByDb)
      .map(function(metadataRow) {
        console.log('metadataRow');
        console.log(metadataRow);
        return enrichFromMetadata(searchResult, metadataRow);
      })
      //*/
      //*
      .map(function(searchResult) {
        console.log('936searchResult');
        console.log(searchResult);
        return instance.metadataService.getByDb(searchResult.db).map(function(metadataRow) {
          console.log('metadataRow');
          console.log(metadataRow);
          return enrichFromMetadata(searchResult, metadataRow);
        })
        .map(function(searchResult) {
          console.log('searchResult957');
          console.log(searchResult);
          return searchResult;
        });
      });
      //*/
      /*
      .flatMap(function(searchResult) {
        return highland(instance.metadataService.getByDb(searchResult.db)).map(function(metadataRow) {
          console.log('metadataRow');
          console.log(metadataRow);
          return enrichFromMetadata(searchResult, metadataRow);
        });
      })
      //*/
      /*
      .map(function(searchResult) {
        console.log('searchResult');
        console.log(searchResult);
        searchResults.push(searchResult);
        return searchResult;
      })
      //*/
      // TODO why are we not using collect?

      /*
      return highland('end', tsvStream).map(function(endvalue) {
        console.log('end');
        console.log(endvalue);
        tsvParser.end();
        tsvStream.end();
        //organismsAvailableLoaded.emit('load', searchResults);
        return searchResults;
      });
      //*/
    });
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
    get:get,
    getByIri:getByIri,
    getByDbAndIdentifierStreaming:getByDbAndIdentifierStreaming,
    getByBridgedbUrl:getByBridgedbUrl,
    getByBridgedbUrlStreaming:getByBridgedbUrlStreaming,
    getByBridgedbUrlWithCallback:getByBridgedbUrlWithCallback,
    searchByAttribute:searchByAttribute
  };
};

exports = module.exports = EntityReference;
