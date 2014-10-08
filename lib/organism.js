var _ = require('lodash');
var config = require('./config.js');
var CorsProxy = require('./cors-proxy.js');
var tsvParser = require('csv-parser')({
      separator: '\t'
    });
var highland = require('highland');
var httpErrors = require('./http-errors.js');
var jsonLdContext = require('./context.json');
var request = require('request');

var Organism = (function(){

  var that = this;
  var availableOrganisms = availableOrganisms || [];

  var getAvailable = function(callback) {
    console.log('getAvailable organisms');
    if (!_.isEmpty(availableOrganisms)) {
      return callback(null, availableOrganisms);
    }

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
      console.log('organisms348');
      console.log(organisms);
    });

    highland('end', tsvStream).each(function() {
      tsvParser.end();
      tsvStream.end();
      that.available = availableOrganisms;
      return callback(null, availableOrganisms);
    });
  };

  return {
    getAvailable:getAvailable
  };
}());

module.exports = Organism;
