var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var BridgeDb = require("../es5/BridgeDb").BridgeDb;
var hl = require("highland");
var ndjson = require("ndjson");
var JSONStream = require("JSONStream");
var Rx = require("rx-extra");
require("../es5/spinoffs/pipeToStdout");
require("../es5/spinoffs/toNodeStream");
var VError = require("verror");
var dsvXrefs = require("./dsvXrefs");
var jsonXrefs = require("./jsonXrefs");
var noneXrefs = require("./noneXrefs");

const DEFAULT_ADDMAPPEDXREFS_BASE = ".";

const xrefsForFormat = {
  csv: dsvXrefs,
  json: jsonXrefs,
  none: noneXrefs,
  tsv: dsvXrefs
};

const helpTextDescriptions = [
  {
    name: "dsv",
    formats: ["tsv", "csv"]
  },
  {
    name: "json",
    formats: ["json"]
  },
  {
    name: "none",
    formats: ["none"]
  }
].map(function({ name, formats }) {
  return {
    path: path.join(__dirname, name + "Xrefs" + ".help.sh"),
    formats: formats
  };
});

module.exports = function createXrefsCLI(program) {
  program
    .command(
      `xrefs <organism> <xrefDataSource> <xrefIdentifier> [desiredXrefDataSource...]`
    )
    .description(
      `Get alternate xrefs (datasource identifiers) and
    optionally insert them into to your json, csv or tsv.

    For example, ensembl:ENSG00000132031 -> ncbigene:4148 and uniprot:O15232

    The xrefs come from BridgeDb.
    `
    )
    .option(
      "-f,--format [string]",
      `Input format, e.g., none, json, csv, tsv. Default: none`,
      format => (!!format ? format : "none")
    )
    .option(
      "-i,--insertion-point [path]",
      `Where to add alternate mapped xrefs`
    )
    .option(
      "-b,--base [path]",
      `(json only) prepended to all other paths. Default: "${DEFAULT_ADDMAPPEDXREFS_BASE}"
                                Similar in concept to HTML and XML BASE. More info:
                                https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
                                https://www.w3.org/TR/xmlbase/`,
      base => (!!base ? base : DEFAULT_ADDMAPPEDXREFS_BASE)
    )
    // DSV options
    .option(
      "--headers [boolean]",
      "(tsv/csv only) Does first row of input file contain headers? Default: false"
    )
    /* handled by specifying format tsv or csv
    .option(
      "-d, --delimiter [string]",
      'Delimiter for file, e.g., "," or "\\t". Default: "\\t"'
    )
    //*/
    .option(
      "-n, --newline [string]",
      '(tsv/csv only) New line character for file, e.g., "\\n" or "\\r\\n". Default: "\\n"'
      // (use \r\n for CRLF files)
    )
    .option(
      "-q, --quote [string]",
      `(tsv/csv only) Quote character for file, e.g., '"'. Default: '"'`
    )
    .option(
      "-c, --comment [string]",
      `(tsv/csv only) Comment character for file, e.g., "#" or "''". Default: '#'`
    )
    .action(function(
      organismArg,
      xrefDataSourceArg,
      xrefIdentifierArg,
      desiredXrefDataSources,
      optionsRaw
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Using development mock server.");
        var bridgeDb = new BridgeDb({
          //baseIri: "http://localhost:4522/",
          dataSourcesHeadersIri:
            "http://localhost:4522/datasources_headers.txt",
          dataSourcesMetadataIri: "http://localhost:4522/datasources.txt"
        });
        //*/
      } else {
        var bridgeDb = new BridgeDb();
      }

      const options = _.defaults(optionsRaw, {
        base: DEFAULT_ADDMAPPEDXREFS_BASE,
        insertionPoint: "none",
        format: "none"
      });

      const { format } = options;

      if (format in xrefsForFormat) {
        xrefsForFormat[format](
          bridgeDb,
          organismArg,
          xrefDataSourceArg,
          xrefIdentifierArg,
          desiredXrefDataSources,
          options
        );
      } else {
        throw new VError(`Unrecognized format: ${format}`);
      }
    })
    .on("--help", function() {
      console.log(`
For organism, xrefDataSource and xrefIdentifier, you can specify either one of these:
* the actual value to use, e.g., "Human"
* the path to it in your data, e.g.,
  * ".data.organism" for json
  * "0" (column index) or "organism" (column header) for tsv or csv

organism: the species for the gene or protein. For metabolites,
          this is a dummy variable -- just enter "Human".

xrefDataSource: the data source (AKA database or namespace) responsible for creating
                the type of identifier in your data, e.g., "Entrez Gene" or "ensembl"

xrefIdentifier: gene, protein or metabolite identifier, e.g., "1234" or "ENSG00000164344"

desiredXrefDataSource: limit results to a single data source, e.g., "ensembl", or
                        to multiple data sources, e.g.,
                        "ensembl" "uniprot" "hgnc.symbol"
      `);

      console.log(
        helpTextDescriptions
          .map(function({ path, formats }) {
            const helpText = fs
              .readFileSync(path, "utf8")
              // We drop the shebang when displaying here as help
              .replace(/^.*\n/, "")
              // We also drop bash comment characters
              .replace(/^#(\ )?/gm, "")
              // and replace path to bridgedb with just bridgedb
              .replace(/(\.\/)?bin\/(bridgedb)/gm, "$2");
            return [`For format ${formats.join(" or ")}:`, helpText].join("\n");
          })
          .join("\n")
      );
    });
};
