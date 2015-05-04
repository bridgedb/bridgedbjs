var gulp = require('gulp');
var replace = require('gulp-regex-replace');

gulp.task('sync-readme-version', function() {
  return gulp.src('README.md')
    .pipe(replace({
      regex: oldPackageJson.version,
      replace: newPackageJson.version
    }))
    .pipe(gulp.dest('./'));
});
