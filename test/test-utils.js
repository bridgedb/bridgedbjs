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

  function getLkgDataString(lkgDataPath) {
    var lkgExists = fs.existsSync(lkgDataPath);
    var lkgDataString = lkgExists ? fs.readFileSync(lkgDataPath, {
      encoding: 'utf8'
    }) : false;
    return !!lkgDataString ? lkgDataString : '{}';
  }

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

  function displayJsonDiffStringInContext(newJson, jsonDiff) {
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
    var oldArray = [];

    var deletedNamespace = '_deleted_';

    var surroundingJson = jsonDiff.path.reduce(function(
        previousValue, currentKey, index, array) {
      if (previousValue.hasOwnProperty(currentKey) &&
        index < array.length - 1) {
        return previousValue[currentKey];
      } else {
        if (!!jsonDiff.lhs) {
          var finalValue = previousValue[currentKey];
          if (_.isPlainObject(previousValue)) {
            previousValue[deletedNamespace + currentKey] = jsonDiff.lhs;
          } else {
            if (jsonDiff.kind === 'D') {
              previousValue.unshift(jsonDiff.lhs);
            } else if (jsonDiff.kind === 'E') {
              oldArray = _.clone(previousValue);
              oldArray[currentKey] = jsonDiff.lhs;
            }
            /*
            var lhsString = _.isPlainObject(jsonDiff.lhs) ||
              _.isArray(jsonDiff.lhs) ?
              JSON.stringify(jsonDiff.lhs) : String(jsonDiff.lhs);

            var finalValue = previousValue[currentKey];
            var rhsString = _.isPlainObject(finalValue) ||
              _.isArray(finalValue) ?
              JSON.stringify(finalValue) : String(finalValue);
            console.log('rhsString');
            console.log(rhsString);
            console.log('lhsString');
            console.log(lhsString);
            previousValue[currentKey] = rhsString + lhsString;
            if (!!jsonDiff.rhs) {
              previousValue[currentKey] = jsonDiff.rhs + jsonDiff.lhs;
            } else {
              previousValue[currentKey] = jsonDiff.lhs;
            }
            //*/
          }

          /*
          var finalValue = previousValue[currentKey];
          if (_.isArray(finalValue)) {
            finalValue.push(jsonDiff.lhs);
          } else {
            previousValue[deletedNamespace + currentKey] = jsonDiff.lhs;
          }
          //*/
          return previousValue;
        } else {
          return previousValue;
        }
      }
    }, newJson);

    var value = surroundingJson[key];
    var lhsValue = _.isPlainObject(jsonDiff.lhs) ||
      _.isArray(jsonDiff.lhs) ?
      JSON.stringify(jsonDiff.lhs) : '"' + String(jsonDiff.lhs) + '"';
    var rhsValue = _.isPlainObject(jsonDiff.rhs) ||
      _.isArray(jsonDiff.rhs) ?
      JSON.stringify(jsonDiff.rhs) : '"' + String(jsonDiff.rhs) + '"';

    if (!!jsonDiff.lhs) {
      if (_.isPlainObject(surroundingJson)) {
        lhsItem = '"' + deletedNamespace + key + '"' + ':' + lhsValue;
      } else {
        lhsItem = lhsValue;
      }
    }

    if (!!jsonDiff.rhs) {
      if (_.isPlainObject(surroundingJson)) {
        rhsItem = '"' + key + '"' + ':' + rhsValue;
      } else {
        rhsItem = rhsValue;
      }
    }

    console.log('lhsItem');
    console.log(lhsItem);
    console.log('rhsItem');
    console.log(rhsItem);
    console.log('key');
    console.log(key);
    if (!_.isEmpty(oldArray)) {
      oldArray[key + 1] = lhsItem.yellow.bold;
      /*
      var re1 = new RegExp('(' + JSON.stringify(lhsItem.yellow.bold) + ')');
      var re1 = new RegExp('(' + JSON.stringify(lhsItem) + ')');
      var index = _.isNumber(key) ? key + 1 : 1;
      console.log('index');
      console.log(index);
      var movedString = replaceNthMatch(oldArrayString,
          re1, index, lhsItem.yellow.bold);
      //*/

      var oldArrayString = JSON.stringify(oldArray);
      var re2 = new RegExp(lhsItem, 'g');
      var movedString = oldArrayString.replace(re2, lhsItem.yellow.dim);

      movedString = movedString.replace(JSON.stringify(lhsItem.yellow.bold),
          lhsItem.yellow.bold);
      console.log('Moved item from dim location to bold location.');
      console.log('If multiple dim locations, this highlights only one move.');
      console.log(movedString);
      /*
      console.log(JSON.stringify(surroundingJson)
        .replace(lhsItem, (lhsItem)[jsonDiffSideToColorMappings.lhs])
        .replace(rhsItem, (rhsItem)[jsonDiffSideToColorMappings.rhs]));
      //*/

      /*
      //oldArray.replace(re, '$1$2bing');
      var matches = oldArray.filter(function(element) {
        return JSON.stringify(element) === JSON.stringify(lhsItem);
      });
      if (matches.length > 1) {
        console.log('moved');
        console.log(JSON.stringify(oldArray)
          .replace(lhsItem, (lhsItem).yellow.dim)
          .replace(lhsItem, (lhsItem).yellow.bold));
      }
      //*/

    } else {
      console.log(JSON.stringify(surroundingJson)
        .replace(lhsItem, (lhsItem)[jsonDiffSideToColorMappings.lhs])
        .replace(rhsItem, (rhsItem)[jsonDiffSideToColorMappings.rhs]));
    }
  }

  function getJsonDiffLoggers(newJson, jsonDiff) {
    if (jsonDiff.kind === 'A') {
      //jsonDiff.item.path = jsonDiff.item.path || jsonDiff.path;
      return getJsonDiffLoggers(newJson, jsonDiff.item);
    } else if (jsonDiff.kind === 'N') {
      return function() {
        /*
        var surroundingJson = jsonDiff.path.reduce(function(
              previousValue, currentValue, index, array) {
          if (previousValue.hasOwnProperty(currentValue) &&
            (index < array.length - 1)) {
            return previousValue[currentValue];
          } else {
            return previousValue;
          }
        }, newJson);
        displayJsonDiffStringInContext(surroundingJson, jsonDiff);
        //*/
        displayJsonDiffStringInContext(newJson, jsonDiff);
      };
    } else if (jsonDiff.kind === 'D') {
      return function() {
        /*
        console.log('********************************');
        console.log(('Deleted. Path: ' + jsonDiff.path).white.bgRed);
        var surroundingJson = jsonDiff.path.reduce(function(
            previousValue, currentValue, index, array) {
          if (previousValue.hasOwnProperty(currentValue) &&
            index < array.length - 1) {
            return previousValue[currentValue];
          } else {
            if (_.isNumber(currentValue)) {
              previousValue.push(jsonDiff.lhs);
            } else {
              previousValue[currentValue] = jsonDiff.lhs;
            }
            return previousValue;
          }
        }, newJson);
        displayJsonDiffStringInContext(surroundingJson, jsonDiff);
        //*/
        displayJsonDiffStringInContext(newJson, jsonDiff);
      };
    } else if (jsonDiff.kind === 'E') {
      return function() {
        displayJsonDiffStringInContext(newJson, jsonDiff);
        /*
        console.log('********************************');
        console.log(('Edited. Path: ' + jsonDiff.path).black.bgYellow);
        console.log((JSON.stringify(jsonDiff.lhs)).strikethrough.yellow.bgRed);
        console.log(JSON.stringify(jsonDiff.rhs).bold.yellow.bgGreen);
        //*/
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

  function compareJson(newJsonString, oldJsonString) {
    if (newJsonString === oldJsonString) {
      return true;
    }

    var newJson = JSON.parse(newJsonString);

    if (oldJsonString === '{}') {
      console.log('*************************************************');
      console.log('**               New Result                    **');
      console.log('** Please update expected data to save result. **');
      console.log('*************************************************');
      console.log(pd.json(newJson).bgBlue);
      return false;
    }

    var oldJson = JSON.parse(oldJsonString);
    var jsonDiffs = _.filter(diff(oldJson, newJson), function(jsonDiff) {
      // NOTE: we ignore differences in the xref IRI, because
      // this value will vary based on the config value set.
      return !jsonDiff.path || (jsonDiff.path.indexOf('xref') === -1);
    });

    if (!jsonDiffs || _.isEmpty(jsonDiffs)) {
      // JSON is equivalent but is not identical as stringified.
      // Possibly reasons:
      // * property order changed
      // * BridgeDb xref value in changed (from config)
      return true;
    }

    /*
    console.log('**************************************');
    console.log('**       Old diffed with new        **');
    console.log('**************************************');
    console.log(jsonDiffs);
    //*/

    jsonDiffs.map(function(jsonDiff) {
      return getJsonDiffLoggers(newJson, jsonDiff);
    })
    .map(function(jsonDiffLogger) {
      return jsonDiffLogger();
    });

    console.log('**************************************');
    console.log('**               New                **');
    console.log('**************************************');
    console.log(pd.json(newJson).bgBlue);
    //*/

    return false;
  }

  // Find whether user requested to update the expected JSON result
  // for the current file/method
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
