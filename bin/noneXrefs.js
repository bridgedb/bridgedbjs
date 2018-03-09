var ndjson = require("ndjson");
var Rx = require("rx-extra");
require("../es5/spinoffs/pipeToStdout");
require("../es5/spinoffs/toNodeStream");
var VError = require("verror");

module.exports = function(
  bridgeDb,
  organism,
  xrefDataSource,
  xrefIdentifier,
  desiredXrefDataSources,
  options
) {
  var serialize = ndjson.serialize();
  bridgeDb
    .xrefs(organism, xrefDataSource, xrefIdentifier, desiredXrefDataSources)
    //.throughNodeStream(serialize)
    .mergeMap(function(xrefs) {
      return Rx.Observable
        .from(xrefs)
        .map(({ xrefDataSource, xrefIdentifier }) =>
          [xrefDataSource, xrefIdentifier].join("\t")
        );
    })
    .map(line => line + "\n")
    .pipeToStdout();
};
