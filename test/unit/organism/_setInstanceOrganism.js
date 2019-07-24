var _ = require("lodash");
var BridgeDb = require("../../../index.js");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var colors = require("colors");
var expect = chai.expect;
var fs = require("fs");
var mockserverMocha = require("../../mockserver-mocha.js");
var sinon = require("sinon");
var testUtils = require("../../test-utils");
var wd = require("wd");

var handleResult = testUtils.handleResult;

var internalContext = JSON.parse(
  fs.readFileSync(__dirname + "/../../jsonld-context.jsonld")
);

var homoSapiens = JSON.parse(
  fs.readFileSync(__dirname + "/homo-sapiens.jsonld")
);

var desired = { browserName: "phantomjs" };
desired.name = "example with " + desired.browserName;
desired.tags = ["dev-test"];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe("BridgeDb.Organism._setInstanceOrganism", function() {
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

  it("should set as Homo sapiens", function() {
    var testCoordinator = this;
    var test = this.test;
    test.expected = undefined;

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    var result = bridgeDbInstance.organism._setInstanceOrganism("Homo sapiens");
    expect(result).to.equal(test.expected);
  });

  it("should set as Homo sapiens, then get", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/homo-sapiens.jsonld";

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.organism._setInstanceOrganism("Homo sapiens");

    bridgeDbInstance.organism
      ._getInstanceOrganism()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should _getInstanceOrganism by entity reference", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/homo-sapiens.jsonld";

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.organism
      ._getInstanceOrganism({
        "@id": "http://identifiers.org/ncbigene/4292",
        "@type": "EntityReference"
      })
      .last()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should set by entity reference, then get", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/homo-sapiens.jsonld";

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.organism._setInstanceOrganism({
      "@id": "http://identifiers.org/ncbigene/4292",
      "@type": "EntityReference"
    });

    bridgeDbInstance.organism
      ._getInstanceOrganism()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should set as pre-normalized Homo sapiens, then get", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/homo-sapiens.jsonld";

    var bridgeDbInstance = new BridgeDb({
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.organism._setInstanceOrganism(homoSapiens);

    bridgeDbInstance.organism
      ._getInstanceOrganism()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
});
