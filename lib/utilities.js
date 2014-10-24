var _ = require('lodash');
var highland = require('highland');

GLOBAL.bridgedb = GLOBAL.bridgedb || {};

var Utilities = (function(){
  // TODO why do we get an error when we use strict here?
  //'use strict';

  function normalizeText(inputText) {
    // not using \w because we don't want to include the underscore
    var idRegexPatternp = /[^A-Za-z0-9]/gi;
    var alphanumericText = inputText.replace(idRegexPatternp, '');
    var normalizedText = alphanumericText;
    if (!_.isNull(alphanumericText)) {
      normalizedText = alphanumericText.toUpperCase();
    }
    return normalizedText;
  }

  var runOnce = function(dataName, init) {
    var onLoadEventStream;
    //var thisGlobal = GLOBAL.bridgedb;
    var data = GLOBAL.bridgedb[dataName];
    if (!!data) {
      console.log('runOnce: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (GLOBAL.bridgedb[dataName + 'Loading']) {
      console.log('runOnce: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('runOnce: init ' + dataName);
      GLOBAL.bridgedb[dataName + 'Loading'] = true;
      onLoadEventStream = init().map(function(result) {
        GLOBAL.bridgedb[dataName] = result;
        onLoadEventStream.emit('load', result);
        return result;
      });
      return onLoadEventStream.fork();
    }
  };

  var runOncePerInstance = function(instance, dataName, onLoadEventStream, init) {
    var data = instance[dataName];
    if (!!data) {
      console.log('runOncePerInstance: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (instance[dataName + 'Loading']) {
      console.log('runOncePerInstance: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('runOncePerInstance: init ' + dataName);
      instance[dataName + 'Loading'] = true;
      return init.map(function(result) {
        instance[dataName] = result;
        return result;
      });
    }
  };

  return {
    normalizeText:normalizeText,
    runOnce:runOnce,
    runOncePerInstance:runOncePerInstance
  };
}());

exports = module.exports = Utilities;
