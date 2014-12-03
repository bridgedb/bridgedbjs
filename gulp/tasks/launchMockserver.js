var freeport = require('freeport');
var gulp = require('gulp');
var highland = require('highland');

function getPort(callback) {
  console.log('process.env.MOCKSERVER_PORT');
  console.log(process.env.MOCKSERVER_PORT);
  if (typeof process.env.MOCKSERVER_PORT !== 'undefined') {
    return callback(null, process.env.MOCKSERVER_PORT);
  }

  freeport(function(err, port) {
    console.log('err');
    console.log(err);
    console.log('port');
    console.log(port);
    if (err) {
      throw err;
    }
    return callback(null, port);
  });
}

gulp.task('launchMockserver', function(done) {
  gulp.src(
    ['./test/unit/data-source-test.js']
    //['']
  )
  .pipe(highland.pipeline(function(s) {
    return s.map(highland.wrapCallback(getPort()))
    .map(function(port) {
      console.log('port');
      console.log(port);
      return port;
    });
  }))
  .on('error', console.warn.bind(console))
  .on('error', function(err) {
    console.log('Error');
    console.log(err);
    //throw err;
  })
  .on('end', function() {
    console.log('Mock server launched.');
    return done();
  });
});
