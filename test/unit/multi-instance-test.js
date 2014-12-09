var BridgeDb = require('../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var highland = require('highland');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
var sinon      = require('sinon');
var wd = require('wd');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb', function() {
  var allPassed = true;
  var standardBridgeDbApiUrlStub = 'http://webservice.bridgedb.org';
  // if we want to update the expected JSON result
  var updateExpectedJson = false;

  before(function(done) {
    done();
  });

  beforeEach(function() {
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('should construct multiple independent instances',
      function(done) {

    bridgeDbInstance1 = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:' + process.env.MOCKSERVER_PORT,
      dataSourcesUrl:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      organism: 'Homo sapiens'
    });

    expect(bridgeDbInstance1.config.apiUrlStub)
      .to.equal('http://localhost:' + process.env.MOCKSERVER_PORT);
    expect(bridgeDbInstance1.config.dataSourcesUrl)
      .to.equal('http://localhost:' + process.env.MOCKSERVER_PORT +
        '/datasources.txt');
    expect(bridgeDbInstance1.organismLatinName)
      .to.equal('Homo sapiens');

    bridgeDbInstance2 = BridgeDb({
      apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      dataSourcesUrl:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
    });

    expect(bridgeDbInstance2.config.apiUrlStub)
      .to.equal('http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php');
    expect(bridgeDbInstance2.config.dataSourcesUrl)
      .to.equal(
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php');

    expect(bridgeDbInstance2.organismLatinName)
    .to.equal(undefined);

    // Check that the first instance is unchanged
    expect(bridgeDbInstance1.config.apiUrlStub)
      .to.equal('http://localhost:' + process.env.MOCKSERVER_PORT);
    expect(bridgeDbInstance1.config.dataSourcesUrl)
      .to.equal('http://localhost:' + process.env.MOCKSERVER_PORT +
        '/datasources.txt');
    expect(bridgeDbInstance1.organismLatinName)
      .to.equal('Homo sapiens');

    done();
  });

});