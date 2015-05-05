var exec = require('child_process').exec;
var gulp = require('gulp');
var killStream = require('../util/kill-stream.js');

gulp.task('build-docs', function(callback) {
  // I think gulp-jsdoc currently cannot use an external conf.json.
  // Until it's confirmed that it does, we'll disable the gulp-jsdoc command
  // and use exec instead to run the command at the command line.
  /*
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsdocOptions));
  //*/

  //jsdoc -t "./node_modules/jaguarjs-jsdoc/" -c "./jsdoc-conf.json" "./lib/" -r "./README.md" -d "./docs/"

  exec('jsdoc -t "./node_modules/jaguarjs-jsdoc/" -c ' +
    '"./jsdoc-conf.json" "./lib/" -r "./README.md" -d "./docs/"',
    function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      return callback(err, stdout);
      // TODO why does using @private give an error?
      // We can't use stderr as err until we handle that.
      //return callback(err || stderr, stdout);
    });
});
