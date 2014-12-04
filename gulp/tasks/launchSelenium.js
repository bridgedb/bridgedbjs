// This is just copy-pasted from another library.
// It hasn't been updated to work for bridgedbjs.
// TODO get it working for bridgedbjs.

/* launchSelenium task
   ---------------
*/

var seleniumLauncher = require('selenium-launcher')
  , gulp         = require('gulp')
  ;

gulp.task('launchSelenium', function() {
  return seleniumLauncher(function(er, selenium) {
    if (er) {
      selenium.kill();
      return console.log(er);
    }
    return selenium;
  });
});
