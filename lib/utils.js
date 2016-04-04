var _ = require('lodash');
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

  return {
    _runOnceGlobal: _runOnceGlobal,
    _runOncePerInstance: _runOncePerInstance
  };
}());

exports = module.exports = Utils;
