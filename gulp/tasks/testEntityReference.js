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

gulp.task('testEntityReference', ['launchMockserver'], function(done) {
  gulp.src(
    ['./test/unit/entity-reference/*.js'],
    {read: false}
  )
  .pipe(mocha({
    // module to require
    r: './test/wd-test-config.js',
    reporter: 'spec',
    timeout: 3000,
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
