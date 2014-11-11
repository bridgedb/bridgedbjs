var _ = require('lodash');
var highland = require('highland');
var url = require('url');

global.bridgedb = global.bridgedb || {};

var Utilities = (function(){
  'use strict';

  function normalizeText(inputText) {
    // not using \w because we don't want to include the underscore
    var identifierPattern = /[^A-Za-z0-9]/gi;
    var alphanumericText = inputText.replace(identifierPattern, '');
    var normalizedText = alphanumericText;
    if (!_.isNull(alphanumericText)) {
      normalizedText = alphanumericText.toUpperCase();
    }
    return normalizedText;
  }

  function normalizeTextArray(textArray) {
    return textArray.map(function(text) {
      return Utilities.normalizeText(text);
    });
  }

  var runOnce = function(dataName, initMethod) {
    var bridgedbGlobal = global.bridgedb;
    var data = bridgedbGlobal[dataName];
    var onDataLoadEventStream = bridgedbGlobal[dataName + 'LoadEventStream'];
    if (!!data) {
      console.log('runOnce: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (!!onDataLoadEventStream) {
      console.log('runOnce: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      console.log('runOnce: init ' + dataName);
      global.bridgedb[dataName + 'LoadEventStream'] = initMethod().map(function(result) {
        global.bridgedb[dataName] = result;
        return result;
      });
      return global.bridgedb[dataName + 'LoadEventStream'].fork();
    }
  };

  var runOncePerInstance = function(instance, dataName, initMethod) {
    var onDataLoadEventStream = instance[dataName + 'LoadEventStream'];
    var data = instance[dataName];
    if (!!data) {
      console.log('runOncePerInstance: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (!!onDataLoadEventStream) {
      console.log('runOncePerInstance: waiting for ' + dataName);
      return onDataLoadEventStream.fork();
    } else {
      console.log('runOncePerInstance: init ' + dataName);
      instance[dataName + 'LoadEventStream'] = initMethod().map(function(result) {
        instance[dataName] = result;
        return result;
      });
      return instance[dataName + 'LoadEventStream'].fork();
    }
  };

  var defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  return {
    normalizeText:normalizeText,
    normalizeTextArray:normalizeTextArray,
    runOnce:runOnce,
    runOncePerInstance:runOncePerInstance,
    defaultsDeep:defaultsDeep,
  };
}());

exports = module.exports = Utilities;
