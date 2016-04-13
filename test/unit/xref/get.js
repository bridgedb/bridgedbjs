var _ = require('lodash');
var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var mockserverMocha  =  require('../../mockserver-mocha.js');
var Rx = require('rx-extra');
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

describe('BridgeDb.Xref.get', function() {
  var standardBridgeDbApiUrlStub = 'http://webservice.bridgedb.org/';
  var suite = this;
  suite.allPassed = true;

  var sorter = function(a, b) {
    if (a.id !== b.id) {
      return a.id > b.id;
    } else if (a.name !== b.name) {
      return a.name > b.name;
    } else if (a.identifier !== b.identifier) {
      return a.identifier > b.identifier;
    } else {
      return JSON.stringify(a) > JSON.stringify(b);
    }
  };

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

  //*
  it('should get xrefs (input: map w/ Entrez Gene, 4292, Homo sapiens)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname +
        '/ncbigene-4292-xrefs-by-datasource_name-identifier-organism-name.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      'datasource_name': 'Entrez Gene',
      'identifier': '4292',
      organism: 'Homo sapiens'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  //*
  it('should get xrefs (input: map w/ systemCode, 4292, nameLanguageMap.la)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname +
        '/ncbigene-4292-xrefs-by-datasource_name-identifier-organism-name.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      identifier: '4292',
      organism: {
        nameLanguageMap: {
          la: 'Homo sapiens'
        }
      },
      isDataItemIn: {
        systemCode: 'L'
      }
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  //*
  it('should get xrefs (input: map w/ Entrez Gene, 1234, Human)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname +
        '/ncbigene-1234-xrefs-by-datasource_name-identifier-organism-name.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      'datasource_name': 'Entrez Gene',
      'identifier': '1234',
      organism: 'Human'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /* TODO this might not work
  it('should get xrefs (input: map w/ Homo%20sapiens BridgeDb endpoint)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-xrefs.jsonld';
    var expected = JSON.parse(fs.readFileSync(test.expectedPath, {encoding: 'utf8'}));

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      //baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        //'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Homo%20sapiens/xrefs/L/4292'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  //*
  it('should get xrefs (input: map w/ Homo sapiens BridgeDb endpoint)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-xrefs.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Homo sapiens/xrefs/L/4292'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  //*
  it('should get xrefs (input: map w/ Human BridgeDb endpoint)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-xrefs-human.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/4292'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  //*
  it('should get xrefs (input: map w/ identifiers IRI)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-4292-xrefs.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get({
      '@id': 'http://identifiers.org/ncbigene/4292'
    })
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /* TODO this does not work
  it('should get xrefs (input: array)', function(done) {
    var test = this.test;
    console.log('test.ctx');
    console.log(test.ctx);
    console.log('test.done');
    console.log(test.done);

    test.expectedPath = __dirname + '/ncbigene-1234-4292-xrefs.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get([
      {
        '@id': 'http://identifiers.org/ncbigene/4292'
      },
      {
        bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
      }
    ])
    .map(function(currentXrefs) {
      console.log('currentXrefs');
      console.log(currentXrefs);
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /* TODO this does not work
  it('should get xrefs (input: Observable)', function(done) {
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-1234-4292-xrefs.jsonld';
    test.ignoreOrder = true;
    test.done = done;

    var bridgeDbInstance = new BridgeDb({
      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
      datasetsMetadataIri:
        'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
    });

    bridgeDbInstance.xref.get(
        Rx.Observable.from([
          {
            '@id': 'http://identifiers.org/ncbigene/4292'
          },
          {
            bridgeDbXrefsIri: 'http://webservice.bridgedb.org/Human/xrefs/L/1234'
          }
        ])
    )
    .toArray()
    .map(function(currentXrefs) {
      return currentXrefs.sort(sorter);
    })
    .map(function(currentXrefs) {
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(test.handleResult)
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

});
