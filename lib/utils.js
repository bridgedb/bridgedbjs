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

  var _runOnce = function(dataName, initMethod) {
    var bridgeDbGlobal = global.bridgeDb;
    bridgeDbGlobal[dataName] = bridgeDbGlobal[dataName] || [];
    var data = bridgeDbGlobal[dataName];

    var dataStream = bridgeDbGlobal[dataName + 'LoadEventStream'];
    if (!!dataStream) {
      console.log('_runOnce: waiting and/or returning loaded result for ' +
          dataName);
      return dataStream.fork()
      .otherwise(highland(data));
      /*
      return highland(data)
      .otherwise(dataStream.fork());
      //*/
      //.otherwise(dataStream.fork())
      //.append(highland.nil);
      //.otherwise(highland([]));
      //.otherwise(highland([highland.nil]));
    } else {
      console.log('_runOnce: init ' + dataName);
      var runOnceStream = initMethod()
      .map(function(result) {
        global.bridgeDb[dataName].push(result);
        return result;
      });

      global.bridgeDb[dataName + 'LoadEventStream'] = runOnceStream;

      return runOnceStream.fork();
    }
  };

  var _runOncePerInstance = function(instance, dataName, initMethod) {
    instance[dataName] = instance[dataName] || [];
    var data = instance[dataName];

    var dataStream = instance[dataName + 'LoadEventStream'];
    /*
    if (!!data) {
      //console.log('_runOncePerInstance: returning loaded result for ' + dataName);
      return highland([data]);
    } else//*/
    if (!!dataStream) {
      console.log('_runOncePerInstance: waiting and/or returning ' +
          'loaded result for ' + dataName);
      return highland(data)
      .otherwise(dataStream.fork());
      //.otherwise(dataStream.fork())
      //.otherwise(highland([]));
      //.append(highland.nil);
      //.otherwise(highland([highland.nil]));
    } else {
      console.log('_runOncePerInstance: init ' + dataName);
      var runOncePerInstanceStream = initMethod()
      .map(function(result) {
        instance[dataName].push(result);
        return result;
      });

      instance[dataName + 'LoadEventStream'] =
        runOncePerInstanceStream;

      return runOncePerInstanceStream.fork();
    }
  };

  var _defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  return {
    _arrayify:_arrayify,
    _runOnce:_runOnce,
    _runOncePerInstance:_runOncePerInstance,
    _defaultsDeep:_defaultsDeep,
  };
}());

exports = module.exports = Utils;
