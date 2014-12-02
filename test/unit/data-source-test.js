var BridgeDb = require('../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var highland = require('highland');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
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
  var server;

  before(function(done) {
    // TODO get a free port instead of just using 4522
    http.createServer(mockserver('../input-data/')).listen(4522);
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

  it('should get all data sources available from BridgeDb', function(done) {
    var lkgDataSourcesPath = __dirname +
          '/../expected-data/data-sources.jsonld';
    var lkgDataSourcesString = fs.readFileSync(lkgDataSourcesPath, {
      encoding: 'utf8'
    });

    // if we want to update the expected JSON result
    var updateExpectedJson = false;

    var bridgeDbInstance = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:4522',
      dataSourcesUrl:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:4522/datasources.txt'
    });

    bridgeDbInstance.dataSource.getAll()
    .collect()
    .map(function(currentDataSources) {
      return JSON.stringify(currentDataSources);
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentDataSourcesString) {
          lkgDataSourcesString = currentDataSourcesString;
          return currentDataSourcesString;
        })
        .pipe(fs.createWriteStream(lkgDataSourcesPath));
      }

      return s.fork();
    }))
    .map(function(currentDataSourcesString) {
      return expect(lkgDataSourcesString).to.equal(
        currentDataSourcesString);
    })
    .last()
    .each(function() {
      return done();
    });
  });
});
