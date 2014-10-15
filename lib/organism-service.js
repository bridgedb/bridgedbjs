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

  var getByIdentifierWithCallback = function(identifier, callback) {
    var getByIdentifierWithoutSpecifyingIdentifier = highland.curry(getByIdentifierByCheckingAvailableOrganisms, identifier);
    return Utilities.runOncePerInstance(instance, 'organism', organismLoadedStream, highland.wrapCallback(getByIdentifierWithoutSpecifyingIdentifier)).each(function(organism) {
      return callback(null, organism);
    });
  };

  var getByIdentifierStreaming = highland.wrapCallback(getByIdentifierWithCallback);

  var getByIdentifierByCheckingAvailableOrganisms = function(identifier, callback) {
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

    var identifiersUriComponents = identifier.split('identifiers.org');
    var identifiersPath = identifiersUriComponents[identifiersUriComponents.length - 1];

    var identifiersPathComponents = identifiersPath.split('/');
    var identifiersNamespace = identifiersPathComponents[1];

    return instance.metadataService.getByIdentifiersNamespace(identifiersNamespace).each(function(metadataForIdentifiersNamespace) {
      var dbName = metadataForIdentifiersNamespace.dbName;
      var dbId = identifiersPathComponents[2];

      console.log('dbName');
      console.log(dbName);

      instance.metadataService.getSystemCodeByDbName(dbName).each(function(systemCode) {
        var exists = highland.wrapCallback(highland.curry(instance.xref.exists, systemCode, dbId));
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

  function getByIdentifier(identifier, callback) {
    if (!callback) {
      return getByIdentifierStreaming(identifier);
    } else {
      return getByIdentifierWithCallback(identifier, callback);
    }
  }

  return {
    getAvailable:getAvailable,
    getByIdentifier:getByIdentifier,
    getByIdentifierStreaming:getByIdentifierStreaming,
    getByIdentifierWithCallback:getByIdentifierWithCallback
  };
};

exports = module.exports = OrganismService;
