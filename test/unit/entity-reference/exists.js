var BridgeDb = require('../../../index.js');
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

describe('BridgeDb.EntityReference.exists', function() {
  var allPassed = true;
  var standardBridgeDbApiBaseIri = 'http://webservice.bridgedb.org/';

  before(function(done) {
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

  //*
  it('should check existence of existent entity reference (Latin)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Homo sapiens'
    )
    .map(function(exists) {
      return expect(exists).to.be.true;
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of existent entity reference (English)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Human'
    )
    .map(function(exists) {
      return expect(exists).to.be.true;
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of non-existent entity reference (Latin)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Mus musculus'
    )
    .map(function(exists) {
      return expect(exists).to.be.false;
    })
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should check existence of non-existent entity reference (English)',
      function(done) {

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.exists(
      'L',
      '4292',
      'Mouse'
    )
    .map(function(exists) {
      return expect(exists).to.be.false;
    })
    .each(function() {
      return done();
    });
  });
  //*/

});
