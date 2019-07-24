var BridgeDb = require("../../index.js");
var Rx = (global.Rx = require("rx-extra"));
var yolk = require("yolk");
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require("../render-in-document");

function doIt() {
  var bridgeDbUI = {
    DatasourceControl: require("../../lib/ui-components/datasource-control.js")
  };

  var datasourceInput$ = new Rx.Subject();

  var vnode = h(bridgeDbUI.DatasourceControl, {
    datasource: datasourceInput$
  });

  datasourceInput$.subscribe(function(datasourceInput) {
    console.log("datasourceInput");
    console.log(datasourceInput);
  }, console.error);

  var result = renderInDocument(vnode);

  var selectEl = window.document.querySelector("select");
  var datasourceOutput = Rx.Observable.fromEvent(selectEl, "change").map(
    function(x) {
      return x.target.value;
    }
  );

  datasourceOutput.subscribe(function(datasourceOutput) {
    console.log("datasourceOutput");
    console.log(datasourceOutput);

    console.log('window.document.querySelector("select").dataset');
    console.log(window.document.querySelector("select").dataset);
  }, console.error);
}

doIt.apply({});
