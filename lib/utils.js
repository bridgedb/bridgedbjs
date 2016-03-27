var _ = require('lodash');
var highland = require('highland');
//var JsonldRx = require('jsonld-rx');
var url = require('url');

var Rx = require('rx');
var RxNode = require('rx-node');

var globalScopes = {
  inmemory: global,
  local: {}
};

_.toPairs(globalScopes).map(function(pair) {
  var key = pair[0];
  var value = pair[1];
  value.bridgeDb = value.bridgeDb || {};
});

var Utils = (function() {
  'use strict';

  //var jsonldRx = new JsonldRx();

  var _runOnce = function(scope, itemNS, initMethod) {
    var scopeNS;
    if (!_.isString(scope)) {
      scopeNS = 'instance';
    } else {
      scopeNS = scope;
      scope = globalScopes[scopeNS];
    }

    var sourceCache = scope[itemNS];

    if (sourceCache) {
      return sourceCache;
    }

    var source = RxNode.fromReadableStream(initMethod());

    sourceCache = new Rx.ReplaySubject();
    scope[itemNS] = sourceCache;
    source.subscribe(function(value) {
      sourceCache.onNext(value);
    }, function(err) {
      throw err;
    }, function() {
      sourceCache.onCompleted();
    });
    return sourceCache;
  };

  var _runOnceGlobal = function(itemNS, initMethod) {
    var outputStream = highland();
    var outputSource = _runOnce('inmemory', itemNS, initMethod)
      .map(function(value) {
        return JSON.stringify(value);
      });
    RxNode.writeToStream(outputSource, outputStream);
    return outputStream.map(function(value) {
      return JSON.parse(value);
    });
  };

  var _runOncePerInstance = function(scope, itemNS, initMethod) {
    var outputStream = highland();
    var outputSource = _runOnce(scope, itemNS, initMethod)
      .map(function(value) {
        return JSON.stringify(value);
      });
    RxNode.writeToStream(outputSource, outputStream);
    return outputStream.map(function(value) {
      return JSON.parse(value);
    });

  };

  return {
    _runOnceGlobal: _runOnceGlobal,
    _runOncePerInstance: _runOncePerInstance
  };
}());

exports = module.exports = Utils;
