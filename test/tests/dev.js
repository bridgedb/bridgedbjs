var wd = require('wd');
var colors = require('colors');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var fs = require('fs');
var highland = require('highland');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('Quick test for development', function() {

  var allPassed = true;
  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('get all data sources available from BridgeDb', function(done) {
    var lkgDataSourcesPath = __dirname +
          '/../input-data/data-sources.ld.json';
    var lkgDataSourcesAsString = fs.readFileSync(lkgDataSourcesPath, {
      encoding: 'utf8'
    });

    var BridgeDb = require('../../index.js');

    var reset = false;

    var bridgeDb1 = BridgeDb({
      apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      dataSourcesUrl:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
    });

    var dataSourceStream = bridgeDb1.dataSource.getAll()
    .collect()
    .map(function(currentDataSources) {
      var currentDataSourcesAsString = JSON.stringify(currentDataSources);
      /*
      console.log('currentDataSourcesAsString');
      console.log(currentDataSourcesAsString);
      expect(1).to.equal(1);
      //*/
      expect(lkgDataSourcesAsString).to.equal(currentDataSourcesAsString);
      return currentDataSourcesAsString;
    });

    var stream1 = dataSourceStream.fork();

    if (reset === true) {
      var stream2 = dataSourceStream.fork();
      stream2.pipe(fs.createWriteStream(lkgDataSourcesPath));
    }

    stream1.last()
    .each(function() {
      return done();
    });
  });
});
