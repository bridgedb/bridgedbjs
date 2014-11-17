var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc');
var jsdocOptions = require('./jsdoc-conf.json');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
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

var getBundleName = function() {
  var version = require('./package.json').version;
  var name = require('./package.json').name;
  return version + '.' + name + '.' + 'min';
};

gulp.task('browserify', function() {

  var bundler = browserify({
    entries: ['./index.js'],
    debug: true
  });

  var bundle = function() {
    return bundler
      .bundle()
      .pipe(source(getBundleName() + '.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/'));
  };

  return bundle();
});

gulp.task('default', ['build']);
