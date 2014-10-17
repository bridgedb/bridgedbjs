var gulp = require('gulp');
var browserify = require('gulp-browserify');

// Basic usage
gulp.task('build', function() {
  // Single entry point to browserify
  gulp.src('index.js')
    .pipe(browserify({
      insertGlobals : true,
      debug : !gulp.env.production
    }))
    .pipe(gulp.dest('./dist'));
});
