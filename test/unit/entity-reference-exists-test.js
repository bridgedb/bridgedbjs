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

describe('myBridgeDbInstance.entityReference.exists', function() {
  var allPassed = true;
  var server;

  before(function(done) {
    // TODO get a free port instead of just using 4522
    server = http.createServer(
      mockserver(__dirname + '/../input-data/')
    ).listen(4522);
    done();
  });

  beforeEach(function() {
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    server.close(done);
  });

  //*
  it('should check existence of existing entity reference (Latin)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:4522',
      dataSourcesUrl:
        'http://localhost:4522/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Homo sapiens'
    )
    .map(function(exists) {
      return expect(exists).to.equal(true);
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of existing entity reference (English)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:4522',
      dataSourcesUrl:
        'http://localhost:4522/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Human'
    )
    .map(function(exists) {
      return expect(exists).to.equal(true);
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of non-existing entity reference (Latin)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:4522',
      dataSourcesUrl:
        'http://localhost:4522/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Mus musculus'
    )
    .map(function(exists) {
      return expect(exists).to.equal(false);
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of non-existing entity reference (English)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      apiUrlStub: 'http://localhost:4522',
      dataSourcesUrl:
        'http://localhost:4522/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Mouse'
    )
    .map(function(exists) {
      return expect(exists).to.equal(false);
    })
    .each(function() {
      return done();
    });
  });
  //*/

});
