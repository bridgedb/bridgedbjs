var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');
var tsvParser = require('csv-parser')({
  separator: '\t'
});
var Utilities = require('./utilities.js');

var organismsAvailableLoaded = new EventEmitter();
var organismsAvailableLoadedStream = highland('load', organismsAvailableLoaded);

var OrganismService = function(instance) {
  var that = this;

  var organismLoaded = new EventEmitter();
  var organismLoadedStream = highland('load', organismLoaded);

  var getAvailableFromRemoteSource = function() {
    var availableOrganisms = [];
    var path = '/contents';
    var source = instance.config.apiUrlStub + path;
    var headers = ['english', 'latin'].join('\t') + '\n';

    var tsvStream = highland([headers]).concat(
      request({
        url: source
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

    highland('data', tsvStream)
    .map(function(organism) {

      // remove empty properties

      organism = _.omit(organism, function(value) {
        // Note: I intentionally used 'null' as
        // a string, not a native value, because
        // BridgeDB returns the string value
        return value === 'null';
      });

      availableOrganisms.push(organism);
      return organism;
    })
    .last()
    // TODO why are we not using collect?
    //.collect()
    .each(function(organisms) {
      /*
      console.log('organisms348');
      console.log(organisms);
      //*/
    });

    return highland('end', tsvStream).map(function() {
      tsvParser.end();
      tsvStream.end();
      organismsAvailableLoaded.emit('load', availableOrganisms);
      return availableOrganisms;
    });
  };

  var getAvailable = function() {
    return Utilities.runOnce('availableOrganisms', organismsAvailableLoadedStream, getAvailableFromRemoteSource);
  };

  var getByIriWithCallback = function(iri, callback) {
    var getByIriWithoutSpecifyingIri = highland.curry(getByIriByCheckingAvailableOrganisms, iri);
    return Utilities.runOncePerInstance(instance, 'organism', organismLoadedStream, highland.wrapCallback(getByIriWithoutSpecifyingIri)).each(function(organism) {
      return callback(null, organism);
    });
  };

  var getByIriStreaming = highland.wrapCallback(getByIriWithCallback);

  var getByIriByCheckingAvailableOrganisms = function(iri, callback) {
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

    return instance.metadataService.getByIdentifiersDotOrgNamespace(namespace).each(function(metadataRow) {
      var db = metadataRow.db;
      var identifier = iriPathComponents[2];

      instance.metadataService.getBridgedbSystemCodeByDb(db).each(function(bridgedbSystemCode) {
        var exists = highland.wrapCallback(highland.curry(instance.xref.exists, bridgedbSystemCode, identifier));
        // TODO sort organisms by number of pathways at WikiPathways. Get that data as part of build step for this library.
        highland(getAvailable()).sequence()
        .flatFilter(function(organism) {
          return exists(organism.latin);
        })
        .head()
        .each(function(organism) {
          organismLoaded.emit('load', organism);
          return callback(null, organism);
        });
      });
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
    if (!callback) {
      return getByIriStreaming(iri);
    } else {
      return getByIriWithCallback(iri, callback);
    }
  }

  function getNameByIri(args) {
    var iri = args.iri;
    var language = args.language || instance.config.organism.language;
    console.log('args224');
    console.log(args);
    console.log('language');
    console.log(language);
    return getByIriStreaming(iri).map(function(organism) {
      return organism[language];
    });
  }

  return {
    getAvailable:getAvailable,
    getByIri:getByIri,
    getByIriStreaming:getByIriStreaming,
    getByIriWithCallback:getByIriWithCallback,
    getNameByIri:getNameByIri
  };
};

exports = module.exports = OrganismService;
