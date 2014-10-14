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
  var that = this;
  var runOnce = function(dataName, onLoadEventStream, init) {
    /*
    console.log('1225that');
    console.log(that);
    console.log('1225runOnce');
    //*/
    var data = that[dataName];
    /*
    console.log('1225data');
    console.log(data);
    //*/
    console.log('* that[' + dataName + 'Loading]');
    console.log(that[dataName + 'Loading']);
    if (!!data) {
      console.log('U1247: returning preloaded result for ' + dataName);
      return highland([data]);
    } else if (that[dataName + 'Loading']) {
      console.log('U1247: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1247: init ' + dataName);
      that[dataName + 'Loading'] = true;
      return init(that);
    }
  };

  var runOncePerInstance = function(instance, dataName, onLoadEventStream, init) {
    /*
    console.log('1225instance');
    console.log(instance);
    console.log('1225runOnce');
    //*/
    var data = instance[dataName];
    /*
    console.log('1225data');
    console.log(data);
    //*/
    if (!!data) {
      console.log('U1246: returning preloaded result for ' + dataName);
      return highland([data]);
    } else if (instance[dataName + 'Loading']) {
      console.log('U1246: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1246: init ' + dataName);
      instance[dataName + 'Loading'] = true;
      return init();
    }
  };

  return {
    runOnce:runOnce,
    runOncePerInstance:runOncePerInstance
  };
}());

module.exports = Utilities;
