var _ = require('lodash');
var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var http    =  require('http');
var mockserver  =  require('mockserver');
var sinon      = require('sinon');
var testUtils = require('../../test-utils');
var wd = require('wd');

var handleResult = testUtils.handleResult;

var internalContext = JSON.parse(fs.readFileSync(
  __dirname + '/../../jsonld-context.jsonld'));

var homoSapiens = JSON.parse(fs.readFileSync(
  __dirname + '/homo-sapiens.jsonld'));

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Organism._setInstanceOrganism', function() {
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

  it('should set as Homo sapiens (normalize: true)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism('Homo sapiens', true)
    .last()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should set as Homo sapiens (normalize: false)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism(homoSapiens, false)
    .last()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should set as Homo sapiens (normalize: true), then get', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism('Homo sapiens', true)
    .last()
    .flatMap(function(organism) {
      expect(organism.nameLanguageMap.la).to.eql('Homo sapiens');
      return bridgeDbInstance.organism._getInstanceOrganism();
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should set as Homo sapiens (normalize: not specified), then get', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism('Homo sapiens')
    .last()
    .flatMap(function(organism) {
      expect(organism.nameLanguageMap.la).to.eql('Homo sapiens');
      return bridgeDbInstance.organism._getInstanceOrganism();
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should _getInstanceOrganism by entity reference', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._getInstanceOrganism({
      '@id': 'http://identifiers.org/ncbigene/4292',
      '@type': 'EntityReference'
    })
    .last()
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should set by entity reference (normalize: true), then get', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism({
      '@id': 'http://identifiers.org/ncbigene/4292',
      '@type': 'EntityReference'
    }, true)
    .last()
    .flatMap(function(organism) {
      expect(organism.nameLanguageMap.la).to.eql('Homo sapiens');
      return bridgeDbInstance.organism._getInstanceOrganism();
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should set as pre-normalized Homo sapiens (normalize: false), then get', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._setInstanceOrganism(homoSapiens, false)
    .last()
    .flatMap(function(organism) {
      expect(organism.nameLanguageMap.la).to.eql('Homo sapiens');
      return bridgeDbInstance.organism._getInstanceOrganism();
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

});
