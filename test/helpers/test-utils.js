/* Utilities for performing tests.
 */

var _ = require('lodash');
var argv = require('yargs').argv;
var colors = require('colors');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var fs = require('fs');
var multiplex = require('./multiplex.js');
var pd = require('pretty-data').pd;
var Rx = require('rx-extra');
var RxFs = require('rx-fs');
var strcase = require('tower-strcase');

var PLACEHOLDER = '--------------- EMPTY/PLACEHOLDER ---------------';

// NOTE: the following describes the mocha component architecture
//
// describe
//   this (suite)
//     same as
//       before: this.test.parent
//       beforeEach: this.test.parent, this.currentTest.parent
//       it: this.test.parent
// before
//   this (testCoordinator)
//     same as
//       beforeEach: this
//       it: this
//   this.test
// beforeEach
//   this (testCoordinator)
//     same as
//       before: this
//       it: this
//   this.test
//   this.currentTest
//     same as
//       it: this.test
// it
//   this (testCoordinator)
//     same as
//       beforeEach: this
//       before: this
//   this.test
//     same as
//       beforeEach: this.currentTest

/**
 * isJSONorJSONParsable
 *
 * @param {String|Object} input
 * @returns {Boolean}
 */
var isJSONorJSONParsable = function(input) {
  if (typeof input === 'object') {
    return true;
  }
  var result;
  try {
    JSON.parse(input);
    result = true;
  } catch (err) {
    result = false;
  }
  return result;
};

/**
 * normalizedCompareForSort
 *
 * both
 *   {a:1} > {b:1}
 * and
 *   {a:1} > {b:1}
 * return false
 *
 * For normalizedSort, I want to be able to sort
 * by properties where the value(s) is/are plain
 * objects, meaning one of the above must return
 * true.
 *
 * @param {any} a
 * @param {any} b
 * @returns {Boolean}
 */
var normalizedCompareForSort = function(a, b) {
  var aToCompare;
  var bToCompare;
  if ((_.isString(a) && _.isString(b)) ||
      (_.isNumber(a) && _.isNumber(b)) ||
      (_.isBoolean(a) && _.isBoolean(b))) {
    aToCompare = a;
    bToCompare = b;
  } else {
    aToCompare = JSON.stringify(a);
    aToCompare = JSON.stringify(b);
  }

  if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  } else {
    return 0;
  }
};

/**
 * normalizedSort
 *
 * Used to ignore order for array results from tests
 * when comparing expected vs. actual
 *
 * @param {any} a
 * @param {any} b
 * @returns {Boolean}
 */
var normalizedSort = function(a, b) {
  if (!_.isPlainObject(a) || !_.isPlainObject(b)) {
    return normalizedCompareForSort(a, b);
  }

  var aKeys = _.keys(a);
  var bKeys = _.keys(b);
  var commonKeysWithNonEqualTruthyValues = _.intersection(aKeys, bKeys)
  .filter(function(key) {
    return !_.isEmpty(a[key]) && !_.isEmpty(b[key]);
  })
  .filter(function(key) {
    return JSON.stringify(a[key]) !== JSON.stringify(b[key]);
  })
  .sort(function(key1, key2) {
    if (key1 > key2) {
      return 1;
    }
    if (key1 < key2) {
      return -1;
    }
    return 0;
  });

  var identifyingKeys = [
    'id',
    'name',
    'db',
    'identifier',
  ];
  var primarySortKey = commonKeysWithNonEqualTruthyValues
  .find(function(key) {
    return identifyingKeys.indexOf(key) > -1;
  });
  if (primarySortKey) {
    return normalizedCompareForSort(a[primarySortKey], b[primarySortKey]);
  } else {
    var nonIdentifyingKeys = ['@context'];
    var fallbackSortKey = commonKeysWithNonEqualTruthyValues
    .find(function(key) {
      return nonIdentifyingKeys.indexOf(key) === -1;
    });
    if (fallbackSortKey) {
      return normalizedCompareForSort(a[fallbackSortKey], b[fallbackSortKey]);
    } else {
      return normalizedCompareForSort(a, b);
    }
  }
};

function stringifyJSONReadable(json) {
  return JSON.stringify(json, null, '  ');
}

