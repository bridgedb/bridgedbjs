var _ = require("lodash");
var BridgeDb = require("../../../index.js");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var colors = require("colors");
var expect = chai.expect;
var fs = require("fs");
var mockserverMocha = require("../../mockserver-mocha.js");
var sinon = require("sinon");
var testUtils = require("../../test-utils.js");
var wd = require("wd");

var testContext = JSON.parse(
  fs.readFileSync(__dirname + "/../../jsonld-context.jsonld")
);

var handleResult = testUtils.handleResult;

var desired = { browserName: "phantomjs" };
desired.name = "example with " + desired.browserName;
desired.tags = ["dev-test"];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe("BridgeDb.EntityReference.enrich", function() {
  var standardBridgeDbApiUrlStub = "http://webservice.bridgedb.org/";
  var suite = this;
  suite.allPassed = true;

  mockserverMocha();

  before(function(done) {
    var testCoordinator = this;
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

  it(
    "should enrich entity reference by identifier & datasource_name (expanded)\n" +
      "        xref: false\n" +
      "        context: false\n" +
      "        dataset: true\n" +
      "        organism: true",
    function(done) {
      var testCoordinator = this;
      var test = this.test;

      test.expectedPath =
        __dirname +
        "/uniprot-P29754-xref-false-context-false-" +
        "dataset-true-organism-true.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: testContext
      });

      bridgeDbInstance.entityReference
        .enrich(
          {
            identifier: "P29754",
            displayName: "AGTRA_MOUSE",
            "https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#datasource_name":
              "Uniprot-TrEMBL"
          },
          {
            xref: false,
            context: false,
            dataset: true,
            organism: true
          }
        )
        .map(function(result) {
          expect(result.xref).to.not.exist;
          expect(result["@context"]).to.not.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by identifier/datasource_name\n" +
      "        xref: false\n" +
      "        context: true\n" +
      "        dataset: true\n" +
      "        organism: false",
    function(done) {
      var testCoordinator = this;
      var test = this.test;

      test.expectedPath =
        __dirname +
        "/Agilent-A_23_P69058-xref-false-context-true-" +
        "dataset-true-organism-false.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" +
          process.env.MOCKSERVER_PORT +
          "/datasources.txt",
        context: testContext
      });

      bridgeDbInstance.entityReference
        .enrich(
          {
            identifier: "A_23_P69058",
            datasource_name: "Agilent"
          },
          {
            xref: false,
            context: true,
            dataset: true,
            organism: false
          }
        )
        .map(function(result) {
          expect(result.xref).to.not.exist;
          expect(result["@context"]).to.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.not.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by identifier/datasource_name\n" +
      "        xref: false\n" +
      "        context: true\n" +
      "        dataset: true\n" +
      "        organism: true",
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath =
        __dirname +
        "/Agilent-A_23_P69058-xref-false-context-true-" +
        "dataset-true-organism-true.jsonld";

      var bridgeDbInstance = new BridgeDb({
        baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
        //baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.entityReference
        .enrich(
          {
            identifier: "A_23_P69058",
            datasource_name: "Agilent"
          },
          {
            xref: false,
            context: true,
            dataset: true,
            organism: true
          }
        )
        .map(function(result) {
          expect(result.xref).to.not.exist;
          expect(result["@context"]).to.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by @id\n" +
      "        xref: false\n" +
      "        context: true\n" +
      "        dataset: true\n" +
      "        organism: false",
    function(done) {
      var testCoordinator = this;

      var test = this.test;
      test.expectedPath =
        __dirname +
        "/ncbigene-4292-xref-false-context-true-" +
        "dataset-true-organism-false.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.entityReference
        .enrich(
          [
            {
              "@id": "http://identifiers.org/ncbigene/4292"
            }
          ],
          {
            xref: false,
            context: true,
            dataset: true,
            organism: false
          }
        )
        .map(function(result) {
          expect(result.xref).to.not.exist;
          expect(result["@context"]).to.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.not.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by @id\n" +
      "        xref: false\n" +
      "        context: true\n" +
      "        dataset: true\n" +
      "        organism: true",
    function(done) {
      var testCoordinator = this;
      var test = this.test;

      test.expectedPath =
        __dirname +
        "/ncbigene-4292-xref-false-context-true-" +
        "dataset-true-organism-true.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.entityReference
        .enrich(
          [
            {
              "@id": "http://identifiers.org/ncbigene/4292"
            }
          ],
          {
            xref: false,
            context: true,
            dataset: true,
            organism: true
          }
        )
        .map(function(result) {
          expect(result.xref).to.not.exist;
          expect(result["@context"]).to.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by @id\n" +
      "        xref: true\n" +
      "        context: false\n" +
      "        dataset: true\n" +
      "        organism: false",
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath =
        __dirname +
        "/ncbigene-4292-xref-true-context-false-" +
        "dataset-true-organism-false.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.entityReference
        .enrich(
          [
            {
              "@id": "http://identifiers.org/ncbigene/4292"
            }
          ],
          {
            xref: true,
            context: false,
            dataset: true,
            organism: false
          }
        )
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .map(function(result) {
          expect(result.xref).to.exist;
          expect(result["@context"]).to.not.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.not.exist;
          return result;
        })
        .last()
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  it(
    "should enrich entity reference by @id\n" +
      "        xref: true\n" +
      "        context: false\n" +
      "        dataset: true\n" +
      "        organism: true",
    function(done) {
      var testCoordinator = this;
      var test = this.test;
      test.expectedPath =
        __dirname +
        "/ncbigene-4292-xref-true-context-false-" +
        "dataset-true-organism-true.jsonld";

      var bridgeDbInstance = new BridgeDb({
        //baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
        baseIri: "http://localhost:" + process.env.MOCKSERVER_PORT + "/",
        datasetsMetadataIri:
          //'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
          "http://localhost:" + process.env.MOCKSERVER_PORT + "/datasources.txt"
      });

      bridgeDbInstance.entityReference
        .enrich(
          [
            {
              "@id": "http://identifiers.org/ncbigene/4292"
            }
          ],
          {
            xref: true,
            context: false,
            dataset: true,
            organism: true
          }
        )
        .last()
        .map(function(currentXrefs) {
          return JSON.parse(
            JSON.stringify(currentXrefs).replace(
              new RegExp(bridgeDbInstance.config.baseIri, "g"),
              standardBridgeDbApiUrlStub
            )
          );
        })
        .map(function(result) {
          expect(result.xref).to.exist;
          expect(result["@context"]).to.not.exist;
          expect(result.isDataItemIn).to.exist;
          expect(result.organism).to.exist;
          return result;
        })
        .let(handleResult.bind(testCoordinator))
        .doOnError(done)
        .subscribeOnCompleted(done);
    }
  );

  /* TODO this one no longer works. do we want to still support this functionality?
  it('should enrich entity references using createEnrichmentStream, ' +
      'with options not specified so defaults used.',
      function(done) {
        var testCoordinator = this;

    lkgDataPath = __dirname +
          '/ncbigene-4292-and-bridgedb-L-1234.jsonld';
    lkgDataString = testUtils.getLkgDataString(lkgDataPath);

    var bridgeDbInstance2 = new BridgeDb({
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
