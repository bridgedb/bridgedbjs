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

describe('BridgeDb.Organism.query', function() {
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

  it('should fetch all organisms', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/all-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query()
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (Latin/string)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query('Homo sapiens')
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (Latin/object)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query({
      'name': 'Homo sapiens',
      '@type': 'Organism'
    })
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (English)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query({
      'name': 'Human',
      '@type': 'Organism'
    })
    .toArray()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

// TODO waiting to finish Rxifying EntityReference.js before getting this
//  it('should query organisms by entity reference identifiers IRI', function(done) {
//    var expectedPath = __dirname + '/ncbigene-4292-organism.jsonld';
//    var handleResultBySource = handleResultByexpectedPathAndSource.bind(
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
//    bridgeDbInstance.organism.query({
//      '@id': 'http://identifiers.org/ncbigene/4292',
//      '@type': 'EntityReference'
//    })
//    .toArray()
//    .let(handleResultBySource)
//    .doOnError(done)
//    .subscribeOnCompleted(done);
//  });
//  //*/

});
