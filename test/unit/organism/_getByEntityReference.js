var _ = require('lodash');
var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var mockserverMocha  =  require('../../mockserver-mocha.js');
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

describe('BridgeDb.Organism._getByEntityReference', function() {
  var suite = this;
  suite.allPassed = true;

  mockserverMocha();

  before(function() {
  });

  beforeEach(function() {
    suite.allPassed = suite.allPassed && (this.currentTest.state === 'passed');
  });

  afterEach(function() {
    suite.allPassed = suite.allPassed && (this.currentTest.state === 'passed');
  });

  after(function() {
  });

  it('should get organism by http://identifiers.org/ncbigene/4292', function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._getByEntityReference({
      '@id': 'http://identifiers.org/ncbigene/4292'
    })
    .last()
    .let(handleResult.bind(testCoordinator))
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  it('should get organism by L and 4292', function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + '/homo-sapiens.jsonld';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism._getByEntityReference({
      'systemCode': 'L',
      'identifier': '4292'
    })
    .last()
    .let(handleResult.bind(testCoordinator))
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

});
