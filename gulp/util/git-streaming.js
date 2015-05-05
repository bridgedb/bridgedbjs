var exec = require('child_process').exec;
var git = require('gulp-git');
var highland = require('highland');

var execStreaming = highland.wrapCallback(exec);

module.exports = {
  checkout: highland.wrapCallback(git.checkout),
  commit: highland.wrapCallback(git.commit),
  createTag: highland.wrapCallback(git.tag),
  merge: highland.wrapCallback(git.merge),
  push: highland.wrapCallback(git.push),
  readTags: execStreaming('git tag')
            .split('\r')
            .filter(function(tag) {
              return tag !== null && typeof tag !== 'undefined' && tag !== '';
            }),
  status: highland.wrapCallback(git.status)
};
