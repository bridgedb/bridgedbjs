// NOTE: this works without mock-server

var Rx = (global.Rx = global.Rx || require("rx-extra"));
var yolk = require("yolk");
var h = yolk.h;
//var renderInDocument = require('../render-in-document');
var render = yolk.render;

var fs = require("fs");
var insertCss = require("insert-css");

var jsonldMarkup = require("jsonld-markup");
var noop = function() {};

var latestBridgeDbCommitHash = "d01b14ea4924a421cf2c604fb550f63cd51d99cf";
var context = [
  "https://cdn.rawgit.com/bridgedb/BridgeDb/",
  latestBridgeDbCommitHash,
  "/org.bridgedb.rdf/resources/jsonld-context.jsonld"
].join("");

var BridgeDbUIElement = require("../../lib/ui-components");

[fs.readFileSync(require.resolve("jsonld-markup/jsonld-markup.css"))].map(
  insertCss
);

var entity = {
  "@context": context["@context"],
  organism: "Mus musculus",
  type: ["gpml:GeneProduct"],
  datasource_name: "Ensembl",
  identifier: "Pdha1",
  name: "pyruvate dehydrogenase E1 alpha 1",
  displayName: "Pdha1",
  entityReference: {
    type: ["biopax:Gene"],
    isDataItemIn: {
      id: "http://identifiers.org/ensembl/"
    }
  }
};

var vnode = h(
  "div",
  {},
  h(BridgeDbUIElement, {
    entity: entity,
    onChange: function(updatedEntity) {
      console.log("updatedEntity");
      console.log(updatedEntity);
      var code = document.querySelector("code");
      var data = JSON.parse(JSON.stringify(updatedEntity));
      var context = data.entityReference["@context"];
      delete data["@context"];
      delete data.entityReference["@context"];
      code.innerHTML = jsonldMarkup(data, context);
    },
    organism: entity.organism
  }),
  h(
    "pre",
    {},
    h("code", {}, "Change a value above and then view JSON result here")
  )
);

//var result = renderInDocument(vnode);

var document = require("global/document");
var node = document.createElement("div");
document.body.appendChild(node);
render(vnode, node);
