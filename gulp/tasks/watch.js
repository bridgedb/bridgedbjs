var gulp = require('gulp');

// The commented-out line was just copy-pasted from another library.
// It hasn't been updated to work for bridgedbjs.
// TODO get it working for bridgedbjs and/or delete it.

//gulp.task('watch', ['setWatch', 'browserSync'], function() {
gulp.task('watch', ['setWatch'], function() {
  // TODO add dependent files to watch
  gulp.watch('./lib/index.js', ['testAllLocally']);
  gulp.watch('./lib/config.js', ['testAllLocally']);
  gulp.watch('./lib/entity-reference.js', ['testEntityReference']);
  gulp.watch('./lib/dataset.js', ['testDataset']);
  gulp.watch('./lib/organism.js', ['testOrganism']);
  gulp.watch('./lib/xref.js', ['testXref']);
});
