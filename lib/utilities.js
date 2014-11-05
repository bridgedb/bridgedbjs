var _ = require('lodash');
var highland = require('highland');

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

  var runOncePerInstance = function(instance, dataName, initStream) {
    var onLoadEventStream = instance.onLoadEventStream;
    var data = instance[dataName];
    if (!!data) {
      console.log('runOncePerInstance: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (!!onLoadEventStream) {
      console.log('runOncePerInstance: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('runOncePerInstance: init ' + dataName);
      instance.onLoadEventStream = initStream.map(function(result) {
        instance[dataName] = result;
        return result;
      });
      return instance.onLoadEventStream.fork();
    }
  };

  var defaultsDeep = _.partialRight(_.merge, function deep(value, other) {
    return _.merge(value, other, deep);
  });

  var convertToArray = function(input) {
    input = input || [];
    return _.isArray(input) ? input : [input];
  };

  var mergeContexts = function(contexts) {
    var irisHandled = {};
    var compactedIris = {};
    return _(contexts)
    .flatten()
    .compact()
    .reduceRight(function(mergedContext, context) {
      if (_.isPlainObject(context)) {
        mergedContext.unshift(_(context)
        .filter(function(item) {
          return !!item['@id'] && !irisHandled[item['@id']];
        })
        .map(function(item) {
          irisHandled[item['@id']] = _.keys(item)[0];
          return item;
        }));
      } else {

      }
      return mergedContext.concat(context);
    }, []);
  };

  return {
    normalizeText:normalizeText,
    runOnce:runOnce,
    runOncePerInstance:runOncePerInstance,
    defaultsDeep:defaultsDeep,
    mergeContexts:mergeContexts,
    convertToArray:convertToArray
  };
}());

exports = module.exports = Utilities;
