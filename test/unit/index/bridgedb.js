var BridgeDb = require("../../index.js");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var colors = require("colors");
var expect = chai.expect;
var fs = require("fs");
var highland = require("highland");
var http = require("http");
var mockserver = require("mockserver");
var sinon = require("sinon");
var wd = require("wd");

var desired = { browserName: "phantomjs" };
desired.name = "example with " + desired.browserName;
desired.tags = ["dev-test"];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe("BridgeDb", function() {
  var suite = this;
  suite.allPassed = true;
  var standardBridgeDbApiUrlStub = "http://webservice.bridgedb.org";
  // if we want to update the expected JSON result
  var updateExpectedJson = false;

  before(function() {});

  beforeEach(function() {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
  });

  afterEach(function() {
    suite.allPassed = suite.allPassed && this.currentTest.state === "passed";
  });

  after(function() {
    done();
  });

  it("should construct multiple independent instances", function(done) {
    bridgeDbInstance1 = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasetsMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt",
      organism: "Homo sapiens"
    });

    expect(bridgeDbInstance1.config.baseIri).to.equal(
      "http://localhost:" + process.env.MOCKSERVER_PORT + "/"
    );
    expect(bridgeDbInstance1.config.datasetsMetadataIri).to.equal(
      "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    );
    expect(bridgeDbInstance1.organismNameNormalizedAsSet).to.exist;

    bridgeDbInstance2 = new BridgeDb({
      baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
      datasetsMetadataIri:
        "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
    });

    expect(bridgeDbInstance2.config.baseIri).to.equal(
      "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/"
    );
    expect(bridgeDbInstance2.config.datasetsMetadataIri).to.equal(
      "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
    );

    expect(bridgeDbInstance2.organismNameNormalizedAsSet).to.be.undefined;

    // Check that the first instance is unchanged
    expect(bridgeDbInstance1.config.baseIri).to.equal(
      "http://localhost:" + process.env.MOCKSERVER_PORT + "/"
    );
    expect(bridgeDbInstance1.config.datasetsMetadataIri).to.equal(
      "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
    );
    expect(bridgeDbInstance1.organismNameNormalizedAsSet).to.exist;

    done();
  });
});
