var BridgeDb = require('../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var highland = require('highland');
var sinon      = require('sinon');
var wd = require('wd');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('myBridgeDbInstance.dataSource', function() {
  var allPassed = true;
  var bridgeDbInstance;
  var server;

  before(function(done) {
    done();
  });

  beforeEach(function() {
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('get all data sources available from BridgeDb', function(done) {
    var lkgDataSourcesPath = __dirname +
          '/../output-data/data-sources.ld.json';
    var lkgDataSourcesAsString = fs.readFileSync(lkgDataSourcesPath, {
      encoding: 'utf8'
    });

    // if we want to update the expected JSON result
    var updateExpectedJson = false;

    bridgeDbInstance = BridgeDb({
      apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      dataSourcesUrl:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        // TODO Using the mock server doesn't work. Why?
        // Is it the lack of being gzipped?
        // Is it because of the single chunk instead of multiple returned?
        // Is it actually the same in JSON terms but not string terms?
        //'http://localhost:4522/datasources.txt'
    });
    var dataSourceStream = bridgeDbInstance.dataSource.getAll()
    .collect()
    .map(function(currentDataSources) {
      console.log('currentDataSources');
      console.log(currentDataSources);
      var currentDataSourcesAsString = JSON.stringify(currentDataSources);
      if (!updateExpectedJson) {
        expect(lkgDataSourcesAsString).to.equal(currentDataSourcesAsString);
      } else {
        console.log('currentDataSourcesAsString');
        console.log(currentDataSourcesAsString);
        expect(1).to.equal(1);
      }
      return currentDataSourcesAsString;
    });

    var stream1 = dataSourceStream.fork();

    if (updateExpectedJson) {
      var stream2 = dataSourceStream.fork();
      stream2.pipe(fs.createWriteStream(lkgDataSourcesPath));
    }

    stream1.last()
    .each(function() {
      return done();
    });
  });
});
