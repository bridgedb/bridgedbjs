var gulp = require('gulp');

//gulp.task('watch', ['setWatch', 'browserSync'], function() {
gulp.task('watch', ['setWatch'], function() {
	// Note: The browserify task handles js recompiling with watchify
	//gulp.watch('./lib/cross-platform-text/dist/lib/**', ['copy']);
  //gulp.watch('./lib/**', ['testDev']);

  // TODO add dependent files to watch
  gulp.watch('./lib/index.js', ['testIndex']);
  gulp.watch('./lib/entity-reference.js', ['testEntityReference']);
  gulp.watch('./lib/data-source.js', ['testDataSource']);
  gulp.watch('./lib/organism.js', ['testOrganism']);
  gulp.watch('./lib/xref.js', ['testXref']);
});
