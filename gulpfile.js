var _ = require('lodash');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var File = require('vinyl');
var fs = require('vinyl-fs');
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

var packageAtStart = require('./package.json');

function getCurrentPackage() {
  return JSON.parse(nodeFs.readFileSync('./package.json', {
    encoding: 'utf8'
  }));
}

gulp.task('build', ['browserify', 'build-docs']);

// I don't think gulp-jsdoc is currently able to use an external conf.json.
// Until it does, we need to keep this task disabled
// and use the following command from the command line:
// jsdoc -t './node_modules/jaguarjs-jsdoc/' -c './jsdoc-conf.json' './lib/' -r './README.md' -d './docs/'
gulp.task('build-docs', function() {
  /*
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsdocOptions));
  //*/
});

var getBundleName = function() {
  var currentPackage = getCurrentPackage();
  var version = currentPackage.version;
  var name = currentPackage.name;
  return name + '-' + version + '.' + 'min';
};

gulp.task('browserify', function() {

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

// Update bower, component, npm at once:
gulp.task('bumpMetadataFiles', function(callback) {
  highland(createPromptStream({
    type: 'list',
    name: 'versionType',
    message: 'Choose a version type below.',
    choices: ['patch', 'minor', 'major']
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
  .each(function(res) {
    gulp.src([
      './bower.json',
      './component.json',
      './package.json'
    ])
    .pipe(bump({type: res.versionType}))
    .pipe(gulp.dest('./'))
    /*
    var tap = require('gulp-tap');
    .pipe(tap(function(file, t) {
      return t;
    }))
    //*/
    .pipe(highland.pipeline(function(s) {
      console.log('s1');
      console.log(s);
      return s.map(function(file) {
        console.log('file');
        console.log(file);
        //return file.pipe(JSONStream.parse('*'));
        return file.contents;
      })
      .pipe(JSONStream.parse('version'))
      .pipe(highland.pipeline(function(s) {
        console.log('s2');
        console.log(s);
        return s.head();
        /*
        return s.map(function(json) {
          console.log('json');
          console.log(json);
          return json;
        });
        //*/
      }))
      .each(function(json) {
        console.log('json');
        console.log(json);
        return json;
      });
    }));
    /*
    .pipe(highland.pipeline(function(s) {
      return s.map(function(buf) {
        console.log('buf');
        console.log(buf);
        console.log(Buffer.isBuffer(buf));
        console.log(buf.toString('utf-8'));
        return buf;
      })
      .through(JSONStream.parse('*'))
      // You can remove collect() here if you don't care about
      // when one CSV file ends and the next begins.
      // Without collect(), the rows of data, parsed as JSON,
      // will flow through, one by one, on a single stream.
      // With collect(), the parsed rows from each CSV file
      // will be collected into a JSON array before being
      // passed along, one array per file.
      .collect()
      .each(function(buf) {
        callback();
      });
    }));
    //*/
  });
  //*/
});

gulp.task('bumpReadMe', ['bumpMetadataFiles'], function() {
  return gulp.src('README.md')
    .pipe(replace({
      regex: packageAtStart.version,
      replace: getCurrentPackage().version
    }))
    .pipe(gulp.dest('./'));
});

// steps for publishing new release
// 1. Need to be in master branch
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

gulp.task('default', ['bumpMetadataFiles', 'bumpReadMe', 'build']);
