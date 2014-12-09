var _ = require('lodash');
var highland = require('highland');
var internalContext = require('./context.json');
var jsonld = require('jsonld');
var url = require('url');

global.bridgeDb = global.bridgeDb || {};

var Utils = (function() {
  'use strict';

  var _runOnce = function(dataName, initMethod) {
    var bridgeDbGlobal = global.bridgeDb;
    var data = bridgeDbGlobal[dataName];
    var onDataLoadEventStream = bridgeDbGlobal[dataName + 'LoadEventStream'];
    if (!!data) {
      //console.log('_runOnce: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (!!onDataLoadEventStream) {
      //console.log('_runOnce: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      //console.log('_runOnce: init ' + dataName);
      global.bridgeDb[dataName + 'LoadEventStream'] =
        initMethod().map(function(result) {
        global.bridgeDb[dataName] = result;
        return result;
      });
      return global.bridgeDb[dataName + 'LoadEventStream'].fork();
    }
  };

  var _runOncePerInstance = function(instance, dataName, initMethod) {
    var onDataLoadEventStream = instance[dataName + 'LoadEventStream'];
    var data = instance[dataName];
    if (!!data) {
      //console.log('_runOncePerInstance: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (!!onDataLoadEventStream) {
      //console.log('_runOncePerInstance: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      //console.log('_runOncePerInstance: init ' + dataName);
      instance[dataName + 'LoadEventStream'] =
        initMethod().map(function(result) {
        instance[dataName] = result;
        return result;
      });
      return instance[dataName + 'LoadEventStream'].fork();
    }
  };

  var _runOnceNew = function(dataName, initMethod) {
    var bridgeDbGlobal = global.bridgeDb;
    var loaded = bridgeDbGlobal[dataName + 'Loaded'];
    var data = bridgeDbGlobal[dataName];
    var onDataLoadEventStream = bridgeDbGlobal[dataName + 'LoadEventStream'];
    if (loaded) {
      //console.log('_runOnce: returning loaded result for ' + dataName);
      return highland(data);
    } else if (!!onDataLoadEventStream) {
      //console.log('_runOnce: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      //console.log('_runOnce: init ' + dataName);
      global.bridgeDb[dataName] = [];
      onDataLoadEventStream = global.bridgeDb[dataName + 'LoadEventStream'] =
        initMethod().map(function(result) {
          global.bridgeDb[dataName].push(result);
          return result;
        });

      onDataLoadEventStream.fork()
      .last()
      .map(function(result) {
        global.bridgeDb[dataName + 'Loaded'] = true;
      });

      return onDataLoadEventStream.fork();
    }
  };

  var _runOncePerInstanceNew = function(instance, dataName, initMethod) {
    var loaded = instance[dataName + 'Loaded'];
    var onDataLoadEventStream = instance[dataName + 'LoadEventStream'];
    var data = instance[dataName];
    if (!!instance[dataName + 'Loaded']) {
      //console.log('_runOncePerInstance: returning loaded result for ' + dataName);
      return highland(data);
    } else if (!!onDataLoadEventStream) {
      //console.log('_runOncePerInstance: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      //console.log('_runOncePerInstance: init ' + dataName);
      instance[dataName] = [];
      instance[dataName + 'LoadEventStream'] = initMethod()
      .map(function(result) {
        instance[dataName].push(result);
        return result;
      });
      instance[dataName + 'LoadEventStream'].fork()
      .last()
      .map(function() {
        instance[dataName + 'Loaded'] = true;
      });
      return instance[dataName + 'LoadEventStream'].fork();
    }
  };
  var _defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  return {
    _runOnce:_runOnce,
    _runOncePerInstance:_runOncePerInstance,
    _runOnceNew:_runOnceNew,
    _runOncePerInstanceNew:_runOncePerInstanceNew,
    _defaultsDeep:_defaultsDeep,
  };
}());

exports = module.exports = Utils;
