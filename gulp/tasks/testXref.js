var gulp = require('gulp');
var mocha = require('gulp-mocha');
var wd = require('wd');
var highland = require('highland');

gulp.task('testXref', ['launchMockserver'], function(done) {
  gulp.src(
    ['./test/unit/xref/*.js'],
    {read: false}
  )
  .pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 60000,
    // enable colors
    c: true,
    //debug: true
  }))
  .on('error', console.warn.bind(console))
  .on('error', function(err) {
    console.log('Error');
    console.log(err);
    //throw err;
  })
  .on('end', function() {
    console.log('End of test');
    return done();
  });
});
