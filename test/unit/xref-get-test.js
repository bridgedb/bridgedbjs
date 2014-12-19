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

describe('myBridgeDbInstance.xref.get', function() {
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

  //*
  it('should get xrefs by bridgeDbXrefsUrl, formatted for display',
      function(done) {
    var lkgXrefsPath = __dirname +
          '/../expected-data/ncbigene-1234-xrefs.jsonld';
    var lkgXrefsString = fs.readFileSync(lkgXrefsPath, {
      encoding: 'utf8'
    });

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT,
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    var xrefStream = bridgeDbInstance.xref.get({
        bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Homo sapiens' +
                            '/xrefs/L/1234'
      },
      {
        format:'display'
    })
    .collect()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentXrefsString) {
          lkgXrefsString = currentXrefsString;
          return currentXrefsString;
        })
        .pipe(fs.createWriteStream(lkgXrefsPath));
      }

      return s.fork();
    }))
    .map(function(currentXrefsString) {
      return expect(lkgXrefsString).to.equal(
        currentXrefsString);
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should get xrefs (input: plain object with identifiers IRI)',
      function(done) {
    var lkgXrefsPath = __dirname +
          '/../expected-data/ncbigene-4292-xrefs.jsonld';
    var lkgXrefsString = fs.readFileSync(lkgXrefsPath, {
      encoding: 'utf8'
    });

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT,
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    var xrefStream = bridgeDbInstance.xref.get({
      '@id': 'http://identifiers.org/ncbigene/4292'
      //bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Homo sapiens' +
        //                  '/xrefs/L/4292'
      //bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/4292'
    })
    .map(function(xrefs) {
      return xrefs;
    })
    .collect()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentXrefsString) {
          lkgXrefsString = currentXrefsString;
          return currentXrefsString;
        })
        .pipe(fs.createWriteStream(lkgXrefsPath));
      }

      return s.fork();
    }))
    .map(function(currentXrefsString) {
      return expect(lkgXrefsString).to.equal(
        currentXrefsString);
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should get xrefs (input: stream)', function(done) {
    var lkgXrefsPath = __dirname +
          '/../expected-data/ncbigene-1234-4292-xrefs.jsonld';
    var lkgXrefsString = fs.readFileSync(lkgXrefsPath, {
      encoding: 'utf8'
    });

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT,
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    highland([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .pipe(bridgeDbInstance.xref.createStream())
    .map(function(xrefs) {
      return xrefs;
    })
    .collect()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentXrefsString) {
          lkgXrefsString = currentXrefsString;
          return currentXrefsString;
        })
        .pipe(fs.createWriteStream(lkgXrefsPath));
      }

      return s.fork();
    }))
    .map(function(currentXrefsString) {
      return expect(lkgXrefsString).to.equal(
        currentXrefsString);
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

  //*
  it('should get xrefs (input: array)', function(done) {
    var lkgXrefsPath = __dirname +
          '/../expected-data/ncbigene-1234-4292-xrefs.jsonld';
    var lkgXrefsString = fs.readFileSync(lkgXrefsPath, {
      encoding: 'utf8'
    });

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT,
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsUrl: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .map(function(xrefs) {
      return xrefs;
    })
    .collect()
    .map(function(currentXrefs) {
      return JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        );
    })
    .pipe(highland.pipeline(function(s) {
      if (updateExpectedJson) {
        s.fork()
        .map(function(currentXrefsString) {
          lkgXrefsString = currentXrefsString;
          return currentXrefsString;
        })
        .pipe(fs.createWriteStream(lkgXrefsPath));
      }

      return s.fork();
    }))
    .map(function(currentXrefsString) {
      return expect(lkgXrefsString).to.equal(
        currentXrefsString);
    })
    .last()
    .each(function() {
      return done();
    });
  });
  //*/

});
