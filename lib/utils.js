var _ = require('lodash');
var highland = require('highland');
var internalContext = require('./context.json');
var jsonld = require('jsonld');
var url = require('url');

global.bridgeDb = global.bridgeDb || {};

var Utils = (function() {
  'use strict';

  /**
   * @private
   *
   * If input is not an array, put it into an array.
   *
   * @param {null|string|number|object|boolean|date|null[]|string[]|number[]|object[]|boolean[]|date[]} input
   * @return {string[]|number[]|object[]|boolean[]|date[]} outputArray
   */
  function _arrayify(input) {
    input = !!input ? input : [];
    return !_.isArray(input) ? [input] : input;
  }

  var _runOnce = function(scope, dataName, initMethod) {
    scope[dataName] = scope[dataName] || [];
    var cachedData = scope[dataName];
    var dataStream = scope[dataName + 'LoadEventStream'];
    if (!!dataStream) {
      if (dataStream.paused) {
        //console.log('returning cached data for ' + dataName);
        return highland(cachedData);
      } else {
        //console.log('_runOnce: returning loading/cached data for ' + dataName);
        return dataStream.fork()
        .concat(highland(cachedData));
      }
    } else {
      //console.log('_runOnce: init ' + dataName);
      var runOnceStream = initMethod()
      .map(function(data) {
        scope[dataName].push(data);
        return data;
      });

      scope[dataName + 'LoadEventStream'] = runOnceStream;

      return runOnceStream.fork();
    }
  };

  var _runOnceGlobal = function(dataName, initMethod) {
    var scope = global.bridgeDb;
    return _runOnce(scope, dataName, initMethod);
  };

  var _runOncePerInstance = function(instance, dataName, initMethod) {
    return _runOnce(instance, dataName, initMethod);
  };

  var _defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  return {
    _arrayify:_arrayify,
    _runOnceGlobal:_runOnceGlobal,
    _runOncePerInstance:_runOncePerInstance,
    _defaultsDeep:_defaultsDeep,
  };
}());

exports = module.exports = Utils;
