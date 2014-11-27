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

describe('myBridgeDbInstance.xref', function() {
  var allPassed = true;
  var bridgeDbInstance;

  before(function(done) {
    done();
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('get all data sources available from BridgeDb', function(done) {
    var lkgXrefsPath = __dirname +
          '/../output-data/xrefs.ld.json';
    var lkgXrefsAsString = fs.readFileSync(lkgXrefsPath, {
      encoding: 'utf8'
    });

    // if we want to update the expected JSON result
    var updateExpectedJson = false;

    bridgeDbInstance = BridgeDb({
      apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      dataSourcesUrl:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
    });

    var xrefStream = bridgeDbInstance.xref.get({
        bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      },
      {
        format:'display'
    })
    .collect()
    .map(function(currentXrefs) {
      var currentXrefsAsString = JSON.stringify(currentXrefs);
      if (!updateExpectedJson) {
        expect(lkgXrefsAsString).to.equal(currentXrefsAsString);
      } else {
        console.log('currentXrefsAsString');
        console.log(currentXrefsAsString);
        expect(1).to.equal(1);
      }
      return currentXrefsAsString;
    });

    var stream1 = xrefStream.fork();

    if (updateExpectedJson) {
      var stream2 = xrefStream.fork();
      stream2.pipe(fs.createWriteStream(lkgXrefsPath));
    }

    stream1.last()
    .each(function() {
      return done();
    });
  });
});
