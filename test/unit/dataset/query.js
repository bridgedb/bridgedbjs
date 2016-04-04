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

describe('BridgeDb.Dataset.query', function() {
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

  it('should fetch metadata for all datasets at BridgeDb', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/datasets.jsonld';

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
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should fetch metadata for datasets by @id', function(done) {
    var test = this.test;
    test.expectedPath = __dirname +  '/query-result-entrez-gene.jsonld';

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
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should fetch metadata for datasets by name', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/query-result-entrez-gene.jsonld';

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
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  describe('fetch metadata for datasets by name and exampleIdentifier', function(done) {
    it('should work for Entrez Gene', function(done) {
      var test = this.test;
      test.expectedPath = __dirname + '/query-result-entrez-gene.jsonld';

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
      .let(test.handleResult)
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    it('should work for Agilent', function(done) {
      var test = this.test;
      test.expectedPath = __dirname + '/query-result-agilent.jsonld';

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
        name: 'Agilent',
        'http://identifiers.org/idot/exampleIdentifier': 'A_23_P69058'
      })
      .toArray()
      .let(test.handleResult)
      .doOnError(done)
      .subscribeOnCompleted(done);
    });
  });

//  // TODO AP, you can add use cases for pvjs editor dropdowns here
  describe('fetch metadata for datasets by subject', function() {
    it('should work for metabolites', function(done) {
      var test = this.test;
      // TODO
      test.expectedPath = __dirname + '/query-by-type-subject.jsonld';

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
        'http://purl.org/dc/terms/subject': 'http://vocabularies.wikipathways.org/gpml#Metabolite'
      })
      .toArray()
      .let(test.handleResult)
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

    // TODO for gene products, etc.
  });

  describe('should fetch metadata for datasets by exampleIdentifier', function(done) {

    it('should work for 1234 (e.g., Entrez Gene)', function(done) {
      var test = this.test;
      test.expectedPath = __dirname + '/query-example-identifier-1234.jsonld';

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
      .let(test.handleResult)
      .doOnError(done)
      .subscribeOnCompleted(done);
    });

//    // TODO this does not return Agilent as an item,
//    // probably bc the probabilities t/f are set poorly
//    // for the regexes.
//    it('should work for A_23_P69058 (e.g., Agilent)', function(done) {
//      var test = this.test;
//      test.expectedPath = __dirname + '/query-example-identifier-A_23_P69058.jsonld';
//
//      var bridgeDbInstance = new BridgeDb({
//        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
//        baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
//        datasetsMetadataIri:
//          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
//          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
//        context: internalContext['@context']
//      });
//
//      bridgeDbInstance.dataset.query({
//        'http://identifiers.org/idot/exampleIdentifier': 'A_23_P69058'
//      })
//      .toArray()
//      .let(test.handleResult)
//      .doOnError(done)
//      .subscribeOnCompleted(done);
//    });

  });

  /* I don't whether datasources.txt is correct for this one, so leaving it disabled. -AR
  it('should fetch metadata for datasets by name (multiple hits)', function(done) {
    var LKGDataPath = __dirname +
          '/query-name-ensembl.jsonld';
    var testParams = {
      expectedPath: LKGDataPath,
      expect: expect
    };
    var handleResultBySource = handleResultByLKGDataPathAndSource.bind(null, testParams);

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
    .let(handleResultBySource)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/
});
