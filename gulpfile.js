var _ = require('lodash');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var File = require('vinyl');
var fs = require('vinyl-fs');
var git = require('gulp-git');
var gulp = require('gulp');
var bump = require('gulp-bump');
var highland = require('highland');

var inquirer = require('inquirer');
var createPromptStream = highland.wrapCallback(inquirer.prompt);

var jsdoc = require('gulp-jsdoc');
var jsdocOptions = require('./jsdoc-conf.json');
var JSONStream = require('JSONStream');
var nodeFs = require('fs');
var rename = require('gulp-rename');
var replace = require('gulp-regex-replace');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var oldPackageJson = require('./package.json');
var newPackageJson;
var versionType;

gulp.task('default', ['build']);

gulp.task('browserify', ['bump'], function() {

  var bundler = browserify({
    entries: ['./index.js'],
    debug: true
  });

  var bundle = function() {
    return bundler
      .bundle()
      .pipe(source(getBundleName() + '.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/'));
  };

  return bundle();
});

gulp.task('build', ['browserify', 'build-docs']);

// I don't think gulp-jsdoc is currently able to use an external conf.json.
// Until it does, we need to keep this task disabled
// and use the following command from the command line:
// jsdoc -t './node_modules/jaguarjs-jsdoc/' -c './jsdoc-conf.json' './lib/' -r './README.md' -d './docs/'
gulp.task('build-docs', ['bump'], function() {
  /*
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsdocOptions));
  //*/
});

gulp.task('bump', [
  'get-version-type',
  'bump-metadata-files',
  'bump-readme'
], function(callback) {
  return callback();
});

// Update bower, component, npm at once:
gulp.task('bump-metadata-files', ['get-version-type'], function(callback) {
  gulp.src([
    './bower.json',
    './component.json',
    './package.json'
  ])
  .pipe(bump({type: versionType}))
  .pipe(gulp.dest('./'))
  .pipe(highland.pipeline(function(s) {
    return s.map(function(file) {
      return file.contents;
      // TODO we should be able to use something like this
      // to make this code simpler, but it's not working:
      //return file.pipe(JSONStream.parse('*'));
    })
    .pipe(JSONStream.parse())
    // This is needed to turn the stream into a highland stream
    .pipe(highland.pipeline())
    .each(function(json) {
      // TODO this might not work if we have more than just the
      // package.json file. What happens if we add a bower.json file?
      newPackageJson = json;
      return callback(null, json);
    });
  }));
});

gulp.task('bump-readme', ['bump-metadata-files'], function() {
  return gulp.src('README.md')
    .pipe(replace({
      regex: oldPackageJson.version,
      replace: newPackageJson.version
    }))
    .pipe(gulp.dest('./'));
});

// get version type
gulp.task('get-version-type', function(callback) {
  highland(createPromptStream({
    type: 'list',
    name: 'versionType',
    message: 'Choose a version type below.',
    choices: ['patch', 'minor', 'major', 'prerelease']
  }))
  .errors(function(err, push) {
    // inquirer.prompt doesn't follow the node callback style convention
    // of passing error back as first argument, so this "error handling" is
    // required to pass along the actual response in addition to any errors.
    if (_.isPlainObject(err)) {
      // err is not actually an error! It's res.
      push(null, err);
    } else {
      // err is an error.
      push(err);
    }
  })
  .head()
  .each(function(res) {
    versionType = res.versionType;
    return callback(null, versionType);
  });
});

// steps for publishing new release
// 1. Need to be in master branch with no changes to commit.
// 1. Bump version in package.json (major/minor/patch)
//      major: Totally redid everything.
//      minor: Added functionality without breaking backwards compatibility.
//      patch: Fixed a bug.
// 2. Update version for browser installation in README
// 3. Build JS for dist
// 3. Build documentation
// 3. git add .
// 3. git commit -a -m "Bump version and build."
// 3. git tag -a v1.0.2 -m "Version message"
// 3. git push origin v1.0.2
// 3. git push origin master
// 3. git checkout gh-pages
// 3. git merge master
// 3. git push origin gh-pages
// 3. git checkout master
// 3. npm publish

var getBundleName = function() {
  var version = newPackageJson.version;
  var name = newPackageJson.name;
  return name + '-' + version + '.' + 'min';
};

// verify git is ready
function verifyGitStatus(args, callback) {
  var desiredBranch = args.branch;
  git.status({}, function(err, stdout) {
    // if (err) ...
    console.log(stdout.indexOf('On branch ' + desiredBranch));
  });
}
