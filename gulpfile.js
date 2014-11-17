var browserify = require('gulp-browserify');
var exorcist = require('exorcist');
var concat = require('gulp-concat');
var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc');
var jsdocOptions = require('./jsdoc-conf.json');
var rename = require('gulp-rename');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');

gulp.task('build', ['browserify', 'build-docs']);

// I don't think gulp-jsdoc is currently able to use an external conf.json.
// Until it does, we need to keep this task disabled
// and use the following command from the command line:
// jsdoc -t './node_modules/jaguarjs-jsdoc/' -c './jsdoc-conf.json' './lib/' -r './README.md' -d './docs/'
gulp.task('build-docs', function() {
  /*
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsdocOptions));
  //*/
});

// TODO refactor this to not run browserify twice.
gulp.task('browserify', function() {
  gulp
    .src('index.js')
    .pipe(browserify({debug: true}))
    .pipe(transform(function() { return exorcist('dist/bridgedb.map'); }))
    .pipe(concat('bridgedb.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));

  gulp
    .src('index.js')
    .pipe(browserify())
    .pipe(rename('bridgedb.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['build']);
