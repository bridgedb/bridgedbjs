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
var testUtils = require('../../test-utils');
var wd = require('wd');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Organism.query', function() {
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
  it('should fetch all organisms',
      function(done) {

    var lkgDataPath = __dirname +
          '/all-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query()
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
  it('should query organisms by name (Latin/string)',
      function(done) {

    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query('Homo sapiens')
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
  it('should query organisms by name (Latin/object)',
      function(done) {

    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query({
      'name': 'Homo sapiens',
      '@type': 'Organism'
    })
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
  it('should query organisms by name (English)',
      function(done) {

    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query({
      'name': 'Human',
      '@type': 'Organism'
    })
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
  it('should query organisms by entity reference identifiers IRI',
      function(done) {

    var lkgDataPath = __dirname +
          '/ncbigene-4292-organism.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.organism.query({
      '@id': 'http://identifiers.org/ncbigene/4292',
      '@type': 'EntityReference'
    })
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
