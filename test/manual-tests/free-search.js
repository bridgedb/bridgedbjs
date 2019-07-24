var _ = require("lodash");
var highland = require("highland");
var BridgeDb = require("../../index.js");

var bridgeDb1 = BridgeDb({
  baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
  datasetsMetadataIri:
    "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
});
//*
bridgeDb1.entityReference
  .freeSearch({
    attribute: "Nfkb1",
    organism: "Mouse"
  })
  .each(function(searchResults) {
    console.log("Result for Nfkb1");
    console.log(JSON.stringify(searchResults, null, "\t"));
  });
//*/

bridgeDb1.entityReference
  .freeSearch({
    attribute: "Agt",
    organism: "Mouse"
  })
  .each(function(searchResults) {
    console.log("bridgeDb1: Result for Agt");
    console.log(JSON.stringify(searchResults, null, "\t"));
  });

//*
var bridgeDb2 = BridgeDb({
  baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
  datasetsMetadataIri:
    "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
});

bridgeDb2.entityReference
  .freeSearch({
    attribute: "Agt",
    organism: "Mouse"
  })
  .each(function(searchResults) {
    console.log("bridgeDb2: Result for Agt");
    console.log(JSON.stringify(searchResults, null, "\t"));
  });
//*/
