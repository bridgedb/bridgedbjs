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

var internalContext = JSON.parse(fs.readFileSync(
  __dirname + '/../../jsonld-context.jsonld'));

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('BridgeDb.Dataset.query', function() {
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

//  it('should fetch metadata for all datasets at BridgeDb', function(done) {
//    lkgDataPath = __dirname + '/datasets.jsonld';
//    lkgDataString = testUtils.getLkgDataString(lkgDataPath);
//
//    var bridgeDbInstance = new BridgeDb({
//      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
//      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
//      datasetsMetadataIri:
//        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
//        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
//      context: internalContext['@context']
//    });
//
//    bridgeDbInstance.dataset.query()
//    .toArray()
//    .map(function(currentDatasets) {
//      return JSON.stringify(currentDatasets, null, '  ');
//    })
//    .let(function(source) {
//      if (update) {
//        return source 
//        .let(RxFs.createWriteObservable(lkgDataPath));
//      }
//
//      return source
//      .map(function(dataString) {
//        return testUtils.compareJson(lkgDataString, dataString);
//      })
//      .map(function(passed) {
//        return expect(passed).to.be.true;
//      });
//    })
//    .doOnError(done)
//    .subscribeOnCompleted(done);
//  });
//
//  it('should fetch metadata for datasets by name (one hit)', function(done) {
//    lkgDataPath = __dirname + '/query-name-entrez-gene.jsonld';
//    lkgDataString = testUtils.getLkgDataString(lkgDataPath);
//
//    var bridgeDbInstance = new BridgeDb({
//      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
//      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
//      datasetsMetadataIri:
//        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
//        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
//      context: internalContext['@context']
//    });
//
//    bridgeDbInstance.dataset.query({
//      '@context': 'http://schema.org/',
//      name: 'Entrez Gene'
//    })
//    .toArray()
//    .map(function(currentDatasets) {
//      return JSON.stringify(currentDatasets);
//    })
//    .let(function(source) {
//      if (update) {
//        return source 
//        .let(RxFs.createWriteObservable(lkgDataPath));
//      }
//
//      return source
//      .map(function(dataString) {
//        return testUtils.compareJson(lkgDataString, dataString);
//      })
//      .map(function(passed) {
//        return expect(passed).to.be.true;
//      });
//    })
//    .doOnError(done)
//    .subscribeOnCompleted(done);
//  });

  it('should fetch metadata for datasets by name and exampleIdentifier (one hit)', function(done) {
    lkgDataPath = __dirname +
          '/query-name-entrez-gene.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      '@context': 'http://schema.org/',
      name: 'Entrez Gene',
      'http://identifiers.org/idot/exampleIdentifier': '1234'
    })
    .toArray()
    .map(function(currentDatasets) {
      return JSON.stringify(currentDatasets);
    })
    .let(function(source) {
      if (update) {
        return source 
        .let(RxFs.createWriteObservable(lkgDataPath));
      }

      return source
      .map(function(dataString) {
        console.log('lkgDataString158');
        console.log(lkgDataString);
        console.log('dataString161');
        console.log(dataString);
        return testUtils.compareJson(lkgDataString, dataString);
      })
      .map(function(passed) {
        return expect(passed).to.be.true;
      });
    })
    .doOnError(done)
    .subscribeOnCompleted(done);
  });

  /* TODO this might be working correctly, but no lkg has ever been set.
  // verify correctness of results and then set lkg.
  it('should fetch metadata for datasets by exampleIdentifier (one hit)', function(done) {
    lkgDataPath = __dirname +
          '/query-name-entrez-gene.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      'http://identifiers.org/idot/exampleIdentifier': '1234'
    })
//    .doOnNext(function(currentDataset) {
//      console.log('currentDataset103');
//      console.log(currentDataset);
//    })
    .toArray()
    .map(function(currentDatasets) {
      return JSON.stringify(currentDatasets);
    })
//    .let(function(source) {
//      if (update) {
//        return source 
//        .let(RxFs.createWriteObservable(lkgDataPath));
//      }
//
//      return source
//      .map(function(dataString) {
//        return testUtils.compareJson(lkgDataString, dataString);
//      })
//      .map(function(passed) {
//        return expect(passed).to.be.true;
//      });
//    })
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /* I don't whether datasources.txt is correct for this one, so leaving it disabled. -AR
  it('should fetch metadata for datasets by name (multiple hits)', function(done) {
    lkgDataPath = __dirname +
          '/query-name-ensembl.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
      context: internalContext['@context']
    });

    bridgeDbInstance.dataset.query({
      name: 'Ensembl'
    })
    .collect()
    .map(function(currentDatasets) {
      return JSON.stringify(currentDatasets);
    })
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
      return testUtils.compareJson(lkgDataString, dataString);
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
