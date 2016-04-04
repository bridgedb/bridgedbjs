var _ = require('lodash');
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

var handleResult = testUtils.handleResult;

var internalContext = JSON.parse(fs.readFileSync(
  __dirname + '/../../jsonld-context.jsonld'));

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.EntityReference.freeSearch', function() {
  var standardBridgeDbApiUrlStub = 'http://webservice.bridgedb.org/';
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

  //*
  it('should free search for entity references (Latin/single instance)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/hits-for-pdha1-mus-musculus.jsonld';

    var bridgeDb1 = new BridgeDb({
      baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      //baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        //'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
        context: internalContext['@context']
    });

    bridgeDb1.entityReference.freeSearch({
      attribute: 'Pdha1',
      organism: 'Mus musculus'
    })
    .toArray()
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
      .replace(
        new RegExp(bridgeDb1.config.baseIri, 'g'),
        standardBridgeDbApiUrlStub
      ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);

  });
  //*/

  //*
  it('should free search for entity references (English/single instance)',
      function(done) {
        var test = this.test;
        test.expectedPath = __dirname + '/hits-for-agt-mouse.jsonld';
        var expected = JSON.parse(fs.readFileSync(test.expectedPath, {encoding: 'utf8'}));

        var bridgeDb1 = new BridgeDb({
          baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
          datasetsMetadataIri:
            'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
        });

        bridgeDb1.entityReference.freeSearch({
          attribute: 'Agt',
          organism: 'Mouse'
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(JSON.stringify(currentXrefs)
          .replace(
            new RegExp(bridgeDb1.config.baseIri, 'g'),
            standardBridgeDbApiUrlStub
          ));
        })
        .map(function(currentXrefs) {
          var currentStringifiedXrefs = currentXrefs.map(JSON.stringify);
          var expectedStringifiedXrefs = expected.map(JSON.stringify);
          var intersection = _.intersection(currentStringifiedXrefs, expectedStringifiedXrefs);
          return expect(intersection.length).to.equal(currentStringifiedXrefs.length);
        })
        //.let(test.handleResult)
        .doOnError(done)
        .subscribeOnCompleted(done);

      });
  //*/

  /*
  it('should free search for entity references (English&Latin/multi-instance)',
      function(done) {

    lkgDataPath = __dirname +
          '/hits-for-nfkb1-and-agt-mouse.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDb2 = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDb2.entityReference.freeSearch({
      attribute: 'Nfkb1',
      organism: 'Mus musculus'
    })
    .concat(
      bridgeDb2.entityReference.freeSearch({
        attribute: 'Agt',
        organism: 'Mouse'
      })
    )
    .collect()
    .map(JSON.stringify)
    .pipe(highland.pipeline(function(s) {
      if (update) {
        s.fork()
        .map(function(dataString) {
          lkgDataString = dataString;
          return dataString;
        })
        .pipe(fs.createWriteStream(lkgDataPath));
      }

      return s.fork();
    }))
    .map(function(dataString) {
      return testUtils.compareJson(dataString, lkgDataString);
    })
    .map(function(passed) {
      return expect(passed).to.be.true;
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

});
