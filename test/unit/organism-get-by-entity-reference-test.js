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

describe('myBridgeDbInstance.organism.getByEntityReference', function() {
  var allPassed = true;
  var server;

  before(function(done) {
    // TODO get a free port instead of just using 4522
    server = http.createServer(
      mockserver(__dirname + '/../input-data/')
    ).listen(4522);
    done();
  });

  beforeEach(function() {
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    server.close(done);
  });

  //*
  it('should get organism by identifiers IRI',
      function(done) {
    var lkgOrganismPath = __dirname +
          '/../expected-data/ncbigene-4292-organism.jsonld';
    var lkgOrganismString = fs.readFileSync(lkgOrganismPath, {
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

    bridgeDbInstance.organism
        .getByEntityReference('http://identifiers.org/ncbigene/4292')
    .map(function(currentOrganism) {
      return JSON.stringify(currentOrganism);
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentOrganismString) {
          lkgOrganismString = currentOrganismString;
          return currentOrganismString;
        })
        .pipe(fs.createWriteStream(lkgOrganismPath));
      }

      return s.fork();
    }))
    .map(function(currentOrganismString) {
      return expect(currentOrganismString).to.equal(
        lkgOrganismString);
    })
    .each(function() {
      return done();
    });
  });
  //*/
});
