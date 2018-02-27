import { chunk } from "lodash";
var hl = require("highland");
var Rx = require("rx-extra");

// TODO ~2^16 is what I observed as the approximate
// max size handled on my Macbook, but that's not a
// representative sample of what this could run on.
// What should this value be?
var MAX_CHUNK_SIZE_DEFAULT = Math.pow(2, 15);

// NOTE: not calling process.exit. See here:
// https://nodejs.org/api/process.html#process_process_exit_code
// https://nodejs.org/api/process.html#process_a_note_on_process_i_o

Rx.Observable.prototype.toNodeStream = function(
  maxChunkSize = MAX_CHUNK_SIZE_DEFAULT
) {
  var stream = hl();
  this
    /*
	.mergeMap(function(output) {
    const chunks = chunk(output, maxChunkSize).map(chars => chars.join(""));
    return Rx.Observable.from(chunks);
  })
  //*/
    .subscribe(
      function(chunk) {
        stream.write(chunk);
      },
      function(err) {
        stream.write(err);
        /*
        hl
          .fromError(new Error("Single Error"))
          .toCallback(function(err, result) {
            // err contains Error('Single Error') object
          });
        //*/
      },
      function() {
        stream.write(hl.nil);
      }
    );
  return stream;
};
