var fs = require('fs');
var git = require('gulp-git');
var gitStreaming = require('../util/git-streaming.js');
var gulp = require('gulp');
var highland = require('highland');
var metadataFilePaths = require('../util/metadata-file-paths.json');

gulp.task('git-tag-test', function bumpGitTag(callback) {
  var package = JSON.parse(fs.readFileSync('package.json'));
  var version = package.version;

  gitStreaming.readTags
  .reduce(false, function checkTagExists(accumulator, tag) {
    if (accumulator || (tag === version)) {
      return true;
    }

    return false;
  })
  .flatMap(function(tagExists) {
    if (tagExists) {
      return callback();
    }

    gulp.src(['./dist/*',
              './docs/*',
              'README.md']
              .concat(metadataFilePaths)
    )
    .pipe(highland.pipeline())
    .through(git.add())
    .through(git.commit('Built and bumped version to ' + version + '.'))
    .last();
  })
  .each(function() {
    gulp.src(['./dist/*',
              './docs/*',
              'README.md']
              .concat(metadataFilePaths)
    )
    .pipe(highland.pipeline())
    .through(gitStreaming.createTag(version,
            'Version ' + version))
    .last()
    .each(function() {
      return callback();
    });
  });
});
