/* JSON-LD @set and @list intersection
 * Tabular data like data sources (set or list of objects)
 * Search criteria like a db name and an identifier, sorted by the preference for matching ()
 * Given tabular data , we want to find one row that matches
 * a provided object.
 *
 * First, we pull out the keys from the provided object that match the column headers
 * in the tabular data.
 *
 * Then we try matching any of the values for each of those keys.
 */

var _ = require('lodash');
var highland = require('highland');
var hyperquest = require('hyperquest');
var internalContext = require('./context.json');
var jsonld = require('jsonld');
var jsonldRx = require('jsonld-rx');
var Rx = require('rx');
var RxNode = require('rx-node');
var JSONStream = require('JSONStream');

var JsonldMatcher = (function() {
  'use strict';

  var normalizationNSBase = 'jsonldMatcher';
  var jsonldNormalizationNS = normalizationNSBase + 'JsonldNormalized';
  var textNormalizationNS = normalizationNSBase + 'TextNormalized';

  function _removeNormalizedProperties(args) {
    return _.reduce(args, function(result, value, key) {
      if (key.indexOf(normalizationNSBase) !== 0) {
        result[key] = value;
      }
      return result;
    }, {});
  }

  function _addNormalizedProperties(input, selectedKeys) {
    return highland.pairs(input)
    .filter(function(pair) {
      return !selectedKeys ? true : selectedKeys.indexOf(pair[0]) > -1;
    })
    .flatMap(function(pair) {
      return _jsonldNormalizePair(pair)
      .flatMap(function(jsonldNormalizedPair) {
        return _textNormalizePair(jsonldNormalizedPair)
        .flatMap(function(textNormalizedPair) {
          return [
            pair,
            jsonldNormalizedPair,
            textNormalizedPair
          ];
        });
      })
      .map(function(pairs) {
        return pairs;
      });
    })
    .reduce(input, function(accumulator, pair) {
      accumulator[pair[0]] = pair[1];
      return accumulator;
    });
  }

  function _jsonldNormalizePair(pair) {
    var doc = {};
    doc['@context'] = internalContext;
    doc[pair[0]] = pair[1];

    return createJsonldNormalizerStream(doc)
    .map(function(normalized) {
      var elementDelimiter = ' .\n';
      var normalizedValues = normalized.split(elementDelimiter);
      // Get rid of last element, which will always be '' (empty string)
      normalizedValues.pop();
      return normalizedValues;
    })
    .map(function(normalizedValues) {
      var key = jsonldNormalizationNS + pair[0];
      return [key, normalizedValues];
    });
  }

  /**
   * @private
   *
   * Normalize text for comparison purposes
   *
   * @param {undefined|null|string|number|object|boolean|date} inputText
   * @return {string} normalizedText
   */
  function _normalizeText(inputText) {
    var stringifiedInput = inputText;
    if (!_.isString(inputText)) {
      if (_.isNumber(inputText) || _.isRegExp(inputText) ||
          _.isDate(inputText) || _.isBoolean(inputText)) {
        stringifiedInput = inputText.toString();
      } else if (_.isPlainObject(inputText)) {
        stringifiedInput = JSON.stringify(inputText);
      } else if (_.isUndefined(inputText)) {
        stringifiedInput = 'undefined';
      } else if (_.isNull(inputText)) {
        stringifiedInput = 'null';
      } else {
        console.warn('Cannot normalize provided value "' +
          JSON.stringify(inputText) + '".');
        console.warn('Using toString on input.');
        stringifiedInput = inputText.toString();
      }
    }
    // not using \w because we don't want to include the underscore
    var identifierPattern = /[^A-Za-z0-9]/gi;
    var alphanumericText = stringifiedInput.replace(identifierPattern, '');
    var normalizedText = alphanumericText;
    // This could be null if the inputText were something like '-..-'
    if (!_.isNull(alphanumericText)) {
      normalizedText = alphanumericText.toUpperCase();
    }
    return normalizedText;
  }

  function _textNormalizePair(pair) {
    var pairStream;
    if (pair[0].indexOf(jsonldNormalizationNS) === -1) {
      pairStream = _jsonldNormalizePair(pair);
    } else {
      pairStream = highland([pair]);
    }

    return pairStream.map(function(pair) {
      var key = textNormalizationNS +
                (pair[0]).replace(jsonldNormalizationNS, '');
      var value;
      if (_.isArray(pair[1])) {
        value = pair[1].map(_normalizeText);
      } else {
        value = _normalizeText(pair[1]);
      }
      return [key, value];
    });
  }

  function _find(args, dataStream, name, selectedKeys, alternateFilters) {

    var observableInput = RxNode.fromReadableStream(dataStream);
    var observableOutput = jsonldRx.tieredFind(
      args, observableInput, name, selectedKeys, alternateFilters, internalContext);

    observableOutput.subscribe(function(value) {
    }, function(err) {
      throw err;
    });

    return highland([]);

    /*
    var streamOut = _();
    RxNode.writeToStream(observableOutput, streamOut, 'utf8');
    return streamOut;
    //*/
  }

  return {
    _addNormalizedProperties:_addNormalizedProperties,
    _find:_find,
    _jsonldNormalizePair:_jsonldNormalizePair,
    _normalizeText:_normalizeText,
    _removeNormalizedProperties:_removeNormalizedProperties,
    _textNormalizePair:_textNormalizePair,
  };
}());

exports = module.exports = JsonldMatcher;
