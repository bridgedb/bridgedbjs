var fs = require('fs');
var git = require('gulp-git');
var gitStreaming = require('../util/git-streaming.js');
var gulp = require('gulp');
var highland = require('highland');
var metadataFilePaths = require('../util/metadata-file-paths.json');

gulp.task('git-commit-all', function gitCommitAll(callback) {
  var package = JSON.parse(fs.readFileSync('package.json'));
  var version = package.version;

  gulp.src(['./dist/*',
            './docs/*',
            'README.md']
            .concat(metadataFilePaths)
  )
  .pipe(highland.pipeline())
  .through(git.add())
  .through(git.commit('Built and bumped version to ' + version + '.'))
  .debounce(1000)
  .last()
  .each(function() {
    return callback();
  });
});
