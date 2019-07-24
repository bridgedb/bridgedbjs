var $ = require("jquery");

var Rx = (global.Rx = require("rx-extra"));

var yolk = require("yolk");
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require("../../render-in-document");

var BridgeDb = require("../../../lib/main.js");
process.env.MOCKSERVER_PORT = 4522;

var bridgeDbUI = {
  DatasourceControl: require("../../../lib/ui-components/datasource-control.js")
};

var timeout = 300;

function fireEvent(node, eventName) {
  // Make sure we use the ownerDocument from the provided node to avoid cross-window problems
  var doc;
  var event;
  if (node.ownerDocument) {
    doc = node.ownerDocument;
  } else if (node.nodeType == 9) {
    // the node may be the document itself, nodeType 9 = DOCUMENT_NODE
    doc = node;
  } else {
    throw new Error("Invalid node passed to fireEvent: " + node.id);
  }

  if (node.dispatchEvent) {
    // Gecko-style approach (now the standard) takes more work
    var eventClass = "";

    // Different events have different event classes.
    // If this switch statement can't map an eventName to an eventClass,
    // the event firing is going to fail.
    switch (eventName) {
      // Dispatching of 'click' appears to not work correctly in Safari.
      // Use 'mousedown' or 'mouseup' instead.
      case "click":
      case "mousedown":
      case "mouseup":
        eventClass = "MouseEvents";
        break;

      case "focus":
      case "change":
      case "blur":
      case "select":
        eventClass = "HTMLEvents";
        break;

      default:
        throw "fireEvent: Couldn't find an event class for event '" +
          eventName +
          "'.";
    }
    event = doc.createEvent(eventClass);

    var bubbles = eventName == "change" ? false : true;
    event.initEvent(eventName, bubbles, true); // All events created as bubbling and cancelable.

    event.synthetic = true; // allow detection of synthetic events
    // The second parameter says go ahead with the default action
    node.dispatchEvent(event, true);
  } else if (node.fireEvent) {
    // IE-old school style
    event = doc.createEventObject();
    event.synthetic = true; // allow detection of synthetic events
    node.fireEvent("on" + eventName, event);
  }
}

