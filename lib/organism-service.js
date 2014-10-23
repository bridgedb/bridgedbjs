var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsv = require('csv-streamify')({objectMode: true, delimiter: '\t'});
var Utilities = require('./utilities.js');

var organismsAvailableLoaded = new EventEmitter();
var organismsAvailableLoadedStream = highland('load', organismsAvailableLoaded);

var OrganismService = function(instance) {
  var that = this;

  var organismLoaded = new EventEmitter();
  var organismLoadedStream = highland('load', organismLoaded);

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
    .collect()
    .map(function(availableOrganisms) {
      console.log(availableOrganisms);
      organismsAvailableLoaded.emit('load', availableOrganisms);
      return availableOrganisms;
    });
  };

  var getAvailable = function() {
    return Utilities.runOnce('availableOrganisms', organismsAvailableLoadedStream, getAvailableFromRemoteSource);
  };

  /*
  var getByIriWithCallback = function(iri, callback) {
    var getByIriWithoutSpecifyingIri = highland.curry(getByIriByCheckingAvailableOrganisms, iri);
    return Utilities.runOncePerInstance(instance, 'organism', organismLoadedStream, highland.wrapCallback(getByIriWithoutSpecifyingIri)).each(function(organism) {
      return callback(null, organism);
    });
  };
  //*/

  //*
  var getByIriStreaming = function(iri) {
    var getByIriWithoutSpecifyingIri = highland.curry(getByIriByCheckingAvailableOrganisms, iri);
    return Utilities.runOncePerInstance(instance, 'organism', organismLoadedStream, getByIriWithoutSpecifyingIri);
  };
  //*/

  /*
  var getByIriStreaming = function() {
    return highland([{
      latin: 'Homo sapiens',
      english: 'Human'
    }]);
  };
  //*/

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
      console.log('bridgedbSystemCode');
      console.log(bridgedbSystemCode);
      exists = highland.wrapCallback(highland.curry(instance.xref.exists, bridgedbSystemCode, identifier));
      return;
    })
    .flatMap(getAvailable)
    // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
    .sequence()
    .flatFilter(function(organism) {
      return exists(organism.latin);
    })
    //.head()
    .map(function(organism) {
      console.log('organism');
      console.log(organism);
      organismLoaded.emit('load', organism);
      return organism;
    });
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
    console.log('iri434');
    console.log(iri);
    if (!callback) {
      return getByIriStreaming(iri);
    } else {
      throw new Error('Callbacks not supported anymore');
    }
  }

  /**
   * normalize
   *
   * Take organism as specified by user and return organism as specified by BridgeDB
   *
   * @param {string} input - Can be Latin or English name. In the future, we might include IRIs for organisms.
   * @return {string} organismName - Normalized as per matching organism in availableOrganisms from BridgeDB
   */
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
    //*/
  }

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

  return {
    getAvailable:getAvailable,
    getByIri:getByIri,
    getByIriStreaming:getByIriStreaming,
    getNameByIri:getNameByIri,
    normalize:normalize
  };
};

exports = module.exports = OrganismService;
