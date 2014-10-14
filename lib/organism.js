var _ = require('lodash');
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

var Organism = function(that) {
  var organismsAvailableLoaded = new EventEmitter();
  var organismsAvailableLoadedStream = highland('load', organismsAvailableLoaded);
  //this.availableOrganismsRequested = true;

  var testvalue = 'first';
  //var availableOrganisms = availableOrganisms || [];
  // TODO only request this once

  var getAvailableFromRemoteSource = function() {
    that.availableOrganismsLoading = true;

    // else, start loading the list of available organisms

    var availableOrganisms = [];
    var options = {
      host: config.default.host,
      path: '/contents',
      port: '80',
      withCredentials: false//,
      //headers: {'custom': 'Custom Header'}
    };

    var source = 'http://' + options.host + options.path;

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
      that.availableOrganisms = availableOrganisms;
      /*
      console.log('availableOrganisms1154');
      console.log(availableOrganisms);
      //*/
      tsvParser.end();
      tsvStream.end();
      organismsAvailableLoaded.emit('load', availableOrganisms);
      return availableOrganisms;
      //return callback(null, availableOrganisms);
    });
  };

  var getAvailable = function() {
    /*
    console.log('this1224');
    console.log(this);
    //*/
    return Utilities.runOnce(this, 'availableOrganisms', organismsAvailableLoadedStream, getAvailableFromRemoteSource);
  };

  function test(input, callback) {
    /*
    console.log('this in organism');
    console.log(this);
    //*/
    this.testvalue = input;
    return callback(null, input);
  }

  return {
    getAvailable:getAvailable,
    test:test,
    testvalue:testvalue
  };
};

module.exports = Organism;
