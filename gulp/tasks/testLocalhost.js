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

// TODO the reporting is formatted incorrectly. It lists results for tests
// under the wrong header, e.g.:
//   BridgeDb.Organism.query
//    ✓ should fetch metadata for all datasets at BridgeDb (62ms)
gulp.task('testLocalhost', ['testDataset',
    'testOrganism',
    'testXref',
    'testEntityReference']);
