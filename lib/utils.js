var _ = require('lodash');
var highland = require('highland');
var url = require('url');

global.bridgeDb = global.bridgeDb || {};

var Utils = (function() {
  'use strict';

  var _runOnce = function(scope, dataName, initMethod) {
    var isGlobal;
    if (scope === 'global') {
      isGlobal = true;
      scope = global.bridgeDb;
    }
    var fullCache = scope[dataName];
    var loadingStream = scope[dataName + 'LoadingStream'];
    if (!!fullCache) {
      /*
      console.log('_runOnce: returning cached data for ' + dataName);
      console.log('Global? ' + isGlobal);
      console.log('fullCache');
      console.log(fullCache.length);
      //*/
      return highland(fullCache);
    } else if (!!loadingStream) {
      /*
      console.log('_runOnce: returning loading/cached data for ' + dataName);
      console.log('Global? ' + isGlobal);
      //*/
      var partialCache = scope[dataName + 'PartialCache'];
      return highland(partialCache)
      .concat(loadingStream.fork());
    } else {
      /*
      console.log('_runOnce: init ' + dataName);
      console.log('Global? ' + isGlobal);
      //*/

      scope[dataName + 'PartialCache'] = [];

      var runOnceStream = initMethod()
      .map(function(data) {
        scope[dataName + 'PartialCache'].push(data);
        return data;
      })
      .errors(function(err, push) {
        console.log('in Utils._runOnce');
        throw err;
      });

      runOnceStream.fork().last()
      .each(function(data) {
        scope[dataName] = scope[dataName + 'PartialCache'];
      });

      scope[dataName + 'LoadingStream'] = runOnceStream;

      return runOnceStream.fork();
    }
  };

  var _runOnceGlobal = function(dataName, initMethod) {
    return _runOnce('global', dataName, initMethod);
  };

  var _runOncePerInstance = function(instance, dataName, initMethod) {
    return _runOnce(instance, dataName, initMethod);
  };

  var _defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  return {
    _runOnceGlobal: _runOnceGlobal,
    _runOncePerInstance: _runOncePerInstance,
    _defaultsDeep: _defaultsDeep,
  };
}());

exports = module.exports = Utils;
