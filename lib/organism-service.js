var _ = require('lodash');
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var OrganismService = function(instance) {
  var getAvailableFromRemoteSource = function() {
    var path = '/contents';
    var source = instance.config.apiUrlStub + path;

    return highland(request({
      url: source,
      withCredentials: false
    })
    .pipe(tsv))
    .map(function(array) {
      return {
        english: array[0],
        latin: array[1]
      };
    })
    .map(function(organism) {

      // remove empty properties

      organism = _.omit(organism, function(value) {
        // Note: I intentionally used 'null' as
        // a string, not a native value, because
        // BridgeDB returns the string value
        return value === 'null';
      });

      return organism;
    })
    .collect();
  };

  var getAvailable = function() {
    return Utilities.runOnce('availableOrganisms', getAvailableFromRemoteSource);
  };

  var getByIriStreaming = function(iri) {
    var getByIriWithoutSpecifyingIri = highland.curry(getByIriByCheckingAvailableOrganisms, iri);
    return Utilities.runOncePerInstance(instance, 'organism', getByIriWithoutSpecifyingIri);
  };

  var getByIriByCheckingAvailableOrganisms = function(iri) {
    // TODO as part of the build process, query all species like this:
    // http://webservice.bridgedb.org/Human/sourceDataSources
    // http://webservice.bridgedb.org/Human/targetDataSources
    // to get a listing of which datasources go with which species.
    // Save that data as a JSON file.
    // Then use those limitations in this query.
    //
    // Also, look into using the identifiers.org registry data, such
    // as regexes, to work with this:
    // http://www.ebi.ac.uk/miriam/main/export/registry.ttl
    // Notice that datasources.txt already has at least some of these.

    var iriComponents = iri.split('identifiers.org');
    var iriPath = iriComponents[iriComponents.length - 1];

    var iriPathComponents = iriPath.split('/');
    var namespace = iriPathComponents[1];

    var db;
    var identifier = iriPathComponents[2];
    var availableOrganisms;
    var exists;
    return instance.metadataService.getByIdentifiersDotOrgNamespace(namespace).map(function(metadataRow) {
      db = metadataRow.db;
      return db;
    })
    .flatMap(instance.metadataService.getBridgedbSystemCodeByDb)
    .map(function(bridgedbSystemCode) {
      exists = highland.wrapCallback(highland.curry(instance.xrefService.exists, bridgedbSystemCode, identifier));
      return;
    })
    .flatMap(getAvailable)
    // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
    .sequence()
    .flatFilter(function(organism) {
      return exists(organism.latin);
    })
    .head()
    .map(function(organism) {
      return organism;
    });
  };

  var getByBridgedbSystemCodeAndIdentifierByCheckingAvailableOrganisms = function(bridgedbSystemCode, identifier) {
    // TODO as part of the build process, query all species like this:
    // http://webservice.bridgedb.org/Human/sourceDataSources
    // http://webservice.bridgedb.org/Human/targetDataSources
    // to get a listing of which datasources go with which species.
    // Save that data as a JSON file.
    // Then use those limitations in this query.
    //
    // Also, look into using the identifiers.org registry data, such
    // as regexes, to work with this:
    // http://www.ebi.ac.uk/miriam/main/export/registry.ttl
    // Notice that datasources.txt already has at least some of these.

    var exists = highland.wrapCallback(highland.curry(instance.xrefService.exists, bridgedbSystemCode, identifier));

    var initStream = getAvailable()
    // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
    .sequence()
    .flatFilter(function(organism) {
      return exists(organism.latin);
    })
    .map(function(organism) {
      return organism;
    });

    return Utilities.runOncePerInstance(instance, 'organism', initStream);
  };

  /**
   * getByIri
   *
   * Gets all available information about the organism, including the name in multiple languages.
   *
   * @param iri
   * @param callback
   * @return
   */
  function getByIri(iri, callback) {
    if (!callback) {
      return getByIriStreaming(iri);
    } else {
      throw new Error('Callbacks not supported anymore');
    }
  }

  /**
   * getByEntityReference
   *
   * @param {object} entityReference
   * @param {string} entityReference.bridgedbSystemCode
   * @param {string} entityReference.identifier - the identifier for the entity reference, e.g. '4292' for Entrez Gene.
   * @return {stream} organism
   */
  function getByEntityReference(entityReference) {
    var bridgedbSystemCode = entityReference.bridgedbSystemCode;
    var identifier = entityReference.identifier;

    return instance.metadataService.getByEntityReference(entityReference)
    .flatMap(function(metadataRow) {
      var organism = metadataRow.organism;
      if (!!organism) {
        return highland([organism]);
      }

      if (!!bridgedbSystemCode && !!identifier) {
        return getByBridgedbSystemCodeAndIdentifierByCheckingAvailableOrganisms(bridgedbSystemCode, identifier);
      }
    });
  }

  /**
   * normalize
   *
   * Take organism as specified by user and return organism as specified by BridgeDB
   *
   * @param {string} input - Can be Latin or English name. In the future, we might include IRIs for organisms.
   * @return {string} organismName - Latin organism name as used at BridgeDB
   */
  function normalize(input) {
    console.log('input');
    console.log(input);
    var normalizedInput = Utilities.normalizeText(input);
    return getAvailable().sequence()
    .find(function(organism) {
      var latinName = organism.latin;
      var latinNameComponents = organism.latin.split(' ');
      var latinNameAbbreviated = latinNameComponents[0][0] + latinNameComponents[1];
      var englishName = organism.english;
      return Utilities.normalizeText(latinName) === normalizedInput ||
        Utilities.normalizeText(latinNameAbbreviated) === normalizedInput ||
        Utilities.normalizeText(englishName) === normalizedInput;
    })
    .map(function(organism) {
      return !!organism.latin && organism.latin;
    });
  }
  /* TODO delete this old version of normalize
  function normalize(input) {
    var normalizedInput = Utilities.normalizeText(input);
    return highland(getAvailable()).sequence()
    .map(highland.values)
    .flatten()
    .compact()
    .map(function(organismIdentifier) {
      return organismIdentifier;
    })
    .find(function(organismIdentifier) {
      return Utilities.normalizeText(organismIdentifier) === normalizedInput;
    });
  }
  //*/

  /**
   * getNameByIri
   *
   * @param {object} args
   * @param {string} args.iri
   * @param {string} [args.language] - Default "latin", but user can specify "english".
   * @return {string} organismName - From availableOrganisms from BridgeDB
   */
  function getNameByIri(args) {
    var iri = args.iri;
    var language = args.language || instance.config.organism.language;
    return getByIriStreaming(iri).map(function(organism) {
      return organism[language];
    });
  }

  function set(providedOrganism) {
    getAvailable().find(function(organism) {
      return organism.latin === providedOrganism;
    })
    .map(function(organism) {
      instance.organism = organism;
    });
  }

  return {
    getAvailable:getAvailable,
    getByEntityReference:getByEntityReference,
    getByIri:getByIri,
    getByIriStreaming:getByIriStreaming,
    getNameByIri:getNameByIri,
    normalize:normalize,
    set:set
  };
};

exports = module.exports = OrganismService;
