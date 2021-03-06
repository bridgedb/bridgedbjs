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

var desired = { browserName: "phantomjs" };
desired.name = "example with " + desired.browserName;
desired.tags = ["dev-test"];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe("BridgeDb.EntityReference.exists", function() {
  var standardBridgeDbApiBaseIri = "http://webservice.bridgedb.org/";
  var suite = this;
  suite.allPassed = true;

  mockserverMocha();

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
    done();
  });

  afterEach(function(done) {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
    done();
  });

  after(function(done) {
    done();
  });

  //*
  it("should check existence of existent entity reference (Latin)", function(done) {
    var testCoordinator = this;
    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.entityReference
      .exists("L", "4292", "Homo sapiens")
      .last()
      .map(function(exists) {
        return expect(exists).to.be.true;
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/

  //*
  it("should check existence of existent entity reference (English)", function(done) {
    var testCoordinator = this;

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.entityReference
      .exists("L", "4292", "Human")
      .last()
      .map(function(exists) {
        return expect(exists).to.be.true;
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/

  //*
  it("should check existence of non-existent entity reference (Latin)", function(done) {
    var testCoordinator = this;

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.entityReference
      .exists("L", "4292", "Mus musculus")
      .last()
      .map(function(exists) {
        return expect(exists).to.be.false;
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/

  //*
  it("should check existence of non-existent entity reference (English)", function(done) {
    var testCoordinator = this;

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    });

    bridgeDbInstance.entityReference
      .exists("L", "4292", "Mouse")
      .last()
      .map(function(exists) {
        return expect(exists).to.be.false;
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
  });
  //*/
});
