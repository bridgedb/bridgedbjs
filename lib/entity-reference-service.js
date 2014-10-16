var _ = require('lodash');
var async = require('async');
var config = require('./config.js');
var d3 = require('d3');
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
   * @param args
   * @param callback
   * @return object of this form:
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
    // TODO check and handle case of: typeof === string, such as for bridgedb or identifiers url

    var keysNormalized = _.keys(args).map(function(arg) {
      return arg.toLowerCase();
    });

    /*
    var bridgedbUrlProvided = _.first(keysNormalized.filter(function(keyNormalized) {
      return bridgedbUrlTermVariantsNormalized.indexOf(keyNormalized) > -1;
    }));
    //*/

    var bridgedbUrlProvided = _.first(_.pairs(args).filter(function(pair) {
      var valueNormalized = String(pair[1]).toLowerCase();
      return !!valueNormalized.match(/webservice.bridgedb.org\/.*\/xrefs\/.*\/.*$/);
    }));

    if (!_.isEmpty(bridgedbUrlProvided)) {
      return getByBridgedbUrlStreaming(bridgedbUrlProvided);
    }

    // if no bridgedbUrl was provided, let's try checking whether an identifiers.org IRI was provided

    var organismKeyNormalized = keysNormalized.find(function(keyNormalized) {
      return organismTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var organism;
    if (!!organismKeyNormalized) {
      var organismIndex = keysNormalized.indexOf(organismKeyNormalized);
      organism = args[organismIndex];
    }

    var identifiersDotOrgIri = _.first(_.pairs(args).filter(function(pair) {
      var valueNormalized = String(pair[1]).toLowerCase();
      return !!valueNormalized.match(/identifiers.org\/.*\/.*$/);
    }));

    if (!_.isEmpty(identifiersDotOrgIri)) {
      return getByIriStreaming({
        identifiersDotOrgIri: identifiersDotOrgIri,
        organism: organism
      });
    }

    // If no success up to here, we'll try checking whether db/namespace and identifier were provided

    var dbKeyNormalized = keysNormalized.find(function(keyNormalized) {
      return dbTermVariantsNormalized.indexOf(keyNormalized) > -1;
    });

    var db;
    if (!!dbKeyNormalized) {
      var dbIndex = keysNormalized.indexOf(dbKeyNormalized);
      db = args[dbIndex];
    }

    var identifierKeyNormalized = keysNormalized.find(function(keyNormalized) {
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
  
  /**
   * getByIdentifiersDotOrgIri
   *
   * @param identifiersDotOrgIri string - Example: 'http://identifiers.org/ncbigene/100010' for an Entrez Gene entity
   * @param [ organism ] - Optional Latin or English name. Specifying it will make queries run much faster.
   * @return
   */
  function getByIriStreaming(args) {
    var identifiersDotOrgIri = args.id;
    var organism = organism;

    var identifiersDotOrgIriComponents = identifiersDotOrgIri.split('identifiers.org');
    var identifiersPath = identifiersDotOrgIriComponents[identifiersDotOrgIriComponents.length - 1];

    var identifiersPathComponents = identifiersPath.split('/');
    var namespace = identifiersPathComponents[1];
    var identifier = identifiersPathComponents[2];

    var entityReference = {};
    entityReference.namespace = namespace;
    entityReference.identifier = identifier;

    return instance.metadataService.getByIdentifiersNamespace(namespace).map(function(metadataForIdentifiersNamespace) {
      entityReference = enrichFromMetadata(entityReference, metadataForIdentifiersNamespace);
      return metadataForIdentifiersNamespace.db;
    })
    .flatMap(instance.metadataService.getBridgedbSystemCodeByDb)
    .map(function(bridgedbSystemCode) {
      entityReference.bridgedbSystemCode = bridgedbSystemCode;
      return identifiersDotOrgIri;
    })
    .flatMap(instance.organismService.getByIdentifier)
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
    .flatMap(instance.organismService.getByIdentifier)
    .map(function(organism) {
      entityReference.organism = organism;
      return entityReference;
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
    getByIriStreaming:getByIriStreaming,
    getByDbAndIdentifierStreaming:getByDbAndIdentifierStreaming,
    getByBridgedbUrl:getByBridgedbUrl,
    getByBridgedbUrlStreaming:getByBridgedbUrlStreaming,
    getByBridgedbUrlWithCallback:getByBridgedbUrlWithCallback
  };
};

exports = module.exports = EntityReference;
