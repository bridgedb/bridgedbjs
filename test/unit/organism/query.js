var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
var RxFs = require('rx-fs');
var sinon      = require('sinon');
var testUtils = require('../../test-utils');
var wd = require('wd');

var internalContext = JSON.parse(fs.readFileSync(
  __dirname + '/../../jsonld-context.jsonld'));

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Organism.query', function() {
  var allPassed = true;
  var that = this;

  function handleResult(update, lkgDataPath, source) {
    var lkgDataString = testUtils.getLkgDataString(lkgDataPath);
    var lkgData = JSON.parse(lkgDataString);
    if (update) {
      return source
      .map(function(currentDatasets) {
        return JSON.stringify(currentDatasets, null, '  ');
      })
      .let(RxFs.createWriteObservable(lkgDataPath));
    }

    return source
    .map(function(actual) {
      return testUtils.compareJson(lkgData, actual);
    })
    .map(function(passed) {
      return expect(passed).to.be.true;
    });
  }

  before(function(done) {
    // Find whether user requested to update the expected JSON result
    update = testUtils.getUpdateState(that.title);
    handleResultWithUpdateSpecified = handleResult.bind(null, update);
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('should fetch all organisms', function(done) {
    var lkgDataPath = __dirname + '/all-organism.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query()
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (Latin/string)', function(done) {
    var lkgDataPath = __dirname + '/ncbigene-4292-organism.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query('Homo sapiens')
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (Latin/object)', function(done) {
    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

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
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should query organisms by name (English)', function(done) {
    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

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
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

// TODO waiting to finish Rxifying EntityReference.js before getting this
//  it('should query organisms by entity reference identifiers IRI', function(done) {
//    var lkgDataPath = __dirname + '/ncbigene-4292-organism.jsonld';
//    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
//        null, lkgDataPath);
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
//    .let(handleResultWithUpdateAndLkgDataPathSpecified)
//    .doOnError(done)
//    .subscribeOnCompleted(done);
//  });
//  //*/

});
