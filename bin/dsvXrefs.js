var replaceStream = require("replacestream");
var _ = require("lodash/fp");
// TODO does csv follow this: https://tools.ietf.org/html/rfc4180
var csv = require("csv-streamify");
var hl = require("highland");
var Rx = require("rx-extra");
require("../es5/spinoffs/pipeToStdout");
require("../es5/spinoffs/toNodeStream");
var VError = require("verror");

const delimiterFor = {
  csv: ",",
  tsv: "\t"
};

function argType(arg) {
  if (_.isUndefined(arg)) {
    return "auto";
  } else if (_.isFinite(parseInt(arg))) {
    return "columnIndex";
  } else {
    return "string";
  }
}

const field = _.curry(function(headersEnabled, argType, parsedArg, row) {
  if (headersEnabled) {
    return parsedArg in row ? row[parsedArg] : parsedArg;
  } else {
    return argType === "string" ? parsedArg : row[parsedArg];
  }
});

module.exports = function(
  bridgeDb,
  organismArg,
  xrefDataSourceArg,
  xrefIdentifierArg,
  desiredXrefDataSources,
  options
) {
  const { insertionPoint } = options;
  var headersOption = options.hasOwnProperty("headers")
    ? Boolean(options.headers)
    : false;
  var delimiterOption =
    options.format in delimiterFor ? delimiterFor[options.format] : "\t";
  var newlineOption = options.newline || "\n";
  var quoteOption = options.quote || '"';
  var commentOption = options.comment || "#";

  const organismArgType = argType(organismArg);
  const xrefDataSourceArgType = argType(xrefDataSourceArg);
  const xrefIdentifierArgType = argType(xrefIdentifierArg);

  var organismColumn =
    organismArgType === "auto"
      ? 0
      : organismArgType === "columnIndex"
      ? parseInt(organismArg)
      : organismArg;

  var xrefDataSourceColumn =
    xrefDataSourceArgType === "auto"
      ? _.isFinite(parseInt(organismColumn))
        ? organismColumn + 1
        : 0
      : xrefDataSourceArgType === "columnIndex"
      ? parseInt(xrefDataSourceArg)
      : xrefDataSourceArg;

  var xrefIdentifierColumn =
    xrefIdentifierArgType === "auto"
      ? _.isFinite(parseInt(xrefDataSourceColumn))
        ? xrefDataSourceColumn + 1
        : 0
      : xrefIdentifierArgType === "columnIndex"
      ? parseInt(xrefIdentifierArg)
      : xrefIdentifierArg;

  const field3 = field(headersOption);
  const organismField = field3(organismArgType, organismColumn);
  const xrefDataSourceField = field3(
    xrefDataSourceArgType,
    xrefDataSourceColumn
  );
  const xrefIdentifierField = field3(
    xrefIdentifierArgType,
    xrefIdentifierColumn
  );

  var parser = csv({
    delimiter: delimiterOption,
    newline: newlineOption,
    quote: quoteOption,
    objectMode: true,
    columns: headersOption
  });

  var commentLineRe = new RegExp(
    `^${commentOption}.*$[${newlineOption}]?`,
    "gm"
  );
  Rx.Observable.fromNodeReadableStream(
    hl(process.stdin)
      // Ignore comments
      .through(replaceStream(commentLineRe, ""))
      .through(parser)
  )
    .mergeMap(function(row) {
      const organism = organismField(row);
      const xrefDataSource = xrefDataSourceField(row);
      const xrefIdentifier = xrefIdentifierField(row);
      /* TODO should we use this?
          .distinctUntilChanged(function(
            a,
            b
          ) {
            return (
              [a.xrefDataSource, a.xrefIdentifier].join() ===
              [b.xrefDataSource, b.xrefIdentifier].join()
            );
            //return JSON.stringify(a) === JSON.stringify(b);
          })
          //*/
      var mappedXrefs$ = bridgeDb.xrefs(
        organism,
        xrefDataSource,
        xrefIdentifier,
        desiredXrefDataSources
      );
      if (insertionPoint !== "none") {
        // wide format
        return mappedXrefs$.map(function(xrefs) {
          const xrefsField =
            quoteOption +
            xrefs
              .map(function(xref) {
                return [xref.xrefDataSource, xref.xrefIdentifier].join(":");
              })
              .join(delimiterOption) +
            quoteOption;

          const oldRow = headersOption ? _.values(row) : row;
          const rowOut = [];
          oldRow.splice(0, insertionPoint).forEach(function(field) {
            rowOut.push(field);
          });
          rowOut.push(xrefsField);
          oldRow.forEach(function(field) {
            rowOut.push(field);
          });

          return rowOut.join(delimiterOption);
        });
      } else {
        // long format
        return mappedXrefs$.mergeMap(function(xrefs) {
          const firstColumn =
            typeof xrefDataSourceOption !== "undefined"
              ? xrefIdentifier
              : [xrefDataSource, xrefIdentifier].join(delimiterOption);

          return Rx.Observable.from(xrefs).map(xref => {
            return [
              firstColumn,
              [xref.xrefDataSource, xref.xrefIdentifier].join(delimiterOption)
            ].join(delimiterOption);
          });
        });
      }
    })
    .map(line => line + newlineOption)
    .pipeToStdout();
};