describe("create a datasource select (dropdown) element", function() {
  //  it('creates a simple clicker', function() {
  //    function MyComponent(args) {
  //      var createEventHandler = args.createEventHandler;
  //      var handleClick = createEventHandler();
  //
  //      var numberOfClicks = handleClick
  //      .scan(function(acc, ev) {
  //        return acc + 1;
  //      }, 0)
  //      .startWith(0);
  //
  //      return h('.my-counter-component', {},
  //        h('span#counter', {}, 'Number of clicks: ', numberOfClicks),
  //        h('button#clicker', {onClick: handleClick}, 'Click me!')
  //      );
  //    }
  //
  //    var vnode = h(MyComponent);
  //    var result = renderInDocument(vnode);
  //    var node = result.node;
  //    var cleanup = result.cleanup;
  //
  //    assert.equal(node.tagName, 'DIV');
  //
  //    var $node = $(node);
  //    var $clicker = $node.find('#clicker');
  //    $clicker.trigger('click');
  //
  //    var $counter = $node.find('#counter');
  //    assert.equal($counter.text(), 'Number of clicks: 1');
  //
  //    cleanup();
  //  });

  describe("when entity type is NOT specified", function() {
    it("select when datasource is NOT pre-selected", function(done) {
      var vnode = h(bridgeDbUI.DatasourceControl);
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      setTimeout(function() {
        assert.equal(node.tagName, "SELECT");

        var $node = $(node);

        assert.equal($node.find("option:selected").text(), "Select datasource");

        $node.val("http://identifiers.org/ncbigene/");
        assert.equal($node.find("option:selected").text(), "Entrez Gene");

        $node.val("http://identifiers.org/wikipathways/");
        assert.equal($node.find("option:selected").text(), "WikiPathways");

        // for some reason, yolk does not seem to respond to
        // either of the jQuery triggers below,
        // but it does respond to fireEvent.
        // It also responds to $node.trigger('click')
        //$node.val('http://identifiers.org/chembl.compound/').trigger('change');
        //$node.val('http://identifiers.org/chembl.compound/').change();
        $node.val("http://identifiers.org/chembl.compound/");
        fireEvent($node[0], "change");
        assert.equal($node.find("option:selected").text(), "ChEMBL compound");

        cleanup();
        done();
      }, timeout);
    });

    it("select when datasource is pre-selected", function(done) {
      var selectedDatasource$ = new Rx.Subject();
      var vnode = h(bridgeDbUI.DatasourceControl, {
        datasource: selectedDatasource$
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      var $node = $(node);

      selectedDatasource$.onNext({
        id: "http://identifiers.org/ensembl/"
      });

      setTimeout(function() {
        assert.equal(node.tagName, "SELECT");

        assert.equal($node.find("option:selected").text(), "Ensembl");

        // For some reason, yolk does not seem to respond to
        // either of the jQuery triggers below,
        // but it does respond to fireEvent.
        //
        //$node.val('http://identifiers.org/ncbigene/').trigger('change');
        //$node.val('http://identifiers.org/ncbigene/').change();
        //
        // Also, it responds to $node.trigger('click'), but not $node.trigger('change');
        $node.val("http://identifiers.org/ncbigene/");
        fireEvent($node[0], "change");
        assert.equal($node.find("option:selected").text(), "Entrez Gene");

        $node.val("http://identifiers.org/wikipathways/");
        fireEvent($node[0], "change");
        assert.equal($node.find("option:selected").text(), "WikiPathways");

        $node.val("http://identifiers.org/chembl.compound/");
        fireEvent($node[0], "change");
        assert.equal($node.find("option:selected").text(), "ChEMBL compound");

        cleanup();
        done();
      }, timeout);
    });

    it("enable and then select", function(done) {
      var disabled$ = new Rx.Subject();
      var vnode = h(bridgeDbUI.DatasourceControl, {
        disabled: disabled$
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      var $node = $(node);

      disabled$.onNext(true);

      setTimeout(function() {
        assert.equal(node.tagName, "SELECT");

        assert.equal($node.prop("disabled"), true);

        setTimeout(function() {
          disabled$.onNext(false);

          assert.equal(
            $node.find("option:selected").text(),
            "Select datasource"
          );
          assert.equal($node.prop("disabled"), false);

          $node.val("http://identifiers.org/ncbigene/");
          assert.equal($node.find("option:selected").text(), "Entrez Gene");

          $node.val("http://identifiers.org/wikipathways/");
          assert.equal($node.find("option:selected").text(), "WikiPathways");

          $node.val("http://identifiers.org/chembl.compound/");
          assert.equal($node.find("option:selected").text(), "ChEMBL compound");

          cleanup();
          done();
        }, timeout);
      }, timeout);
    });

    it("programmatically set datasource", function(done) {
      var selectedDatasource$ = new Rx.Subject();
      var vnode = h(bridgeDbUI.DatasourceControl, {
        datasource: selectedDatasource$
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      var $node = $(node);

      selectedDatasource$.onNext({
        id: "http://identifiers.org/ensembl/"
      });

      setTimeout(function() {
        assert.equal(node.tagName, "SELECT");

        assert.equal($node.find("option:selected").text(), "Ensembl");

        cleanup();
        done();
      }, timeout);
    });

    it("programmatically set datasource and then programmatically update", function(done) {
      var selectedDatasource$ = new Rx.Subject();
      var vnode = h(bridgeDbUI.DatasourceControl, {
        datasource: selectedDatasource$
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      selectedDatasource$.onNext({
        id: "http://identifiers.org/ensembl/"
      });

      var $node = $(node);

      assert.equal(node.tagName, "SELECT");

      setTimeout(function() {
        assert.equal($node.find("option:selected").text(), "Ensembl");

        selectedDatasource$.onNext({
          id: "http://identifiers.org/ensembl/"
        });

        assert.equal($node.find("option:selected").text(), "Ensembl");

        setTimeout(function() {
          assert.equal($node.find("option:selected").text(), "Ensembl");

          selectedDatasource$.onNext({
            id: "http://identifiers.org/ncbigene/"
          });

          assert.equal($node.find("option:selected").text(), "Entrez Gene");

          setTimeout(function() {
            assert.equal($node.find("option:selected").text(), "Entrez Gene");

            cleanup();
            done();
          }, timeout);
        }, timeout);
      }, timeout);
    });

    it("programmatically set datasource and then select", function(done) {
      var selectedDatasource$ = new Rx.Subject();
      var vnode = h(bridgeDbUI.DatasourceControl, {
        datasource: selectedDatasource$
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      selectedDatasource$.onNext({
        id: "http://identifiers.org/ensembl/"
      });

      var $node = $(node);

      assert.equal(node.tagName, "SELECT");

      setTimeout(function() {
        assert.equal($node.find("option:selected").text(), "Ensembl");

        $node.val("http://identifiers.org/ensembl/");
        fireEvent($node[0], "change");
        assert.equal($node.find("option:selected").text(), "Ensembl");

        setTimeout(function() {
          assert.equal($node.find("option:selected").text(), "Ensembl");

          $node.val("http://identifiers.org/ncbigene/");
          fireEvent($node[0], "change");
          assert.equal($node.find("option:selected").text(), "Entrez Gene");

          setTimeout(function() {
            assert.equal($node.find("option:selected").text(), "Entrez Gene");

            cleanup();
            done();
          }, timeout);
        }, timeout);
      }, timeout);
    });
  });

  describe("when entity type is gpml:Pathway", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:Pathway"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          $pathwaySelection.trigger("click");
          assert.equal($pathwaySelection.text(), "WikiPathways");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is Subject", function(done) {
        var entityReferenceType$ = new Rx.Subject();
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: entityReferenceType$
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        entityReferenceType$.onNext(["gpml:Pathway"]);

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          $pathwaySelection.trigger("click");
          assert.equal($pathwaySelection.text(), "WikiPathways");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:Pathway"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          $pathwaySelection.trigger("click");
          assert.equal($pathwaySelection.text(), "WikiPathways");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is biopax:Pathway", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["biopax:Pathway"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          $pathwaySelection.trigger("click");
          assert.equal($pathwaySelection.text(), "WikiPathways");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is gpml:Protein", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:Protein"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:Protein"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is biopax:Protein", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["biopax:Protein"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is gpml:Rna", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:Rna"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:Rna"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is biopax:Rna", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["biopax:Rna"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is gpml:GeneProduct", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:GeneProduct"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:GeneProduct"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });

    describe("when datasource is pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/ensembl/"
          }),
          entityReferenceType: Rx.Observable.return(["gpml:GeneProduct"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "Ensembl");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/ensembl/"
          }),
          entityReferenceType: ["gpml:GeneProduct"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "Ensembl");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.length, 0);

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is gpml:Complex", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:Complex"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.text(), "WikiPathways");

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:Complex"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.text(), "WikiPathways");

          cleanup();
          done();
        }, timeout);
      });
    });

    describe("when datasource is pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/ensembl/"
          }),
          entityReferenceType: Rx.Observable.return(["gpml:Complex"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "Ensembl");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.text(), "WikiPathways");

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/ensembl/"
          }),
          entityReferenceType: ["gpml:Complex"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "Ensembl");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          $geneSelection.trigger("click");
          assert.equal($geneSelection.text(), "Entrez Gene");

          var $rnaSelection = $node.find(
            '[value="http://identifiers.org/mirbase/"]'
          );
          $rnaSelection.trigger("click");
          assert.equal($rnaSelection.text(), "miRBase Sequence");

          var $proteinSelection = $node.find(
            '[value="http://identifiers.org/uniprot/"]'
          );
          $proteinSelection.trigger("click");
          assert.equal($proteinSelection.text(), "UniProtKB/TrEMBL");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $pathwaySelection = $node.find(
            '[value="http://identifiers.org/wikipathways/"]'
          );
          assert.equal($pathwaySelection.text(), "WikiPathways");

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is gpml:Metabolite", function() {
    describe("when datasource is NOT pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: Rx.Observable.return(["gpml:Metabolite"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          entityReferenceType: ["gpml:Metabolite"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });

    describe("when datasource is pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/cas/"
          }),
          entityReferenceType: Rx.Observable.return(["gpml:Metabolite"])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "CAS");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/cas/"
          }),
          entityReferenceType: ["gpml:Metabolite"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "CAS");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });

  describe("when entity type is biopax:SmallMoleculeReference", function() {
    describe("when datasource is pre-selected", function() {
      it("select when prop is Observable", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/cas/"
          }),
          entityReferenceType: Rx.Observable.return([
            "biopax:SmallMoleculeReference"
          ])
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "CAS");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });

      it("select when prop is array", function(done) {
        var vnode = h(bridgeDbUI.DatasourceControl, {
          datasource: Rx.Observable.return({
            id: "http://identifiers.org/cas/"
          }),
          entityReferenceType: ["biopax:SmallMoleculeReference"]
        });
        var result = renderInDocument(vnode);
        var node = result.node;
        var cleanup = result.cleanup;

        setTimeout(function() {
          assert.equal(node.tagName, "SELECT");

          var $node = $(node);

          var $initialSelection = $node.find("option:selected");
          assert.equal($initialSelection.text(), "CAS");

          var $metaboliteSelection = $node.find(
            '[value="http://identifiers.org/chembl.compound/"]'
          );

          $metaboliteSelection.trigger("click");
          assert.equal($metaboliteSelection.text(), "ChEMBL compound");

          var $geneSelection = $node.find(
            '[value="http://identifiers.org/ncbigene/"]'
          );
          assert.equal($geneSelection.length, 0);

          cleanup();
          done();
        }, timeout);
      });
    });
  });
});