var testUtils = (function() {
  var kindMappings = {
    'unchanged': {
      name: 'Unchanged',
      lhs: {
        bgColor: 'bgBlack',
        color: 'white',
      },
      rhs: {
        bgColor: 'bgBlack',
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
        bgColor: 'bgBlue',
        color: 'white',
      },
      rhs: {
        bgColor: 'bgBlue',
        color: 'white',
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
    var expectedString = stringifyJSONReadable(expected);
    var actualString = stringifyJSONReadable(actual);
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
      var expectedArrayStrings = expected.map(stringifyJSONReadable);
      var actualArrayStrings = actual.map(stringifyJSONReadable);
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
        var expectedValueString = stringifyJSONReadable(expectedValue);
        var expectedProperty = {};
        expectedProperty[intersectionKey] = expectedValue;

        var actualValue = actual[intersectionKey];
        var actualProperty = {};
        actualProperty[intersectionKey] = actualValue;
        var actualValueString = stringifyJSONReadable(actualValue);

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
        var expectedValueString = stringifyJSONReadable(expectedValue);
        var expectedProperty = {};
        expectedProperty[xorKey] = expectedValue;
        var expectedHasProperty = expected.hasOwnProperty(xorKey);

        var actualValue = actual[xorKey];
        var actualProperty = {};
        actualProperty[xorKey] = actualValue;
        var actualValueString = stringifyJSONReadable(actualValue);
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
        var expectedValueString = stringifyJSONReadable(expectedValue);
        var expectedProperty = {};
        expectedProperty[intersectionKey] = expectedValue;

        var actualValue = actual[intersectionKey];
        var actualProperty = {};
        actualProperty[intersectionKey] = actualValue;
        var actualValueString = stringifyJSONReadable(actualValue);

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
        var expectedValueString = stringifyJSONReadable(expectedValue);
        var expectedProperty = {};
        expectedProperty[xorKey] = expectedValue;

        var actualValue = actual[xorKey];
        var actualProperty = {};
        actualProperty[xorKey] = actualValue;
        var actualValueString = stringifyJSONReadable(actualValue);

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

  function deepEqual(expected, actual) {
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  /**
   * compareJsonAndHandleMismatches
   *
   * TODO what should be in "handleResult" and what should be in compareJsonAndHandleMismatches?
   * This fn is doing more than just comparing expected vs. actual JSON.
   * It's also displaying the comparison and asking the user for how to handle
   * unexpected results.
   *
   * @this TestCoordinator mocha testCoordinator, which is "this" for fn inside mocha "it," e.g.:
   *                       it('...', function() {var testCoordinator = this;});
   * @param {null|Boolean|Number|Object} expectedJson
   * @param {null|Boolean|Number|Object} actualJson
   * @return {Observable} eventually either ends or throws an error
   */
  function compareJsonAndHandleMismatches(expectedJson, actualJson) {
    var testCoordinator = this;
    var currentTest = testCoordinator.test;
    var ignoreOrder = currentTest.ignoreOrder;

    var messageOnFailure = [
      'Failed Test:',
      !!currentTest.parent && currentTest.parent.title,
      currentTest.title
    ]
    .filter(function(str) {
      return !!str;
    })
    .join(' ')
    .red;

    if (deepEqual(expectedJson, actualJson)) {
      // We're good
      return Rx.Observable.empty();
    }

    var expectedToCompare;
    var actualToCompare;
    if (ignoreOrder && _.isArray(expectedJson) && _.isArray(actualJson)) {
      var expectedStringifiedList = expectedJson
      .map(JSON.stringify);

      var actualStringifiedList = actualJson
      .map(JSON.stringify);

      expectedToCompare = _.difference(expectedStringifiedList, actualStringifiedList)
      .map(JSON.parse)
      .sort(normalizedSort);

      actualToCompare = _.difference(actualStringifiedList, expectedStringifiedList)
      .map(JSON.parse)
      .sort(normalizedSort);

      if (deepEqual(expectedToCompare, actualToCompare)) {
        // We're good, except for sort order, which we can ignore
        console.warn('    Warning: actual sorted differently from expected'.yellow);
        return Rx.Observable.empty();
      }

      var expectedStringifiedListSanContext = _.cloneDeep(expectedJson)
      .map(function(x) {
        delete x['@context'];
        return x;
      })
      .map(JSON.stringify);

      var actualStringifiedListSanContext = _.cloneDeep(actualJson)
      .map(function(x) {
        delete x['@context'];
        return x;
      })
      .map(JSON.stringify);

      var equalSanContext = _.difference(
          expectedStringifiedListSanContext,
          actualStringifiedListSanContext
      ).length === 0;

      // TODO make this work when we don't ignore order and also when inputs are not arrays.
      if (equalSanContext) {
        console.warn('    actual matches expected, except for sort order and @context'.yellow);
      }
    } else {
      expectedToCompare = expectedJson;
      actualToCompare = actualJson;
    }

    var jsonDiffs = diffDeep(expectedToCompare, actualToCompare)
    .reduce(function(accumulator, diffResult) {
      return accumulator.concat(diffResult);
    }, [])
    .filter(function(diffResult) {
      return diffResult.kind !== 'unchanged';
    })
    .filter(function(diffResult) {
      return !ignoreOrder || diffResult.kind !== 'moved';
    });

    var coloredSideStrings = jsonDiffs.map(function(jsonDiff) {
      var kindMapping = kindMappings[jsonDiff.kind];
      var lhsColoredString = stringifyJSONReadable(jsonDiff.expected)
        [kindMapping.lhs.color][kindMapping.lhs.bgColor];
      var rhsColoredString = stringifyJSONReadable(jsonDiff.actual)
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

    return multiplex({
      header: {
        label: [
          'Diff Results:  ',
          _.values(kindMappings).map(function(kindMapping) {
            var lhs = kindMapping.lhs;
            var rhs = kindMapping.rhs;
            return kindMapping.name +
              'expected'[lhs.color][lhs.bgColor] + '/' +
              'actual'[rhs.color][rhs.bgColor];
          }).join(', '),
          '\n',
          messageOnFailure,
        ]
        .join('')
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
      },
//      delayedRender: function(cb) {
//        after(function(next) {
//          next(null);
//          setTimeout(function() {
//            cb();
//          }, 500);
//        });
//      }
    });

    //return Rx.Observable.throw(new Error('JSON results do not match.'));

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

  /**
   * handleResult
   *
   * @this TestCoordinator mocha testCoordinator, which is "this" for fn inside mocha "it," e.g.:
   *                       it('...', function() {var testCoordinator = this;});
   * @param {Observable} source containing actual result
   * @return {Observable} eventually either ends or throws an error
   */
  function handleResult(source) {
    var testCoordinator = this;
    var currentTest = testCoordinator.test;

    // Find whether user requested to update the expected JSON result
    var suite = testCoordinator.test.parent;
    var updateAll = getUpdateState(suite.title);

    var expected = currentTest.expected;
    var expectedPath = currentTest.expectedPath;
    if (typeof expected === 'undefined' && typeof expectedPath === 'undefined') {
      var message = [
        'No expected value provided.',
        'Suggestion: specify "expected" or "expectedPath" in test, e.g.:',
        'it(\'...\', function() {this.test.expected = {a: 1};})',
        'or',
        'it(\'...\', function() {this.test.expectedPath = __dirname + \'/abc.json\';})',
      ].join('\n');
      return Rx.Observable.throw(message);
    } else if (typeof expected === 'undefined') {
      var expectedFileExists = fs.existsSync(expectedPath);
      if (expectedFileExists) {
        expected = JSON.parse(
            fs.readFileSync(expectedPath, {
              encoding: 'utf8'
            })
        );
      }
    }
    return source
    .flatMap(function(actual) {
      if (!isJSONorJSONParsable(actual)) {
        console.log('***************************************************');
        console.log('**      Invalid Actual Result    **');
        console.log(actual);
        console.log('***************************************************');
        return Rx.Observable.throw('actual (above) is neither JSON nor string parsable as JSON');
      }

      if (updateAll) {
        return Rx.Observable.return(JSON.stringify(actual, null, '  '))
        .let(RxFs.createWriteObservable(expectedPath));
      }

      if (typeof expected === 'undefined') {
        console.log('*********************************************************');
        console.log('**         New Test - No Expected JSON Available       **');
        console.log('** Saving actual JSON (below) to:                      **');
        console.log('** ' + expectedPath.green.bold + ' **');
        console.log('*********************************************************');
        displayActualJson(actual);
        return Rx.Observable.return(JSON.stringify(actual, null, '  '))
        .let(RxFs.createWriteObservable(expectedPath));
      }

      var outputPath;
      return compareJsonAndHandleMismatches.call(testCoordinator, expected, actual)
      .flatMap(function(userResponseOnFailure) {
        console.log('userResponseOnFailure:"' + userResponseOnFailure + '"');
        if (!expectedPath) {
          return Rx.Observable.throw('No expectedPath');
        } else if (userResponseOnFailure === 'save') {
          outputPath = expectedPath;
        } else if (userResponseOnFailure === 'next') {
          outputPath = expectedPath + '.FAILED-' + new Date().toISOString() + '.jsonld';
        } else {
          return Rx.Observable.throw('Unknown response:' + userResponseOnFailure);
        }

        return Rx.Observable.return(JSON.stringify(actual, null, '  '))
        .let(RxFs.createWriteObservable(outputPath));
      });
    });
  }

  return {
    compareJsonAndHandleMismatches: compareJsonAndHandleMismatches,
    getLkgDataString: getLkgDataString,
    getUpdateState: getUpdateState,
    handleResult: handleResult
  };
})();

exports = module.exports = testUtils;
