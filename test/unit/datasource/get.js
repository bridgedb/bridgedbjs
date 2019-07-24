var BridgeDb = require("../../../index.js");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var colors = require("colors");
var expect = chai.expect;
var fs = require("fs");
var mockserverMocha = require("../../helpers/mockserver-mocha.js");
var RxFs = require("rx-fs");
var sinon = require("sinon");
var testUtils = require("../../helpers/test-utils");
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

describe("BridgeDb.Datasource.get", function() {
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

  it("should get metadata by provider @id", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/entrez-gene-datasource-metadata.jsonld";

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasourcesMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt",
      context: internalContext["@context"]
    });

    console.log("bridgeDbInstance");
    console.log(bridgeDbInstance);

    bridgeDbInstance.datasource
      .get({
        "@id": "http://www.ncbi.nlm.nih.gov/gene/"
      })
      .last()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should get metadata by identifiers.org @id", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/entrez-gene-datasource-metadata.jsonld";

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasourcesMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt",
      context: internalContext["@context"]
    });

    bridgeDbInstance.datasource
      .get({
        "@id": "http://identifiers.org/ncbigene/"
      })
      .last()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should get metadata by non-normalized identifiers.org @id", function(done) {
    var testCoordinator = this;
    var test = this.test;
    test.expectedPath = __dirname + "/entrez-gene-datasource-metadata.jsonld";

    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasourcesMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt",
      context: internalContext["@context"]
    });

    bridgeDbInstance.datasource
      .get({
        "@id": "http://identifiers.org/ncbigene"
      })
      .last()
      .let(handleResult.bind(testCoordinator))
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  it("should get metadata by datasource_name and exampleIdentifier", function(done) {
    var testCoordinator = this;
    var bridgeDbInstance = new BridgeDb({
      //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
      baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
      datasourcesMetadataIri:
        //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
        "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt",
      context: internalContext["@context"]
    });

    bridgeDbInstance.datasource
      .get({
        //'@context': internalContext['@context'],
        datasource_name: "Entrez Gene",
        exampleIdentifier: "18597"
      })
      .last()
      .map(function(actual) {
        return expect(actual.systemCode).to.equal("L");
      })
      .doOnError(done)
      .subscribeOnCompleted(done);
  });

  describe("Get BridgeDb system code by BridgeDb conventional name (GPML Datasource)", function() {
    it('should get for "Entrez Gene" by datasource_name', function(done) {
      var testCoordinator = this;
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasourcesMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: internalContext["@context"]
      });

      bridgeDbInstance.datasource
        .get({
          "@context": internalContext["@context"],
          datasource_name: "Entrez Gene"
        })
        .last()
        .map(function(actual) {
          return expect(actual.systemCode).to.equal("L");
        })
        .doOnError(done)
        .subscribeOnCompleted(done);
    });

    it('should get for "Ensembl" by datasource_name', function(done) {
      var testCoordinator = this;
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasourcesMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: internalContext["@context"]
      });

      var key = [
        "https://github.com/bridgedb/BridgeDb/blob/master/",
        "org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#",
        "datasource_name"
      ].join("");
      var input = {};
      input[key] = "Ensembl";
      bridgeDbInstance.datasource
        .get(input)
        .last()
        .map(function(actual) {
          return expect(actual.systemCode).to.equal("En");
        })
        .doOnError(done)
        .subscribeOnCompleted(done);
    });

    it('should get for "KNApSAcK" by datasource_name', function(done) {
      var testCoordinator = this;
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasourcesMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: internalContext["@context"]
      });

      bridgeDbInstance.datasource
        .get({
          "@context": internalContext["@context"],
          datasource_name: "KNApSAcK"
        })
        .last()
        .map(function(actual) {
          return expect(actual.systemCode).to.equal("Cks");
        })
        .doOnError(done)
        .subscribeOnCompleted(done);
    });

    it('should get for "Uniprot-TrEMBL" by datasource_name', function(done) {
      var testCoordinator = this;
      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasourcesMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: internalContext["@context"]
      });

      bridgeDbInstance.datasource
        .get({
          "@context": internalContext["@context"],
          datasource_name: "Uniprot-TrEMBL"
        })
        .last()
        .map(function(actual) {
          return expect(actual.systemCode).to.equal("S");
        })
        .doOnError(done)
        .subscribeOnCompleted(done);
    });
  });
});
