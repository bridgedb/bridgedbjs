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

var Utilities = (function(){
  var runOnce = function(that, dataName, loadedStream, init) {
    console.log('1225that');
    console.log(that);
    console.log('1225runOnce');
    var data = that[dataName];
    console.log('1225data');
    console.log(data);
    if (!!data) {
      console.log('1225returning preloaded result for ' + dataName);
      return highland([data]);
    } else if (that[dataName + 'Loading']) {
      console.log('1225waiting for ' + dataName);
      return loadedStream;
    } else {
      return init(that);
    }
  };

  return {
    runOnce:runOnce
  };
}());

module.exports = Utilities;
