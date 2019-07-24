#!/usr/bin/env node

var http = require("http");
var mockserver = require("mockserver");
var argv = require("yargs").argv;
var colors = require("colors");
var info = require("mockserver/package.json");
var path = require("path");

// TODO use package.json finder to get path to test dir
var mocks = argv.m || argv.mocks || path.join(__dirname, "../../../test/mocks");
var port = argv.p || argv.port || 4522;
var verbose = !(argv.hasOwnProperty("q")
  ? argv.q
  : argv.hasOwnProperty("quiet")
  ? argv.quiet
  : false);

if (!mocks || !port) {
  console.log(
    [
      "Mockserver v" + info.version,
      "",
      "Usage:",
      "  mockserver [-q] -p PORT -m PATH",
      "",
      "Options:",
      "  -p, --port=PORT    - Port to listen on",
      "  -m, --mocks=PATH   - Path to mock files",
      "  -q, --quiet        - Do not output anything",
      "",
      "Example:",
      "  mockserver -p 8080 -m './mocks'"
    ].join("\n")
  );
} else {
  http.createServer(mockserver(mocks, verbose)).listen(port);

  if (verbose) {
    console.log(
      "Mockserver serving mocks {" +
        "verbose"["yellow"] +
        ":" +
        ((verbose && "true"["green"]) || "false") +
        '} under "' +
        mocks.green +
        '" at ' +
        "http://localhost:"["green"] +
        port.toString()["green"]
    );
  }
}
