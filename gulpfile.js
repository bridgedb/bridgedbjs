var gulp = require('gulp');
var browserify = require('gulp-browserify');
var jsdoc = require('gulp-jsdoc');
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

  gulp.src(['./lib/*.js', 'README.md'])
  //gulp.src(['./lib/*.js'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/tmpl'
    }));
});
