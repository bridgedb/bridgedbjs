var _ = require('lodash');
var highland = require('highland');

var Utilities = (function(){
  // TODO why do we get an error when we use strict here?
  //'use strict';

  var that = this;

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

  var runOnce = function(dataName, onLoadEventStream, init) {
    var data = that[dataName];
    if (!!data) {
      console.log('U1247: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (that[dataName + 'Loading']) {
      console.log('U1247: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1247: init ' + dataName);
      that[dataName + 'Loading'] = true;
      return init(that).map(function(result) {
        that[dataName] = result;
        return result;
      });
    }
  };

  var runOncePerInstance = function(instance, dataName, onLoadEventStream, init) {
    var data = instance[dataName];
    if (!!data) {
      console.log('U1246: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (instance[dataName + 'Loading']) {
      console.log('U1246: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1246: init ' + dataName);
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
