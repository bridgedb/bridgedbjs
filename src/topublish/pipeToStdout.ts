import { chunk } from "lodash";
var Rx = require("rx-extra");

// TODO this value is what I observed as the approximate
// max size handled on my Macbook, but that's not a
// representative sample of what this could run on.
// What should this value be?
var MAX_CHUNK_SIZE_DEFAULT = Math.pow(2, 15);

Rx.Observable.prototype.pipeToStdout = function(
  maxChunkSize = MAX_CHUNK_SIZE_DEFAULT
) {
  this.subscribe(
    function(output) {
      chunk(output, maxChunkSize)
        .map(chars => chars.join(""))
        .forEach(strChunk => process.stdout.write(strChunk));
    },
    function(err) {
      console.error(err);
      process.exit(1);
    },
    function() {
      process.exit(0);
    }
  );
};
