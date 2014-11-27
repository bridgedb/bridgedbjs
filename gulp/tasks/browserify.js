/* browserify task
   ---------------
   Bundle javascripty things with browserify!

   If the watch task is running, this uses watchify instead
   of browserify for faster bundling using caching.
*/

var browserify   = require('browserify');
var watchify     = require('watchify');
var bundleLogger = require('../util/bundleLogger');
var gulp         = require('gulp');
var brfs = require('gulp-brfs');
var handleErrors = require('../util/handleErrors');
var source       = require('vinyl-source-stream');

/*
gulp.task('browserify', function() {

  var bundleMethod = global.isWatching ? watchify : browserify;

  var getBundleName = function() {
    var version = newPackageJson.version;
    console.log('version');
    console.log(version);
    var name = newPackageJson.name;
    return name + '-' + version + '.' + 'min';
  };

  var bundler = bundleMethod({
    // Required watchify args
    cache: {}, packageCache: {}, fullPaths: true,
    // Browserify Options
    // specify entry point of app
    entries: ['./index.js'],
    debug: true
	})
  // enable fs.readFileSync() in browser
  .transform('brfs')
  .transform('deglobalify');

  var bundle = function() {
		// Log when bundling starts
    bundleLogger.start();

    return bundler
			.bundle({
        insertGlobals : true,
        //exclude: 'cheerio',
        // Enable source maps!
        //debug: true
      })
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

gulp.task('browserify', function() {

  var bundler = browserify({
    // Required watchify args
    cache: {}, packageCache: {}, fullPaths: true,
    // Browserify Options
    entries: ['./index.js'],
    debug: true
  });

  var bundle = function() {
    return bundler
      .bundle()
      .on('error', handleErrors)
      .pipe(source('index.js'))
      .pipe(gulp.dest('./dist/'));
  };

  if (global.isWatching) {
    bundler = watchify(bundler);
    bundler.on('update', bundle);
  }

  return bundle();
});
