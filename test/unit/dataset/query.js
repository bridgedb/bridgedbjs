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

describe('BridgeDb.Dataset.query', function() {
  var allPassed = true;
  var that = this;
  var handleResultWithUpdateSpecified;

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
    var update = testUtils.getUpdateState(that.title);
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
