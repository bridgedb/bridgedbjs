var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
var Rx = require('rx');
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

describe('BridgeDb.Dataset.query', function() {
  var allPassed = true;
  var that = this;
  var handleResultWithUpdateSpecified;
  var handler;

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
    .doOnNext(function(testResult) {
      var passed = (testResult === true);
      if (passed) {
        handler = Rx.Observable.empty;
      } else {
        handler = testResult;
      }
    })
    .map(function(testResult) {
      return function() {
        var passed = (testResult === true);
        return expect(passed).to.equal(true);
      };
    });
  }

  before(function(done) {
    // Find whether user requested to update the expected JSON result
    var update = testUtils.getUpdateState(that.title);
    handleResultWithUpdateSpecified = handleResult.bind(null, update);
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    var innerThat = this;
    allPassed = allPassed && (innerThat.currentTest.state === 'passed');
    console.log('handler');
    console.log(handler);
    handler('Failed Test: ' + innerThat.currentTest.title)
    .subscribe(function(result) {
      console.log('result82');
      console.log(result);
    }, done, done);
  });

  after(function(done) {
    done();
  });

  it('should fetch metadata for all datasets at BridgeDb', function(done) {
    var lkgDataPath = __dirname + '/datasets.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query()
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnNext(function(result) {
      console.log('result107');
      console.log(result);
    })
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should fetch metadata for datasets by @id', function(done) {
    var lkgDataPath = __dirname +  '/query-result-entrez-gene.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      '@id': 'http://identifiers.org/ncbigene/'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .map(function(expecter) {
      return expecter();
    })
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should fetch metadata for datasets by name', function(done) {
    var lkgDataPath = __dirname + '/query-result-entrez-gene.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      '@context': 'http://schema.org/',
      name: 'Entrez Gene'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should fetch metadata for datasets by name and exampleIdentifier', function(done) {
    var lkgDataPath = __dirname + '/query-result-entrez-gene.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      '@context': 'http://schema.org/',
      name: 'Entrez Gene',
      'http://identifiers.org/idot/exampleIdentifier': '1234'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  // TODO AP, you can add use cases for pvjs editor dropdowns here
  describe('fetch metadata for datasets by type', function() {
    it('should work for metabolites', function(done) {
      // TODO
      var lkgDataPath = __dirname + '/query-example-identifier-1234.jsonld';
      var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
          null, lkgDataPath);

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
      });

      bridgeDbInstance.dataset.query({
        // TODO
        '@type': 'http://vocabularies.wikipathways.org/gpml#Metabolite'
      })
      .toArray()
      .let(handleResultWithUpdateAndLkgDataPathSpecified)
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    // TODO for gene products, etc.
  });

  it('should fetch metadata for datasets by exampleIdentifier', function(done) {
    var lkgDataPath = __dirname +
          '/query-example-identifier-1234.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      'http://identifiers.org/idot/exampleIdentifier': '1234'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  /* I don't whether datasources.txt is correct for this one, so leaving it disabled. -AR
  it('should fetch metadata for datasets by name (multiple hits)', function(done) {
    var lkgDataPath = __dirname +
          '/query-name-ensembl.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      name: 'Ensembl'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/
});
