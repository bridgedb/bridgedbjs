// This is just copy-pasted from another library.
// It hasn't been updated to work for bridgedbjs.
// TODO get it working for bridgedbjs.

// see setup guide for using with gulp: http://www.browsersync.io/docs/gulp/
var browserSync = require('browser-sync');
var gulp        = require('gulp');
var evt = browserSync.emitter;

evt.on('rs', function() {
  console.log('You want to reload BrowserSync!');
});

gulp.task('browserSync', ['build'], function() {
  browserSync.init(['./lib/*.js'], {
		server: {
			baseDir: './'
		},
    port: 3000,
    // Don't show any notifications in the browser.
    notify: false,
    startPath: './test/'
	});
});
