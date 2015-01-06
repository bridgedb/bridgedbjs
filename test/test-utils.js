/* Utilities for performing tests.
 */

var _ = require('lodash');
var argv = require('yargs').argv;
var colors = require('colors');
var diff = require('deep-diff').diff;
var fs = require('fs');
var pd = require('pretty-data').pd;
var strcase = require('tower-strcase');

var testUtils = (function() {
  'use strict';

  //*
  var jsonDiffKindMappings = {
    'E': {
      bgColor: 'bgYellow',
      color: 'black',
      name: 'Edited',
      side: 'rhs',
    },
    'N': {
      bgColor: 'bgGreen',
      color: 'black',
      name: 'New',
      side: 'rhs',
    },
    'D': {
      bgColor: 'bgRed',
      color: 'white',
      name: 'Deleted',
      side: 'lhs',
    }
  };
  //*/

  //*
  var jsonDiffSideToColorMappings = {
    rhs: 'green',
    lhs: 'red'
  };
  //*/

  /**
   * compareJson
   *
   * @param {string} actualJsonString
   * @param {string} expectedJsonString
   * @return
   */
  function compareJson(actualJsonString, expectedJsonString) {
    if (actualJsonString === expectedJsonString) {
      // We're good
      return true;
    }

    var actualJson = JSON.parse(actualJsonString);

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

    var expectedJson = JSON.parse(expectedJsonString);
    var jsonDiffs = _.filter(diff(expectedJson, actualJson),
    function(jsonDiff) {
      // TODO why do we test for !jsonDiff.path here?
      // If the only difference is in the xref IRI, we're still good.
      // We ignore differences in the xref IRI, because this value
      // varies depending on whatever free port was available for
      // the mock server.
      return !jsonDiff.path || (jsonDiff.path.indexOf('xref') === -1);
    });

    if (!jsonDiffs || _.isEmpty(jsonDiffs)) {
      // JSON is equivalent but is not identical as stringified,
      // so we're still good.
      // Possibly reasons for not being identical:
      // * property order changed
      // * BridgeDb xref IRI changed (which is OK)
      return true;
    }

    /*
    console.log('**************************************');
    console.log('**          Expected JSON           **');
    console.log('**************************************');
    console.log(pd.json(expectedJson).white.bgRed);
    //*/

    displayActualJson(actualJson);

    //*
    console.log('**************************************');
    console.log('**  jsonDiffs: Expected vs. Actual  **');
    console.log('**************************************');
    console.log(jsonDiffs);
    //*/

    jsonDiffs.map(function(jsonDiff) {
      return getJsonDiffLoggers(actualJson, jsonDiff);
    })
    .map(function(jsonDiffLogger) {
      return jsonDiffLogger();
    });
    //*/

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
   * NOTE: context here just means the JSON surrounding the jsonDiff item.
   * (It has nothing to do with JSON-LD.)
   *
   * Colorize json diff
   *
   * * Object property
   *   - Created
   *   - Updated
   *   - Deleted
   * * Array element
   *   - Created
   *   - Updated
   *     1. Moved
   *     2. Value changed
   *   - Deleted
   *
   * @param {object} actualJson
   * @param {object} jsonDiff
   * @return
   */
  function displayDiffItemInContext(actualJson, jsonDiff) {
    // TODO aren't we already checking for this earlier?
    if (!jsonDiff.path) {
      return console.log('');
    }
    var jsonDiffKindMapping = jsonDiffKindMappings[jsonDiff.kind];
    console.log('********************************');
    console.log((jsonDiffKindMapping.name + '. Path: ' + jsonDiff.path)
        [jsonDiffKindMapping.color][jsonDiffKindMapping.bgColor]);
    var lhsItem = '';
    var rhsItem = '';
    var key = _.last(jsonDiff.path);

    var replaceNthMatchIndex;
    var lhsReplaceNthMatchIndex;
    var rhsReplaceNthMatchIndex;

    var diffItemInContext = jsonDiff.path.reduce(function(
        previousValue, currentKey, index, array) {
      if (previousValue.hasOwnProperty(currentKey) &&
        index < array.length - 1) {
        return previousValue[currentKey];
      } else {
        if (jsonDiff.kind === 'D') {
          var finalValue = previousValue[currentKey];
          if (_.isArray(previousValue)) {
            previousValue.push(jsonDiff.lhs);
            lhsReplaceNthMatchIndex = previousValue.length;
          } else if (_.isPlainObject(previousValue)) {
            previousValue[currentKey] = jsonDiff.lhs;
          }
        }
        if (_.isArray(previousValue)) {
          rhsReplaceNthMatchIndex = _.filter(_.initial(previousValue, key),
          function(element) {
            return JSON.stringify(jsonDiff.rhs) === JSON.stringify(element);
          }).length;
        } else if (_.isPlainObject(previousValue)) {
          lhsReplaceNthMatchIndex = rhsReplaceNthMatchIndex = 1;
        }

        return previousValue;
      }
    }, actualJson);

    var value = diffItemInContext[key];
    var lhsValue = _.isPlainObject(jsonDiff.lhs) ||
      _.isArray(jsonDiff.lhs) ?
      JSON.stringify(jsonDiff.lhs) : '"' + String(jsonDiff.lhs) + '"';
    var rhsValue = _.isPlainObject(jsonDiff.rhs) ||
      _.isArray(jsonDiff.rhs) ?
      JSON.stringify(jsonDiff.rhs) : '"' + String(jsonDiff.rhs) + '"';

    var diffItemInContextString = JSON.stringify(diffItemInContext);

    var rhsItemReplacement;

    if (!!jsonDiff.rhs) {
      if (_.isPlainObject(diffItemInContext)) {
        rhsItem = '"' + key + '"' + ':' + rhsValue;
      } else {
        rhsItem = rhsValue;
      }
      rhsItemReplacement = rhsItem[jsonDiffSideToColorMappings.rhs];
      diffItemInContextString = replaceNthMatch(
          diffItemInContextString, rhsItem,
          rhsReplaceNthMatchIndex, rhsItemReplacement);
    }

    if (!!jsonDiff.lhs) {
      if (_.isPlainObject(diffItemInContext)) {
        lhsItem = '"' + key + '"' + ':' + lhsValue;
      } else {
        lhsItem = lhsValue;
      }
      var lhsItemReplacement = lhsItem[jsonDiffSideToColorMappings.lhs];
      if (jsonDiff.kind === 'D') {
        diffItemInContextString = replaceNthMatch(
            diffItemInContextString, lhsItem,
            lhsReplaceNthMatchIndex, lhsItemReplacement);
      } else if (jsonDiff.kind === 'E') {
        var lhsRe = new RegExp(lhsItem, 'g');
        if (lhsRe.test(diffItemInContextString)) {
          var message = 'One ' + 'item'.yellow + ' was moved';
          diffItemInContextString = diffItemInContextString
          .replace(lhsRe, lhsItem.yellow);
          if (jsonDiff.rhs) {
            message += ' to make room for ' + 'another'.green;
          }
          message += '.';
          console.log(message);
        } else {
          console.log('Item was replaced.');
          console.log('* Original Item:');
          console.log(lhsItemReplacement);
          console.log('* Replacement Item (in context):');
        }
      }
    }

    console.log(diffItemInContextString);
  }

  /**
   * getJsonDiffLoggers
   *
   * @param {object|array} actualJson
   * @param {object} jsonDiff
   * @return
   */
  function getJsonDiffLoggers(actualJson, jsonDiff) {
    if (jsonDiff.kind === 'A') {
      jsonDiff.path.push(jsonDiff.index);
      jsonDiff.item.path = jsonDiff.path;
      return getJsonDiffLoggers(actualJson, jsonDiff.item);
    } else if (jsonDiff.kind === 'N') {
      return function() {
        displayDiffItemInContext(actualJson, jsonDiff);
      };
    } else if (jsonDiff.kind === 'D') {
      return function() {
        displayDiffItemInContext(actualJson, jsonDiff);
      };
    } else if (jsonDiff.kind === 'E') {
      return function() {
        displayDiffItemInContext(actualJson, jsonDiff);
      };
    } else {
      return function() {
        console.log('********************************');
        console.log(('Other. Path: ' + jsonDiff.path).black.bgYellow);
        console.log('TODO'.black.bgMagenta +
            ': Refactor testUtils to handle this case.');
        console.log(pd.json(jsonDiff).random);
      };
    }
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

  // thanks to
  // http://stackoverflow.com/questions/36183/replacing-the-nth-instance-of-a-regex-match-in-javascript
  function replaceNthMatch(original, pattern, n, replace) {
    var parts;
    var tempParts;

    if (pattern.constructor === RegExp) {

      // If there's no match, bail
      if (original.search(pattern) === -1) {
        return original;
      }

      // Every other item should be a matched capture group;
      // between will be non-matching portions of the substring
      parts = original.split(pattern);

      // If there was a capture group, index 1 will be
      // an item that matches the RegExp
      if (parts[1].search(pattern) !== 0) {
        throw {name: 'ArgumentError',
          message: 'RegExp must have a capture group'};
      }
    } else if (pattern.constructor === String) {
      parts = original.split(pattern);
      // Need every other item to be the matched string
      tempParts = [];

      for (var i = 0; i < parts.length; i++) {
        tempParts.push(parts[i]);

        // Insert between, but don't tack one onto the end
        if (i < parts.length - 1) {
          tempParts.push(pattern);
        }
      }
      parts = tempParts;
    }  else {
      throw {name: 'ArgumentError',
        message: 'Must provide either a RegExp or String'};
    }

    // Parens are unnecessary, but explicit. :)
    var indexOfNthMatch = (n * 2) - 1;

    if (parts[indexOfNthMatch] === undefined) {
      // There IS no Nth match
      return original;
    }

    if (typeof(replace) === 'function') {
      // Call it. After this, we don't need it anymore.
      replace = replace(parts[indexOfNthMatch]);
    }

    // Update our parts array with the new value
    parts[indexOfNthMatch] = replace;

    // Put it back together and return
    return parts.join('');
  }

  return {
    compareJson:compareJson,
    getLkgDataString:getLkgDataString,
    getUpdateState:getUpdateState
  };
})();

exports = module.exports = testUtils;
