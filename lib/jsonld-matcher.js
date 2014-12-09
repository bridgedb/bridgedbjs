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
  /*
  var arrayNormalizationNS = normalizationNSBase + 'Array';
  var fullNormalizationNS = normalizationNSBase + 'Full';
  //*/

  /*
  function normalizeArgs(args) {
    return _.reduce(args, function(result, value, key) {
      var newKey = (fullNormalizationNS + key)
      .replace(arrayNormalizationNS, '');

      result[newKey] =
        Utils._normalizeTextArray(value);
      return result;
    }, {});
  }
  function normalizeArgsKeepingOriginals(args) {
    var normalizedArgs = normalizeArgs(args);
    return _.merge(args, normalizedArgs);
  }
  function removeNormalizedArgs(args) {
    return _.reduce(args, function(result, value, key) {
      if (key.indexOf(fullNormalizationNS) !== 0) {
        result[key] = Utils._normalizeText(value);
      } else {
        delete result[key];
      }
      return result;
    }, args);
  }

  function arrayifyArgs(args) {
    return _.reduce(args, function(result, value, key) {
      result[arrayNormalizationNS + key] = Utils._arrayify(value);
      return result;
    }, {});
  }
  function arrayifyArgsKeepingOriginals(args) {
    var arrayifiedArgs = arrayifyArgs(args);
    return _.merge(args, arrayifiedArgs);
  }
  //*/

  function _addNormalizedValues(input, selectedKeys) {
    return highland.pairs(input).filter(function(pair) {
      return !selectedKeys ? true : selectedKeys.indexOf(pair[0]) > -1;
    })
    .flatMap(function(pair) {
      //pair[1]['@context'] = pair[1]['@context'] || context;

      /*
      return highland([pair])
      .concat(function() {
        return _jsonldNormalizePair(pair)
        .map(function(jsonldNormalizedPair) {
          console.log('jsonldNormalizedPair');
          console.log(jsonldNormalizedPair);
          return jsonldNormalizedPair;
        });
      });
      //*/

      //*
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
      //*/
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
        return JsonldMatcher._addNormalizedValues(
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
      var key = pair[0] + jsonldNormalizationNS;
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
      var key = (pair[0]).replace(jsonldNormalizationNS, '') +
        textNormalizationNS;
      var value;
      if (_.isArray(pair[1])) {
        value = pair[1].map(_normalizeText);
      } else {
        value = _normalizeText(pair[1]);
      }
      return [key, value];
    });
  }

  function _getOne(pairs, dataStream, name, selectedKeys) {

    var pairStream = highland([pairs]).filter(function(pair) {
      return selectedKeys.indexOf(pair[0]) > -1;
    });

    return highland(getFormattedForComparison(
        dataStream, name, selectedKeys))
    .flatMap(function(dataSet) {
      return pairStream.fork().flatMap(function(pair) {
        return _getOneAttempt(pair, dataSet, 0);
      })
      .otherwise(
        highland([pairs]).filter(function(pair) {
          return selectedKeys.indexOf(pair[0]) > -1;
        })
        .flatMap(function(pair) {
          console.log('pair');
          console.log(pair);
          return _getOneAttempt(pair, dataSet, 1);
        })
      )
      .otherwise(
        highland([pairs]).filter(function(pair) {
          return selectedKeys.indexOf(pair[0]) > -1;
        })
        .flatMap(function(pair) {
          console.log('pair');
          console.log(pair);
          return _getOneAttempt(pair, dataSet, 2);
        })
      )
      .otherwise(
        highland([pairs]).filter(function(pair) {
          return selectedKeys.indexOf(pair[0]) > -1;
        })
        .flatMap(function(pair) {
          console.log('pair');
          console.log(pair);
          return _getOneAttempt(pair, dataSet, 3);
        })
      );
    })
    .head()
    .map(function(gotten) {
      console.log('gotten');
      console.log(gotten);
      return gotten;
    });
  }

  /*
  function _getOne(pairs, dataStream, name, selectedKeys) {
    return getFormattedForComparison(
        dataStream, name, selectedKeys)
    .flatMap(function(dataSet) {
      return highland([pairs]).filter(function(pair) {
        return selectedKeys.indexOf(pair[0]) > -1;
      })
      .flatFilter(function(pair) {
        return _getOneAttempt(pair, dataSet, 0);
      })
      .otherwise(function(pair) {
        return _getOneAttempt(pair, dataSet, 1);
      })
      .otherwise(function(pair) {
        return _getOneAttempt(pair, dataSet, 2);
      })
      .otherwise(function(pair) {
        return _getOneAttempt(pair, dataSet, 3);
      });
    })
    .map(function(gotten) {
      console.log('gotten');
      console.log(gotten);
      return gotten;
    })
    .head();
  }
  //*/

  //*
  var pairByAttemptIndex = [
    function(pair) {
      return highland([pair]);
    },
    _jsonldNormalizePair,
    function(pair) {
      return highland([pair]).flatMap(_textNormalizePair);
    },
    function(pair) {
      throw new Error('Cannot get data requested!');
    }
  ];

  function _getOneAttempt(pair, dataSet, attemptIndex) {
    return pairByAttemptIndex[attemptIndex](pair)
    .map(function(currentPair) {
      return currentPair;
    })
    .flatMap(function(currentPair) {
      console.log('currentPair');
      console.log(currentPair);
      return highland(dataSet).filter(function(data) {
        console.log('data');
        console.log(data);
        return data[currentPair[0]] === currentPair[1] ||
          _.intersection(
            data[currentPair[0]], currentPair[1]
          ).length > 0;
      });
    });
  }
  //*/

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
    _addNormalizedValues:_addNormalizedValues,
    //_arrayify:_arrayify,
    _getOne:_getOne,
    _jsonldNormalizePair:_jsonldNormalizePair,
    _normalizeText:_normalizeText,
    _textNormalizePair:_textNormalizePair,
    //_normalizeTextArray:_normalizeTextArray
  };
}());

exports = module.exports = JsonldMatcher;
