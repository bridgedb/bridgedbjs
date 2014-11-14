var gulp = require('gulp');
var browserify = require('gulp-browserify');
var jsdoc = require('gulp-jsdoc');
var jsDocOptions = require('./jsdoc-conf.json');
var uglify = require('gulp-uglify');

// Basic usage
gulp.task('build', function() {
  // Single entry point to browserify
  gulp.src('index.js')
    .pipe(browserify({
      insertGlobals : true,
      debug : !gulp.env.production
    }))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));

  /*
  //I don't know whether gulp-jsdoc is using conf.json.
  //The following command works from the command line:
  //jsdoc -t './node_modules/jaguarjs-jsdoc/' -c './jsdoc-conf.json' './lib/' -r './README.md' -d './docs/'
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsDocOptions));
  //*/
});
