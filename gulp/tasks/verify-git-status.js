var exec = require('child_process').exec;
var highland = require('highland');
var git = require('gulp-git');
var gitStreaming = require('../util/git-streaming.js');
var gulp = require('gulp');
var killStream = require('../util/kill-stream.js');

// verify git is ready
gulp.task('verify-git-status', function verifyGitStatus(callback) {
  var desiredBranch = 'master';

  highland([{}])
  .flatMap(gitStreaming.status)
  .errors(killStream)
  .map(function(stdout) {
    var inDesiredBranch = stdout.indexOf('On branch ' + desiredBranch) > -1;
    var nothingToCommit = stdout.indexOf('nothing to commit') > -1;
    var gitStatusOk = inDesiredBranch && nothingToCommit;
    if (!gitStatusOk) {
      var message = 'Please checkout master and ' +
        'commit all changes before bumping.';
      throw new Error(message);
    }
    return stdout;
  })
  .errors(killStream)
  .flatMap(highland.wrapCallback(
    // TODO why does this run before git.status, unless I use this
    // extra function?
    function(data, callback) {
      git.exec({args : 'diff master origin/master'}, function(err, stdout) {
        return callback(null, stdout);
      });
    }
  ))
  .map(function(stdout) {
    var gitStatusOk = (stdout === '');
    if (!gitStatusOk) {
      var message = 'local/master is ahead of and/or behind origin/master.' +
        ' Please push/pull before bumping.';
      throw new Error(message);
    }
    return gitStatusOk;
  })
  .errors(killStream)
  .each(function(gitStatusOk) {
    return callback(null, gitStatusOk);
  });
});
