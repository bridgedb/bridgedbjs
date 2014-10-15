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
  var enrich = function(xref) {
    return instance.metadataService.getByDb(xref.db).map(function(metadataRow) {
      if (!!metadataRow.type) {
        xref.type = metadataRow.type;
      }
      if (!!metadataRow.namespace) {
        xref.namespace = metadataRow.namespace;
        xref.id = 'http://identifiers.org/' + metadataRow.namespace + '/' + xref.identifier;
      }
      return xref;
    });
  };

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

  var identifiersDotOrgIriTermVariants = [
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

  var identifiersDotOrgIriTermVariantsNormalized = identifiersDotOrgIriTermVariants.map(function(arg) {
    return arg.toLowerCase();
  });

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

    var bridgedbUrlProvided = _.first(keysNormalized.filter(function(keyNormalized) {
      return bridgedbUrlTermVariantsNormalized.indexOf(keyNormalized) > -1;
    }));

    // if no bridgedbUrl was provided, let's try checking whether organism, db or namespace, and identifier were provided

    if (!_.isEmpty(bridgedbUrlProvided)) {
      return getByBridgedbUrlStreaming(bridgedbUrlProvided);
    }

    var organism = _.first(keysNormalized.filter(function(keyNormalized) {
      return organismTermVariantsNormalized.indexOf(keyNormalized) > -1;
    })
    .map(function(keyNormalized) {
      var argIndex = keysNormalized.indexOf(keyNormalized);
      return args[argIndex];
    }));

    var identifiersDotOrgIri = _.first(_.pairs(args).filter(function(pair) {
      var valueNormalized = String(pair[1]).toLowerCase();
      return !!valueNormalized.match(/identifiers.org\/.*\/.*$/);
    }));

    if (!_.isEmpty(identifiersDotOrgIri)) {
      return getByIdentifiersDotOrgIriStreaming(identifiersDotOrgIri, organism);
    }

    var db = _.first(keysNormalized.filter(function(keyNormalized) {
      return dbTermVariantsNormalized.indexOf(keyNormalized) > -1;
    })
    .map(function(keyNormalized) {
      var argIndex = keysNormalized.indexOf(keyNormalized);
      return args[argIndex];
    }));

    var identifier = _.first(keysNormalized.filter(function(keyNormalized) {
      return identifierTermVariantsNormalized.indexOf(keyNormalized) > -1;
    })
    .map(function(keyNormalized) {
      var argIndex = keysNormalized.indexOf(keyNormalized);
      return args[argIndex];
    }));

    if (!!organism && !!db && typeof identifier !== 'undefined') {
      return getByDbAndIdentifier(db, identifier, organism);
    }

    // otherwise,
    throw new Error('Not enough data specified to identify desired entity reference.');
  }

  function getByBridgedbUrlStreaming(url) {
    var bridgedbUrlComponents = url.split(config.apiUrlStub);
    var path = bridgedbUrlComponents[bridgedbUrlComponents.length - 1];

    var bridgedbPathComponents = path.split('/');
    var systemCode = bridgedbPathComponents[3];
    var identifier = bridgedbPathComponents[4];

    var entityReference = {};
    entityReference.identifier = identifier;

    return instance.metadataService.getBySystemCode(systemCode).map(function(metadataRow) {
      entityReference.db = metadataRow.db;
      return entityReference;
    });
  }

  function getByBridgedbUrlWithCallback(url, callback) {
    var bridgedbUrlComponents = url.split(config.apiUrlStub);
    var path = bridgedbUrlComponents[bridgedbUrlComponents.length - 1];

    var bridgedbPathComponents = path.split('/');
    var systemCode = bridgedbPathComponents[3];
    var identifier = bridgedbPathComponents[4];

    var entityReference = {};
    entityReference.identifier = identifier;

      console.log('entityReference');
      console.log(entityReference);

    instance.metadataService.getBySystemCode(systemCode, function(err, metadataRow) {
      console.log('metadataRow');
      console.log(metadataRow);
      entityReference.db = metadataRow.db;
      return callback(null, entityReference);
    });
  }

  /**
   * getByIdentifiersDotOrgIri
   *
   * @param identifiersDotOrgIri string - Example: 'http://identifiers.org/ncbigene/100010' for an Entrez Gene entity
   * @param [ organism ] - Optional Latin or English name. Specifying it will make queries run much faster.
   * @return
   */
  function getByIdentifiersDotOrgIriStreaming(identifiersDotOrgIri, organism) {
    var identifiersDotOrgIriComponents = identifiersDotOrgIri.split('identifiers.org');
    var identifiersPath = identifiersDotOrgIriComponents[identifiersDotOrgIriComponents.length - 1];

    var identifiersPathComponents = identifiersPath.split('/');
    var namespace = identifiersPathComponents[1];
    var identifier = identifiersPathComponents[2];

    var entityReference = {};
    entityReference.namespace = namespace;
    entityReference.identifier = identifier;

    return instance.metadataService.getByIdentifiersNamespace(namespace).map(function(metadataForIdentifiersNamespace) {
      var db = metadataForIdentifiersNamespace.db;
      entityReference.identifier = db;
      return db;
    })
    .flatMap(instance.metadataService.getSystemCodeByDb)
    .map(function(systemCode) {
      entityReference.systemCode = systemCode;
      return identifiersDotOrgIri;
    })
    .flatMap(instance.organismService.getByIdentifier)
    .map(function(organism) {
      entityReference.organism = organism;
      return entityReference;
    });
  }

  /**
   * getByDbAndIdentifier
   *
   * @param db string - name or identifiers.org namespace for database
   * @param identifier string - The primary identifier in the external database of the object to which this xref refers, e.g. '100010' for an Entrez Gene entity
   * @param [ organism ] - Optional Latin or English name. Specifying it will make queries run much faster.
   * @return
   */
  function getByDbAndIdentifier(db, identifier, organism) {
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
    getByIdentifiersDotOrgIriStreaming:getByIdentifiersDotOrgIriStreaming,
    getByDbAndIdentifier:getByDbAndIdentifier,
    getByBridgedbUrlWithCallback:getByBridgedbUrlWithCallback,
    getByBridgedbUrlStreaming:getByBridgedbUrlStreaming
  };
};

exports = module.exports = EntityReference;
