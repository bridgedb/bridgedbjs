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

describe('BridgeDb.EntityReference.enrich', function() {
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
  it('should enrich entity reference by @id\n' +
      '        xref: false\n' +
      '        context: true\n' +
      '        dataset: true\n' +
      '        organism: false',
      function(done) {

    lkgDataPath = __dirname +
          '/ncbigene-4292-xref-false-context-true-' +
          'dataset-true-organism-false.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.enrich([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      }
    ], {
      xref: false,
      context: true,
      dataset: true,
      organism: false
    })
    .map(function(result) {
      expect(result.xref).to.not.exist;
      expect(result['@context']).to.exist;
      expect(result.isDataItemIn).to.exist;
      expect(result.organism).to.not.exist;
      return result;
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
  it('should enrich entity reference by @id\n' +
      '        xref: false\n' +
      '        context: true\n' +
      '        dataset: true\n' +
      '        organism: true',
      function(done) {

    lkgDataPath = __dirname +
          '/ncbigene-4292-xref-false-context-true-' +
          'dataset-true-organism-true.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.enrich([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      }
    ], {
      xref: false,
      context: true,
      dataset: true,
      organism: true
    })
    .map(function(result) {
      expect(result.xref).to.not.exist;
      expect(result['@context']).to.exist;
      expect(result.isDataItemIn).to.exist;
      expect(result.organism).to.exist;
      return result;
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
  it('should enrich entity reference by @id\n' +
      '        xref: true\n' +
      '        context: false\n' +
      '        dataset: true\n' +
      '        organism: false',
      function(done) {

    lkgDataPath = __dirname +
          '/ncbigene-4292-xref-true-context-false-' +
          'dataset-true-organism-false.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.enrich([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      }
    ], {
      xref: true,
      context: false,
      dataset: true,
      organism: false
    })
    .map(function(result) {
      expect(result.xref).to.exist;
      expect(result['@context']).to.not.exist;
      expect(result.isDataItemIn).to.exist;
      expect(result.organism).to.not.exist;
      return result;
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
  it('should enrich entity reference by @id\n' +
      '        xref: true\n' +
      '        context: false\n' +
      '        dataset: true\n' +
      '        organism: true',
      function(done) {

    lkgDataPath = __dirname +
          '/ncbigene-4292-xref-true-context-false-' +
          'dataset-true-organism-true.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.entityReference.enrich([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      }
    ], {
      xref: true,
      context: false,
      dataset: true,
      organism: true
    })
    .map(function(result) {
      expect(result.xref).to.exist;
      expect(result['@context']).to.not.exist;
      expect(result.isDataItemIn).to.exist;
      expect(result.organism).to.exist;
      return result;
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
  it('should enrich entity references using createEnrichmentStream, ' +
      'with options not specified so defaults used.',
      function(done) {

    lkgDataPath = __dirname +
          '/ncbigene-4292-and-bridgedb-L-1234.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance2 = BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    highland([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .pipe(bridgeDbInstance2.entityReference.createEnrichmentStream())
    .map(function(result) {
      expect(result.xref).to.exist;
      expect(result['@context']).to.exist;
      expect(result.isDataItemIn).to.exist;
      expect(result.organism).to.exist;
      return result;
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

});
