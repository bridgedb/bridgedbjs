var _ = require('lodash');
var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
var sinon      = require('sinon');
var testUtils = require('../../test-utils.js');
var wd = require('wd');

var handleResult = testUtils.handleResult;

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Xref.get', function() {
  var standardBridgeDbApiUrlStub = 'http://webservice.bridgedb.org/';
  var suite = this;
  suite.allPassed = true;

  before(function(done) {
    var testCoordinator = this;
    var currentTest = testCoordinator.currentTest;
    done();
  });

  beforeEach(function(done) {
    var testCoordinator = this;
    var currentTest = testCoordinator.currentTest;
    suite.allPassed = suite.allPassed && (currentTest.state === 'passed');

    currentTest.handleResult = handleResult.bind(
        null, suite, currentTest);

    done();
  });

  afterEach(function(done) {
    var testCoordinator = this;
    var currentTest = testCoordinator.currentTest;
    suite.allPassed = suite.allPassed && (currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  //*
  it('should get xrefs (input: plain object with identifiers IRI)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-xrefs.jsonld';
    var expected = JSON.parse(fs.readFileSync(test.expectedPath, {encoding: 'utf8'}));

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      //baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        //'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      '@id': 'http://identifiers.org/ncbigene/4292'
      //bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Homo sapiens' +
        //                  '/xrefs/L/4292'
      //bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/4292'
    })
    .toArray()
    .map(function(currentXrefs) {
      var currentStringifiedXrefs = currentXrefs.map(JSON.stringify);
      var expectedStringifiedXrefs = expected.map(JSON.stringify);
      var intersection = _.intersection(currentStringifiedXrefs, expectedStringifiedXrefs);
      return expect(intersection.length).to.equal(currentStringifiedXrefs.length);
    })
    //.let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /*
  it('should get xrefs (input: stream)', function(done) {
    var LKGDataPath = __dirname +
          '/ncbigene-1234-4292-xrefs.jsonld';
    lkgDataString = testUtils.getLkgDataString(LKGDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    highland([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .pipe(bridgeDbInstance.xref.createStream())
    .map(function(xrefs) {
      return xrefs;
    })
    .toArray()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .pipe(highland.pipeline(function(s) {
      if (update) {
        s.fork()
        .map(function(dataString) {
          lkgDataString = dataString;
          return dataString;
        })
        .pipe(fs.createWriteStream(LKGDataPath));
      }

      return s.fork();
    }))
    .map(function(dataString) {
      return testUtils.compareJson(dataString, lkgDataString);
    })
    .map(function(passed) {
      return expect(passed).to.be.true;
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

  /*
  it('should get xrefs (input: array)', function(done) {
    var LKGDataPath = __dirname +
          '/ncbigene-1234-4292-xrefs.jsonld';
    var testParams = {
      expectedPath: LKGDataPath
    };
    var handleResultBySource = handleResultByLKGDataPathAndSource.bind(null, testParams);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .toArray()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .last()
    .let(handleResultBySource)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

});
