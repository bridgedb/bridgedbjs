var _ = require('lodash');
var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var mockserverMocha  =  require('../../mockserver-mocha.js');
var RxFs = require('rx-fs');
var sinon      = require('sinon');
var testUtils = require('../../test-utils');
var wd = require('wd');

var handleResult = testUtils.handleResult;

var internalContext = JSON.parse(fs.readFileSync(
  __dirname + '/../../jsonld-context.jsonld'));

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Organism.get', function() {
  var suite = this;
  suite.allPassed = true;

  mockserverMocha();

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

  /* TODO Doesn't work yet
  it('should get organism by @id',
      function(done) {

    var expectedPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(expectedPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.get({
      '@id': 'http://identifiers.org/taxonomy/9606',
      '@type': 'Organism'
    })
    .map(JSON.stringify)
    .pipe(highland.pipeline(function(s) {
      if (update) {
        s.fork()
        .map(function(dataString) {
          lkgDataString = dataString;
          return dataString;
        })
        .pipe(fs.createWriteStream(expectedPath));
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

  it('should get organism by name (Latin/string)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.get('Homo sapiens')
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should get organism by name (Latin/object)',  function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.get({
      'name': 'Homo sapiens',
      '@type': 'Organism'
    })
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should get organism by name (English)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.get({
      'name': 'Human',
      '@type': 'Organism'
    })
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

//  TODO this is waiting for entity reference to be Rx-ified.
//  it('should get organism by entity reference identifiers IRI', function(done) {
//    var expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';
//    var handleResultBySource = handleResultWithUpdateSpecified.bind(
//        null, expectedPath);
//
//    var bridgeDbInstance = new BridgeDb({
//      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
//      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
//      datasetsMetadataIri:
//        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
//        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
//    });
//
//    bridgeDbInstance.organism.get({
//      '@id': 'http://identifiers.org/ncbigene/4292',
//      '@type': 'EntityReference'
//    })
//    .toArray()
//    .let(handleResultBySource)
//    .doOnError(done)
//    .subscribeOnCompleted(done);
//  });

});
