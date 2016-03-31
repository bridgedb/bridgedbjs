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

describe('BridgeDb.Dataset.get', function() {
  var allPassed = true;
  var that = this;

  function handleResult(update, lkgDataPath, source) {
    var lkgDataString = testUtils.getLkgDataString(lkgDataPath);
    var lkgData = JSON.parse(lkgDataString);
    if (update) {
      return source
      .map(function(currentDatasets) {
        return JSON.stringify(currentDatasets[0], null, '  ');
      })
      .let(RxFs.createWriteObservable(lkgDataPath));
    }

    return source
    .map(function(actual) {
      return testUtils.compareJson(lkgData, actual[0]);
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

  it('should get metadata by provider @id', function(done) {
    var lkgDataPath = __dirname +
          '/entrez-gene-dataset-metadata.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.get({
      '@id': 'http://www.ncbi.nlm.nih.gov/gene/'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should get metadata by identifiers.org @id', function(done) {
    var lkgDataPath = __dirname +
          '/entrez-gene-dataset-metadata.jsonld';
    var handleResultWithUpdateAndLkgDataPathSpecified = handleResultWithUpdateSpecified.bind(
        null, lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.get({
      '@id': 'http://identifiers.org/ncbigene'
    })
    .toArray()
    .let(handleResultWithUpdateAndLkgDataPathSpecified)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  describe('Get BridgeDb system code by BridgeDb conventional name (GPML Datasource)', function() {

    it('should get for "Entrez Gene" by bridgeDbDataSourceName', function(done) {
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
      });

      bridgeDbInstance.dataset.get({
        '@context': internalContext['@context'],
        'bridgeDbDataSourceName': 'Entrez Gene'
      })
      .toArray()
      .map(function(actualSet) {
        var actual = actualSet[0];
        return expect(actual.bridgeDbSystemCode).to.equal('L');
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    it('should get for "Ensembl" by datasource_name', function(done) {
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
      });

      var key = [
        'https://github.com/bridgedb/BridgeDb/blob/master/',
        'org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#',
        'datasource_name'
      ].join('');
      var input = {};
      input[key] = 'Ensembl';
      bridgeDbInstance.dataset.get(input)
      .toArray()
      .map(function(actualSet) {
        var actual = actualSet[0];
        return expect(actual.bridgeDbSystemCode).to.equal('En');
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    it('should get for "KNApSAcK" by bridgeDbDataSourceName', function(done) {
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
      });

      bridgeDbInstance.dataset.get({
        '@context': internalContext['@context'],
        'bridgeDbDataSourceName': 'KNApSAcK'
      })
      .toArray()
      .map(function(actualSet) {
        var actual = actualSet[0];
        return expect(actual.bridgeDbSystemCode).to.equal('Cks');
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    it('should get for "Uniprot-TrEMBL" by bridgeDbDataSourceName', function(done) {
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
      });

      bridgeDbInstance.dataset.get({
        '@context': internalContext['@context'],
        'bridgeDbDataSourceName': 'Uniprot-TrEMBL'
      })
      .toArray()
      .map(function(actualSet) {
        var actual = actualSet[0];
        return expect(actual.bridgeDbSystemCode).to.equal('S');
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
    });
  });
});
