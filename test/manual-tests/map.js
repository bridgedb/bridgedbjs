var BridgeDb = require("../../index.js");

var bridgeDb1 = BridgeDb({
  baseIri: "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/",
  datasetsMetadataIri:
    "http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php"
});

//*
bridgeDb1.entityReference
  .map({
    sourceEntityReference: "http://identifiers.org/uniprot/P38398",
    targetPreferredPrefix: "ncbigene"
  })
  .each(function(targetEntityReference) {
    console.log(JSON.stringify(targetEntityReference, null, "\t"));
  });
//*/
