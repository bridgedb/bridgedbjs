var exec = require('child_process').exec;
var git = require('gulp-git');
var highland = require('highland');
var utils = require('../util/utils.js');

module.exports = {
  checkout: highland.wrapCallback(git.checkout),
  createTag: highland.wrapCallback(git.tag),
  merge: highland.wrapCallback(git.merge),
  push: highland.wrapCallback(git.push),
  readTags: utils.createExecStream('git tag')
            .split('\r')
            .filter(function(tag) {
              return tag !== null && typeof tag !== 'undefined' && tag !== '';
            }),
  status: highland.wrapCallback(git.status)
};
