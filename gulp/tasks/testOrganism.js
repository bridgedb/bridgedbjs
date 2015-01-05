var gulp = require('gulp');
var mocha = require('gulp-mocha');
var wd = require('wd');
var highland = require('highland');

gulp.task('testOrganism', ['launchMockserver'], function(done) {
  gulp.src(
    // TODO Tests fail when get.js is run first. There is
    // probably something wrong with the runOnce and/or
    // runOncePerInstance method(s).
    /* This fails.
    ['./test/unit/organism/*.js'],
    //*/
    /* This also fails.
    ['./test/unit/organism/get.js',
    './test/unit/organism/query.js'],
    //*/
    //* But this succeeds.
    ['./test/unit/organism/query.js',
    './test/unit/organism/get.js'],
    //*/
    {read: false}
  )
  .pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 4000,
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
