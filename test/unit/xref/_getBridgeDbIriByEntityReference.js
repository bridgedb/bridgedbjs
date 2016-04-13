var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var mockserverMocha  =  require('../../mockserver-mocha.js');
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

describe('BridgeDb.Xref._getBridgeDbIriByEntityReference', function() {
  var standardBridgeDbApiUrlStub = 'http://webservice.bridgedb.org/';
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

  it('should get by plain object with all required properties', function() {
    var test = this.test;
    test.expected = 'http://webservice.bridgedb.org/Homo%20sapiens/xrefs/L/4292';

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    var bridgeDbXrefsIri = bridgeDbInstance.xref._getBridgeDbIriByEntityReference({
      identifier: '4292',
      organism: {
        nameLanguageMap: {
          la: 'Homo sapiens'
        }
      },
      isDataItemIn: {
        systemCode: 'L'
      }
    });

    var bridgeDbXrefsIriStandardized = bridgeDbXrefsIri.replace(
        new RegExp(bridgeDbInstance.config.baseIri, 'g'),
        standardBridgeDbApiUrlStub
    );
    expect(bridgeDbXrefsIriStandardized).to.equal(test.expected);

  });

});
