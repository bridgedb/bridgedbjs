/* Utilities for performing tests.
 */

var _ = require('lodash');
var argv = require('yargs').argv;
var colors = require('colors');
var fs = require('fs');
var multiplex = require('./multiplex.js');
var pd = require('pretty-data').pd;
var strcase = require('tower-strcase');

var PLACEHOLDER = '--------------- EMPTY/PLACEHOLDER ---------------';

function stringifyJSON(json) {
  return JSON.stringify(json, null, '  ');
}

var testUtils = (function() {
  'use strict';

  var kindMappings = {
    'unchanged': {
      name: 'Unchanged',
      lhs: {
        bgColor: 'black',
        color: 'white',
      },
      rhs: {
        bgColor: 'black',
        color: 'white',
      }
    },
    'edited': {
      name: 'Edited',
      lhs: {
        bgColor: 'bgYellow',
        color: 'black',
      },
      rhs: {
        bgColor: 'bgYellow',
        color: 'black',
      }
    },
    'added': {
      name: 'Added',
      lhs: {
        bgColor: 'bgRed',
        color: 'white',
      },
      rhs: {
        bgColor: 'bgGreen',
        color: 'black',
      }
    },
    'deleted': {
      name: 'Deleted',
      lhs: {
        bgColor: 'bgGreen',
        color: 'black',
      },
      rhs: {
        bgColor: 'bgRed',
        color: 'white',
      }
    },
    // moved (an item in an array)
    'moved': {
      name: 'Moved',
      lhs: {
        bgColor: 'bgYellow',
        color: 'black',
      },
      rhs: {
        bgColor: 'bgYellow',
        color: 'black',
      }
    }
  };

  function diffOne(expected, actual) {
    /*
    expected = expected || PLACEHOLDER;
    actual = actual || PLACEHOLDER;
    //*/
    var result = {
      expected: expected,
      actual: actual
    };
    var expectedString = stringifyJSON(expected);
    var actualString = stringifyJSON(actual);
    if (actualString === expectedString) {
      result.kind = 'unchanged';
      return [result];
    }
    if (typeof actual === 'undefined') {
      result.kind = 'deleted';
      return [result];
    }
    if (typeof expected === 'undefined') {
      result.kind = 'added';
      return [result];
    }
    var expectedType = typeof expected;
    var actualType = typeof actual;

    var expectedIsArray = _.isArray(expected);
    var actualIsArray = _.isArray(actual);

    var expectedIsPlainObject = _.isPlainObject(expected);
    var actualIsPlainObject = _.isPlainObject(actual);
    if ((actualType !== expectedType) ||
        (actualIsArray !== expectedIsArray) ||
        (actualIsPlainObject !== expectedIsPlainObject)) {
      result.kind = 'edited';
      return [result];
    }
    if (actualIsArray) {
      var expectedLength = expected.length;
      var actualLength = actual.length;
      if (actualLength !== expectedLength) {
        var maxArrayLength = Math.max(expectedLength, actualLength);
        [expected, actual].forEach(function(item) {
          var itemLength = item.length;
          if (itemLength < maxArrayLength) {
            var itemsToAddCount = maxArrayLength - itemLength;
            //var itemsToAdd = _.fill(new Array(itemsToAddCount), 'test-utils-placeholder');
            _.fill(new Array(itemsToAddCount), PLACEHOLDER).forEach(function(toAdd) {
              item.push(toAdd);
            });
          }
        });
      }
      var expectedArrayStrings = expected.map(stringifyJSON);
      var actualArrayStrings = actual.map(stringifyJSON);
      return _.zip(expected, expectedArrayStrings, actual, actualArrayStrings)
      .map(function(zipped) {
        var expectedItem = zipped[0];
        var expectedItemString = zipped[1];

        var actualItem = zipped[2];
        var actualItemString = zipped[3];

        var resultItem = {
          expected: expectedItem,
          actual: actualItem
        };
        if (actualItemString === expectedItemString) {
          resultItem.kind = 'unchanged';
          return resultItem;
        }
        if (expectedArrayStrings.indexOf(actualItemString) > -1) {
          resultItem.kind = 'moved';
          return resultItem;
        }
        if (expectedItemString === PLACEHOLDER) {
          resultItem.kind = 'deleted';
          return resultItem;
        }
        if (actualItemString === PLACEHOLDER) {
          resultItem.kind = 'added';
          return resultItem;
        }
      });
    }
    if (actualIsPlainObject) {
      var actualKeys = _.keys(actual);
      var expectedKeys = _.keys(expected);
      var intersectionKeys = _.intersection(actualKeys, expectedKeys);
      var xorKeys = _.xor(actualKeys, expectedKeys);
      var addedProperties = [];
      var deletedProperties = [];
      var editedProperties = [];
      var intersectionResults = intersectionKeys.map(function(intersectionKey) {
        var expectedValue = expected[intersectionKey];
        var expectedValueString = stringifyJSON(expectedValue);
        var expectedProperty = {};
        expectedProperty[intersectionKey] = expectedValue;

        var actualValue = actual[intersectionKey];
        var actualProperty = {};
        actualProperty[intersectionKey] = actualValue;
        var actualValueString = stringifyJSON(actualValue);

        var resultItem = {
          expected: expectedProperty,
          actual: actualProperty
        };

        if (actualValueString !== expectedValueString) {
          resultItem.kind = 'edited';
          return resultItem;
        } else {
          resultItem.kind = 'unchanged';
          return resultItem;
        }

        console.error('expected');
        console.error(expectedProperty);
        console.error('actual');
        console.error(actualProperty);
        throw new Error('Cannot handle above value for actual or expected.');
      });
      var xorResults = xorKeys.map(function(xorKey) {
        var expectedValue = expected[xorKey];
        var expectedValueString = stringifyJSON(expectedValue);
        var expectedProperty = {};
        expectedProperty[xorKey] = expectedValue;
        var expectedHasProperty = expected.hasOwnProperty(xorKey);

        var actualValue = actual[xorKey];
        var actualProperty = {};
        actualProperty[xorKey] = actualValue;
        var actualValueString = stringifyJSON(actualValue);
        var actualHasProperty = actual.hasOwnProperty(xorKey);

        var resultItem = {};

        if (expectedHasProperty) {
          resultItem.kind = 'deleted';
          resultItem.expected = expectedProperty;
          resultItem.actual = PLACEHOLDER;
          return resultItem;
        }
        if (actualHasProperty) {
          resultItem.kind = 'added';
          resultItem.expected = PLACEHOLDER;
          resultItem.actual = actualProperty;
          return resultItem;
        }

        console.error('expected');
        console.error(expectedProperty);
        console.error('actual');
        console.error(actualProperty);
        throw new Error('Cannot handle above value for actual or expected.');
      });
      return intersectionResults.concat(xorResults);
    }
    console.error('expected');
    console.error(expectedItemString);
    console.error('actual');
    console.error(actualItemString);
    throw new Error('Cannot handle above value for actual or expected.');
  }

  function diffDeep(expected, actual, depth) {
    if (typeof depth === 'undefined' || depth === null) {
      depth = 1;
    }

    var result = {
      expected: expected,
      actual: actual
    };

    var expectedType = typeof expected;
    var actualType = typeof actual;

    var expectedIsUndefined = (expectedType === 'undefined');
    var actualIsUndefined = (actualType === 'undefined');

    if (expectedIsUndefined && actualIsUndefined) {
      throw new Error('At least one of actual and expected must not be undefined.');
    } else if (expectedIsUndefined) {
      result.expected = PLACEHOLDER;
      result.kind = 'added';
      return [result];
    } else if (actualIsUndefined) {
      result.actual = PLACEHOLDER;
      result.kind = 'deleted';
      return [result];
    }

    var expectedIsArray = _.isArray(expected);
    var actualIsArray = _.isArray(actual);

    var expectedIsPlainObject = _.isPlainObject(expected);
    var actualIsPlainObject = _.isPlainObject(actual);

    if ((actualType !== expectedType) ||
        (actualIsArray !== expectedIsArray) ||
        (actualIsPlainObject !== expectedIsPlainObject)) {
      result.kind = 'edited';
      return [result];
    }
    if (depth === 0) {
      return diffOne(expected, actual).reduce(function(accumulator, diffResult) {
        return accumulator.concat(diffResult);
      }, []);
    }
    if (actualIsPlainObject) {
      var expectedKeys = _.keys(expected);
      var actualKeys = _.keys(actual);

      var intersectionKeys = _.intersection(expectedKeys, actualKeys);
      var xorKeys = _.xor(expectedKeys, actualKeys);

      var addedProperties = [];
      var deletedProperties = [];
      var editedProperties = [];

      var intersectionResults = intersectionKeys.map(function(intersectionKey) {
        var expectedValue = expected[intersectionKey];
        var expectedValueString = stringifyJSON(expectedValue);
        var expectedProperty = {};
        expectedProperty[intersectionKey] = expectedValue;

        var actualValue = actual[intersectionKey];
        var actualProperty = {};
        actualProperty[intersectionKey] = actualValue;
        var actualValueString = stringifyJSON(actualValue);

        var resultItem = {
          expected: expectedProperty,
          actual: actualProperty
        };

        if (expectedValueString === actualValueString) {
          resultItem.kind = 'unchanged';
          return resultItem;
        } else {
          return diffDeep(expectedProperty, actualProperty, depth - 1);
        }
      });
      var xorResults = xorKeys.map(function(xorKey) {
        var expectedValue = expected[xorKey];
        var expectedValueString = stringifyJSON(expectedValue);
        var expectedProperty = {};
        expectedProperty[xorKey] = expectedValue;

        var actualValue = actual[xorKey];
        var actualProperty = {};
        actualProperty[xorKey] = actualValue;
        var actualValueString = stringifyJSON(actualValue);

        var resultItem = {};

        if (!actualValue && !!expectedValue) {
          resultItem.kind = 'deleted';
          resultItem.expected = expectedProperty;
          resultItem.actual = PLACEHOLDER;
          return resultItem;
        }
        if (!expectedValue && !!actualValue) {
          resultItem.kind = 'added';
          resultItem.expected = PLACEHOLDER;
          resultItem.actual = actualProperty;
          return resultItem;
        }
      });
      return intersectionResults.concat(xorResults);
    }

    if (actualIsArray) {
      return _.zip(expected, actual)
      .map(function(zipped) {
        var expectedItem = zipped[0];
        var actualItem = zipped[1];
        return diffDeep(expectedItem, actualItem, depth - 1);
      });
    }
  }

  /**
   * compareJson
   *
   * @param {string} expectedJsonString
   * @param {string} actualJsonString
   * @return
   */
  function compareJson(expectedJson, actualJson) {
    var expectedJsonString = stringifyJSON(expectedJson);
    var actualJsonString = stringifyJSON(actualJson);
    if (actualJsonString === expectedJsonString) {
      // We're good
      return true;
    }

    if (expectedJsonString === '{}') {
      console.log('***************************************************');
      console.log('**      New Test - No Expected JSON Available    **');
      console.log('** If Actual JSON below is valid, save it as     **');
      console.log('** Expected JSON with the following command:     **');
      console.log('** gulp testClass --update=BridgeDb.Class.method **');
      console.log('***************************************************');
      displayActualJson(actualJson);
      return false;
    }

    var jsonDiffs = diffDeep(expectedJson, actualJson)
    .reduce(function(accumulator, diffResult) {
      return accumulator.concat(diffResult);
    }, [])
    .filter(function(diffResult) {
      return diffResult.kind !== 'unchanged';
    });

    var coloredSideStrings = jsonDiffs.map(function(jsonDiff) {
      var kindMapping = kindMappings[jsonDiff.kind];
      var lhsColoredString = stringifyJSON(jsonDiff.expected)
        [kindMapping.lhs.color][kindMapping.lhs.bgColor];
      var rhsColoredString = stringifyJSON(jsonDiff.actual)
        [kindMapping.rhs.color][kindMapping.rhs.bgColor];
      return {
        lhs: lhsColoredString,
        rhs: rhsColoredString
      };
    })
    .reduce(function(accumulator, coloredSideStringsForItem) {
      var sideStringDataSets = [
        coloredSideStringsForItem.lhs,
        coloredSideStringsForItem.rhs
      ]
      .map(function(sideString) {
        return sideString.split('\n');
      })
      .map(function(sideStringLines) {
        return {
          lines: sideStringLines,
          lineCount: sideStringLines.length
        };
      });

      var maxSideLineCount = _.maxBy(sideStringDataSets, 'lineCount').lineCount;
      var coloredStrings = _.map(sideStringDataSets, function(sideStringData) {
        var sideStringLineCount = sideStringData.lineCount;
        var sideStringLines = sideStringData.lines;
        if (sideStringLineCount < maxSideLineCount) {
          var linesToAddCount = maxSideLineCount - sideStringLineCount;
          sideStringLines = sideStringLines.concat(_.fill(new Array(linesToAddCount), ''));
        }
        return sideStringLines.join('\n');
      });

      accumulator.lhs += '\n\n' + coloredStrings[0];
      accumulator.rhs += '\n\n' + coloredStrings[1];
      return accumulator;
    }, {lhs: '', rhs: ''});

    multiplex({
      header: {
        label: 'Diff Results'
      },
      left: {
        label: 'Expected',
        content: coloredSideStrings.lhs,
        //height: coloredSideStrings.lhs.split('\n').length * 3,
      },
      right: {
        label: 'Actual',
        content: coloredSideStrings.rhs,
        //height: coloredSideStrings.rhs.split('\n').length * 3,
      }
    });

    return false;
  }

  /**
   * displayActualJson
   *
   * @param {object|array} actualJson
   * @return
   */
  function displayActualJson(actualJson) {
    console.log('**************************************');
    console.log('**           Actual JSON            **');
    console.log('**************************************');
    console.log(pd.json(actualJson).white.bgBlue);
  }

  /**
   * getLkgDataString
   *
   * @param {string} lkgDataPath
   * @return
   */
  function getLkgDataString(lkgDataPath) {
    var lkgExists = fs.existsSync(lkgDataPath);
    var lkgDataString = lkgExists ? fs.readFileSync(lkgDataPath, {
      encoding: 'utf8'
    }) : false;
    return !!lkgDataString ? lkgDataString : '{}';
  }

  /**
   * Find whether user requested to update the expected JSON result
   * for the current file/method
   *
   * @param {string} methodName
   * @return
   */
  function getUpdateState(methodName) {
    var methodsToUpdate = _.isArray(argv.update) ? argv.update : [argv.update];
    var updateEnabled = methodsToUpdate.indexOf(methodName) > -1;
    /* TODO is there a way we can get the filename of the file
     * that calls this function?
    var path = require('path');
    var currentFileName =
      path.basename(module.filename, path.extname(module.filename));
    var updateEnabled = !_(methodsToUpdate)
    .compact()
    .filter(function(methodName) {
      return strcase.paramCase(methodName) === currentFileName;
    })
    .isEmpty();
    //*/

    if (updateEnabled) {
      console.log('Updating expected test data, overwriting existing data ' +
        '(if any) for current test.');
    }

    return updateEnabled;
  }

  return {
    compareJson:compareJson,
    getLkgDataString:getLkgDataString,
    getUpdateState:getUpdateState
  };
})();

exports = module.exports = testUtils;
