/* Utilities for performing tests.
 */

var _ = require('lodash');
var argv = require('yargs').argv;
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

  function compareJson(newJsonString, oldJsonString) {
    var stringsAreEqual = (newJsonString === oldJsonString);
    if (!stringsAreEqual) {
      var newJson = JSON.parse(newJsonString);
      var oldJson = JSON.parse(oldJsonString);
      var jsonDiffs = diff(oldJson, newJson);

      if (!!jsonDiffs[0] &&
        !!jsonDiffs[0].path &&
        jsonDiffs[0].path.indexOf('xref') === -1) {
        if (oldJsonString === '{}') {
          console.log('**************************************');
          console.log('**              New                **');
          console.log('**************************************');
          console.log(pd.json(newJson));
        } else {
          console.log('**************************************');
          console.log('**       Old diffed with new        **');
          console.log('**************************************');
          console.log(pd.json(jsonDiffs));
        }
      } else {
        stringsAreEqual = true;
      }
    }
    return stringsAreEqual;
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

  return {
    compareJson:compareJson,
    getLkgDataString:getLkgDataString,
    getUpdateState:getUpdateState
  };
})();

exports = module.exports = testUtils;
