/* browserify task
   ---------------
   Bundle javascripty things with browserify!

   If the watch task is running, this uses watchify instead
   of browserify for faster bundling using caching.
*/

var brfs = require('gulp-brfs');
var browserify   = require('browserify');
var buffer = require('vinyl-buffer');
var bundleLogger = require('../util/bundleLogger');
var gulp         = require('gulp');
var handleErrors = require('../util/handleErrors');
var source       = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var watchify     = require('watchify');

//*
// TODO Check whether we need any of the commented-out code below.
// The commented-out code below is just a copy-paste from another library.
// The non-commented-out code is working.
gulp.task('browserify', function() {

  var bundleMethod = global.isWatching ? watchify : browserify;

  var getBundleName = function() {
    // TODO don't use global
    var version = global.newPackageJson.version;
    console.log('version');
    console.log(version);
    var name = global.newPackageJson.name;
    return name + '-' + version + '.' + 'min';
  };

  var bundler = bundleMethod({
    // Required watchify args
    cache: {}, packageCache: {}, fullPaths: true,
    // Browserify Options
    // specify entry point of app
    entries: ['./index.js'],
    // Enable source maps!
    debug: true,
    //insertGlobals : true,
    //exclude: 'cheerio'
	});
  /*
  // enable fs.readFileSync() in browser
  .transform('brfs')
  .transform('deglobalify');
  //*/

  var bundle = function() {
		// Log when bundling starts
    bundleLogger.start();

    return bundler
			.bundle()
			// Report compile errors
			.on('error', handleErrors)
			// Use vinyl-source-stream to make the
			// stream gulp compatible. Specify the
			// desired output filename here.
      .pipe(source(getBundleName() + '.js'))
      .pipe(buffer())
      // Add transformation tasks to the pipeline here.
      .pipe(uglify())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
      // Specify the output destination
      .pipe(gulp.dest('./dist/'))
			// Log when bundling completes!
			.on('end', bundleLogger.end);
  };

  if (global.isWatching) {
		// Rebundle with watchify on changes.
    bundler = watchify(bundler);
    bundler.on('update', bundle);
  }

  return bundle();
});
//*/
