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
var testUtils = require('../../test-utils.js');
var wd = require('wd');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.EntityReference.freeSearch', function() {
  var allPassed = true;
  var that = this;
  var update;
  var lkgDataPath;
  var lkgDataString;

  before(function(done) {
    // Find whether user requested to update the expected JSON result
    update = testUtils.getUpdateState(that.title);
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
  it('should free search for entity references (Latin/single instance)',
      function(done) {

    lkgDataPath = __dirname +
          '/hits-for-pdha1-mus-musculus.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDb1 = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDb1.entityReference.freeSearch({
      attribute: 'Pdha1',
      organism: 'Mus musculus'
    })
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

  //*
  it('should free search for entity references (English/single instance)',
      function(done) {

    lkgDataPath = __dirname +
          '/hits-for-agt-mouse.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDb1 = BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDb1.entityReference.freeSearch({
      attribute: 'Agt',
      organism: 'Mouse'
    })
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

  //*
  it('should free search for entity references (English&Latin/multi-instance)',
      function(done) {

    lkgDataPath = __dirname +
          '/hits-for-nfkb1-and-agt-mouse.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDb2 = BridgeDb({
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
