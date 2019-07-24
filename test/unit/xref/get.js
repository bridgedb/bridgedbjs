var _ = require("lodash");
var BridgeDb = require("../../../index.js");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var colors = require("colors");
var expect = chai.expect;
var fs = require("fs");
var mockserverMocha = require("../../mockserver-mocha.js");
var Rx = require("rx-extra");
var sinon = require("sinon");
var testUtils = require("../../test-utils.js");
var wd = require("wd");

var handleResult = testUtils.handleResult;

var desired = { browserName: "phantomjs" };
desired.name = "example with " + desired.browserName;
desired.tags = ["dev-test"];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe("BridgeDb.Xref.get", function() {
  var standardBridgeDbApiUrlStub = "http://webservice.bridgedb.org/";
  var suite = this;
  suite.allPassed = true;

  mockserverMocha();

  before(function() {});

  beforeEach(function() {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
  });

  afterEach(function() {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
  });

  after(function() {});

  //*
  it("should get xrefs (input: map w/ Entrez Gene, 4292, Homo sapiens)", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
    test.ignoreOrder = true;

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.xref
      .get({
        datasource_name: "Entrez Gene",
        identifier: "4292",
        organism: "Homo sapiens"
      })
      .toArray()
      .map(function(currentXrefs) {
        return JSON.parse(
          JSON.stringify(currentXrefs).replace(
            new RegExp(bridgeDbInstance.config.baseIri, "g"),
            standardBridgeDbApiUrlStub
          )
        );
      })
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/

  //*
  it("should get xrefs (input: map w/ systemCode, 4292, nameLanguageMap.la)", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
    test.ignoreOrder = true;

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.xref
      .get({
        identifier: "4292",
        organism: {
          nameLanguageMap: {
            la: "Homo sapiens"
          }
        },
        isDataItemIn: {
          systemCode: "L"
        }
      })
      .toArray()
      .map(function(currentXrefs) {
        return JSON.parse(
          JSON.stringify(currentXrefs).replace(
            new RegExp(bridgeDbInstance.config.baseIri, "g"),
            standardBridgeDbApiUrlStub
          )
        );
      })
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/

  //*
  it(
    [
      "should get xrefs. input is a map w/ these properties:",
      "organism: Human",
      "datasource_name: Entrez Gene (ncbigene)",
      "identifier: 1234"
    ].join("\n\t\t\t"),
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath = __dirname + "/ncbigene-1234-xrefs.jsonld";
      test.ignoreOrder = true;

      var bridgeDbInstance = new BridgeDb({
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.xref
        .get({
          datasource_name: "Entrez Gene",
          identifier: "1234",
          organism: "Human"
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );
  //*/

  //*
  it(
    [
      "should get xrefs. input is a map w/ a BridgeDb endpoint:",
      "organism in endpoint: Homo%20sapiens",
      "symbol (for datasource) in endpoint: L (ncbigene)",
      "identifier in endpoint: 4292"
    ].join("\n\t\t\t"),
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
      test.ignoreOrder = true;

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.xref
        .get({
          bridgeDbXrefsIri:
            "http://webservice.bridgedb.org/Homo%20sapiens/xrefs/L/4292"
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );
  //*/

  //*
  it(
    [
      "should get xrefs. input is a map w/ a BridgeDb endpoint:",
      "organism in endpoint: Homo sapiens",
      "symbol (for datasource) in endpoint: L (ncbigene)",
      "identifier in endpoint: 4292"
    ].join("\n\t\t\t"),
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
      test.ignoreOrder = true;

      var bridgeDbInstance = new BridgeDb({
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.xref
        .get({
          bridgeDbXrefsIri:
            "http://webservice.bridgedb.org/Homo sapiens/xrefs/L/4292"
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );
  //*/

  //*
  it(
    [
      "should get xrefs. input is a map w/ a BridgeDb endpoint:",
      "organism in endpoint: Human",
      "symbol (for datasource) in endpoint: L (ncbigene)",
      "identifier in endpoint: 4292"
    ].join("\n\t\t\t"),
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
      test.ignoreOrder = true;

      var bridgeDbInstance = new BridgeDb({
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.xref
        .get({
          bridgeDbXrefsIri: "http://webservice.bridgedb.org/Human/xrefs/L/4292"
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );
  //*/

  //*
  it(
    [
      "should get xrefs. input is a map w/ an identifiers IRI:",
      "preferredPrefix in identifiers IRI: ncbigene",
      "identifier in identifiers IRI: 4292"
    ].join("\n\t\t\t"),
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath = __dirname + "/ncbigene-4292-xrefs.jsonld";
      test.ignoreOrder = true;

      var bridgeDbInstance = new BridgeDb({
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.xref
        .get({
          "@id": "http://identifiers.org/ncbigene/4292"
        })
        .toArray()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );
  //*/

  /* TODO this does not work
  it('should get xrefs (input: array)', function(done) {
    var testCoordinator = this;
    var test = this.test;
    console.log('test.ctx');
    console.log(test.ctx);
    console.log('test.done');
    console.log(test.done);

    test.expectedPath = __dirname + '/ncbigene-1234-4292-xrefs.jsonld';
    test.ignoreOrder = true;

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
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(handleResult.bind(testCoordinator))
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/

  /* TODO this does not work
  it('should get xrefs (input: Observable)', function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + '/ncbigene-1234-4292-xrefs.jsonld';
    test.ignoreOrder = true;

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
      return JSON.parse(JSON.stringify(currentXrefs)
        .replace(
          new RegExp(bridgeDbInstance.config.baseIri, 'g'),
          standardBridgeDbApiUrlStub
        ));
    })
    .let(handleResult.bind(testCoordinator))
    .doOnError(done)
    .subscribeOnCompleted(done);
  });
  //*/
});
