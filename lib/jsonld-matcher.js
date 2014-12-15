var _ = require('lodash');
var highland = require('highland');
var internalContext = require('./context.json');
var jsonld = require('jsonld');
var createJsonldNormalizerStream = highland.ncurry(2,
    highland.flip(highland.wrapCallback(jsonld.normalize)),
    {format: 'application/nquads'});
var Utils = require('./utils.js');

var JsonldMatcher = (function() {
  'use strict';

  var normalizationNSBase = 'jsonldMatcher';
  var jsonldNormalizationNS = normalizationNSBase + 'JsonldNormalized';
  var textNormalizationNS = normalizationNSBase + 'TextNormalized';

  function _removeNormalizedProperties(args) {
    return _.reduce(args, function(result, value, key) {
      if (key.indexOf(normalizationNSBase) !== 0) {
        result[key] = value;
      } else {
        delete result[key];
      }
      return result;
    }, args);
  }

  function _addNormalizedProperties(input, selectedKeys) {
    return highland.pairs(input).filter(function(pair) {
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
    })
    .map(function(result) {
      return result;
    });
  }

  function getFormattedForComparison(
      dataStream, name, selectedKeys) {
    function init() {
      return dataStream.flatMap(function(data) {
        return JsonldMatcher._addNormalizedProperties(
          data, selectedKeys);
      })
      .collect();
    }
    return Utils._runOnce(name, init);
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
   * @param {null|string|number|object|boolean|date|regexp} inputText
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

    var getPairStream = function() {
      return highland.pairs(args).filter(function(pair) {
        return selectedKeys.indexOf(pair[0]) > -1;
      });
    };

    var pairStream = highland.pairs(args).filter(function(pair) {
      return selectedKeys.indexOf(pair[0]) > -1;
    });

    var accepting = true;

    return highland(getFormattedForComparison(
        dataStream, name, selectedKeys))
    .flatMap(function(dataSet) {
      return highland([
        getPairStream().flatMap(function(pair) {
          console.log('1-step123');
          return _findAttempt(pair, dataSet, 0);
        })
        .append(highland.nil),

        //*
        highland([{values: ['huphup1', 'huphup2', 'huphup3']}])
        .append(highland.nil),
        //*/

        getPairStream().filter(function(pair) {
          console.log('2-step123');
          return selectedKeys.indexOf(pair[0]) > -1;
        })
        .flatMap(function(pair) {
          return _findAttempt(pair, dataSet, 1);
        })
        .append(highland.nil),

        highland(dataSet).filter(alternateFilters[0])
        .map(function(dataSet) {
          console.log('3-step123');
          return dataSet;
        })
        .append(highland.nil),

        /*
        .otherwise(
          highland(dataSources)
          .filter(function(dataSource) {
            return !!dataSource.identifierPattern &&
              dataSource.identifierPattern.test(args.exampleIdentifier) &&
              dataSource.isPrimary;
          })
        );
        //*/

        getPairStream().filter(function(pair) {
          console.log('4-step123');
          return selectedKeys.indexOf(pair[0]) > -1;
        })
        .flatMap(function(pair) {
          return _findAttempt(pair, dataSet, 2);
        })
        .append(highland.nil),
        //*

        highland(function() {
          console.log('5-step123');
          var message = 'Could not find a match for ' + name +
            ' for the provided args "' + JSON.stringify(args) + '"';
          var err = new Error(message);
          //console.warn(message);
          return [err];
        }())
      ])
      //.parallel(2)
      //.sequence()
      .flatMap(function(data) {
        console.log('inner');

        var s = data.map(function(el) {
          console.log('el123');
          console.log(el);
          accepting = false;
          return el;
        });

        if (accepting) {
          return s;
        } else {
          return highland([]);
        }
      });
      //*/
    })
    .map(function(data) {
      console.log('outer');
      console.log(data);
      return data;
    });
  }

  var pairByAttemptIndex = [
    function(pair) {
      return highland([pair]);
    },
    // second attempt. if previous failed, we normalize it with a JSON-LD context.
    _jsonldNormalizePair,
    // third attempt. if previous failed, we get a little looser about the match here on this attempt.
    function(pair) {
      return highland([pair]).flatMap(_textNormalizePair);
    }
  ];

  function _findAttempt(pair, dataSet, attemptIndex) {
    return pairByAttemptIndex[attemptIndex](pair)
    .flatMap(function(currentPair) {
      return highland(dataSet).filter(function(data) {
        return data[currentPair[0]] === currentPair[1] ||
          !_.isEmpty(
            _.intersection(
              data[currentPair[0]], currentPair[1]
            )
          );
      });
    });
  }

  /**
   * @private
   *
   * If input is not an array, put it into an array.
   *
   * @param {null|string|number|object|boolean|date|null[]|string[]|number[]|object[]|boolean[]|date[]} input
   * @return {string[]|number[]|object[]|boolean[]|date[]} outputArray
   */
  /*
  function _arrayify(input) {
    return !_.isArray(input) ? [input] : input;
  }
  //*/

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

  /**
   * @private
   *
   * Normalize text arrays for comparison purposes
   *
   * @param {string|number|string[]|number[]} textArray
   * @return {string[]} normalizedText
   */
  /*
  function _normalizeTextArray(textArray) {
    return _arrayify(textArray)
    .map(function(text) {
      return JsonldMatcher._normalizeText(text);
    });
  }
  //*/

  return {
    _addNormalizedProperties:_addNormalizedProperties,
    //_arrayify:_arrayify,
    _find:_find,
    _jsonldNormalizePair:_jsonldNormalizePair,
    _normalizeText:_normalizeText,
    _removeNormalizedProperties:_removeNormalizedProperties,
    _textNormalizePair:_textNormalizePair,
    //_normalizeTextArray:_normalizeTextArray
  };
}());

exports = module.exports = JsonldMatcher;
