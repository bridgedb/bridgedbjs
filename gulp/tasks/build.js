var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

/* Manually commit in master
 * Build
 *   Check git status for no changes
 *   Bump metadata files version
 *   Sync README with current version
 *   Build docs / Browserify
 *   Commit again with message "Bumped to version X.Y.Z. Built"
 *   Create tag with new version
 * Publish
 */

gulp.task('build', gulpSequence('verify-git-status',
      'bump-metadata-files',
      ['browserify', 'build-docs'],
      'sync-git-version'));
