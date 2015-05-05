var gulp = require('gulp');
var gulpSequence = require('gulp-sequence');

/* Task Steps
 * Manually commit in master, then this task will:
 * Build
 *  - Check git status for no changes
 *  - Bump metadata files version
 *  - Sync README with current version
 *  - Build docs / Browserify
 *  - Commit again with message "Bumped to version X.Y.Z. Built"
 *  - Create tag with new version
 * Publish
 */

gulp.task('build', gulpSequence('verify-git-status',
      'bump-version-number-in-files',
      ['browserify', 'build-docs'],
      'commit-after-build',
      'bump-git-tag'));
