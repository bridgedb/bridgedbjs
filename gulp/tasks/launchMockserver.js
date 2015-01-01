var freeport = require('freeport');
var gulp = require('gulp');
var highland = require('highland');
var http    =  require('http');
var mockserver  =  require('mockserver');

function getPort(callback) {
  if (typeof process.env.MOCKSERVER_PORT !== 'undefined') {
    return callback(null, process.env.MOCKSERVER_PORT);
  }

  freeport(function(err, port) {
    if (err) {
      throw err;
    }
    return callback(null, port);
  });
}

var createFreePortStream = highland.wrapCallback(getPort);

// TODO there must be a better way to do this.
// I want to close the server when any/all tests are complete.
function gracefullyCloseServer(server) {
  setTimeout(function() {
    var connectionCount = server._connections;
    if (connectionCount > 0) {
      return gracefullyCloseServer(server);
    }

    return server.close();
  }, 1000);
}

gulp.task('launchMockserver', function(done) {
  if (!!process.env.MOCKSERVER_PORT) {
    return done();
  }

  highland(createFreePortStream())
  .map(function(port) {
    process.env.MOCKSERVER_PORT = port;
    return http.createServer(
      mockserver(__dirname + '/../../test/input-data/')
    ).listen(port);
  })
  .each(function(server) {
    gracefullyCloseServer(server);
    return done();
  });
});
