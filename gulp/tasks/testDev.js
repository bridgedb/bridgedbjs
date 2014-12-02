/* 0) Install the Selenium drivers for each browser you want to use in your tests: http://docs.seleniumhq.org/download/
 *    ChromeDriver: http://chromedriver.storage.googleapis.com/index.html
 * 1) launch selenium standalone server: https://github.com/daaku/nodejs-selenium-launcher
 * 2) Use one of the the options for implementing the Selenium WebDriver Wire Protocol, such as [ wd ](https://github.com/admc/wd)
 * 3) Run tests with mocha
 *
 * more discussion: http://www.kenpowers.net/blog/testing-in-browsers-and-node/
 */

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var wd = require('wd');
var highland = require('highland');

function testDev() {
  return gulp.src(['./test/tests/dev.js'], {read: false}).pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 4000,
    // enable colors
    c: true,
    debug: true
  }))
  .on('error', console.warn.bind(console));
}

gulp.task('testDev', function() {
  return testDev()
  .on('error', function(e) {
    console.log('Error');
    console.log(e);
    //throw e;
  })
  .on('end', function() {
    console.log('End of test');
  });
});

/*
function testOrganism() {
  return gulp.src(['./test/unit/organism-get-by-entity-reference-test.js'],
    {read: false}).pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 4000,
    // enable colors
    c: true,
    debug: true
  }))
  .on('error', console.warn.bind(console));
}

gulp.task('testOrganism', function() {
  return testOrganism()
  .on('error', function(err) {
    console.log('Error');
    console.log(err);
    //throw err;
  })
  .on('end', function() {
    console.log('End of test');
  });
});
//*/

gulp.task('testOrganism', function(done) {
  gulp.src(['./test/unit/organism-get-by-entity-reference-test.js'],
    {read: false}).pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 2000,
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
    // TODO refactor to avoid using this kludge
    process.exit();
    return done();
  });
});

/*
gulp.task('default', function () {
  gulp.watch('{lib,test}/*', test);
  test();
});
//*/
