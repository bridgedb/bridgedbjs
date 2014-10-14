var _ = require('lodash');
var async = require('async');
var config = require('./config.js');
var CorsProxy = require('./cors-proxy.js');
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

var Organism = function(instance) {
  var that = this;

  var organismLoaded = new EventEmitter();
  var organismLoadedStream = highland('load', organismLoaded);

  //var availableOrganisms = availableOrganisms || [];

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
    /*
    console.log('this1224');
    console.log(this);
    //*/
    return Utilities.runOnce('availableOrganisms', organismsAvailableLoadedStream, getAvailableFromRemoteSource);
  };

  var getByIdentifier = function(identifier, callback) {
    console.log('identifier in getByIdentifier');
    console.log(identifier);
    console.log('helloinstance.config.apiUrlStub');
    console.log(instance.config.apiUrlStub);
    var getByIdentifierWithoutSpecifyingIdentifier = highland.curry(getByIdentifierByCheckingAvailableOrganisms, identifier);
    return Utilities.runOncePerInstance(instance, 'myorganism', organismLoadedStream, highland.wrapCallback(getByIdentifierWithoutSpecifyingIdentifier)).each(function(organism) {
      return callback(null, organism);
    });
  };

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

    console.log('identifier212');
    console.log(identifier);
    var identifiersUriComponents = identifier.split('identifiers.org');
    var identifiersPath = identifiersUriComponents[identifiersUriComponents.length - 1];

    var identifiersPathComponents = identifiersPath.split('/');
    var identifiersNamespace = identifiersPathComponents[1];

    return instance.metadataService.getByIdentifiersNamespace(identifiersNamespace, function(err, metadataForIdentifiersNamespace) {
      /*
      console.log('err');
      console.log(err);
      console.log('metadataForIdentifiersNamespace');
      console.log(metadataForIdentifiersNamespace);
      //*/
      var dbName = metadataForIdentifiersNamespace.dbName;

      var dbId = identifiersPathComponents[2];

      var mydata;

      instance.metadataService.getBridgedbSystemCode(dbName, function(err, systemCode) {
        instance.organism.getAvailable().map(function(result) {
          return result;
        })
        .map(function(organisms) {
          /*
          console.log('systemCode');
          console.log(systemCode);
          console.log('organisms358');
          console.log(organisms);
          //*/

          var organismsCount = organisms.length;
          var validOrganism;
          var thisXrefExists = false;
          var i = 0;
          async.doUntil(
            function (doUntilCallback) {
              instance.xref.exists(encodeURIComponent(organisms[i].latin), systemCode, dbId, function(err, exists) {
                thisXrefExists = exists;
                if (exists) {
                  validOrganism = organisms[i];
                }
                i++;
                doUntilCallback();
              });
            },
            function () {
              return i > organismsCount - 1 || thisXrefExists;
            },
            function (err) {
              if (err || !thisXrefExists) {
                return callback('Could not find BridgeDB reference matching provided entityReference "' + identifier + '"');
              }

              organismLoaded.emit('load', validOrganism);
              return callback(null, validOrganism);
            }
          );
        })
        // TODO why does this not work???
        // Using the line below seems like the right way to do this,
        // but instead I have to use .map(), as above.
        //.apply(getByIdentifiersNamespaceWhenMetadataLoads)
        .each(function() {

        });
        //*/
      });
    });
  };

  return {
    getAvailable:getAvailable,
    getByIdentifier:getByIdentifier
  };
};

module.exports = Organism;
