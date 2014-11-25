var _ = require('lodash');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var exec = require('child_process').exec;
var File = require('vinyl');
var fs = require('vinyl-fs');
var git = require('gulp-git');
var gulp = require('gulp');
var bump = require('gulp-bump');
var highland = require('highland');
var inquirer = require('inquirer');
var jsdoc = require('gulp-jsdoc');
var jsdocOptions = require('./jsdoc-conf.json');
var JSONStream = require('JSONStream');
var nodeFs = require('fs');
var rename = require('gulp-rename');
var replace = require('gulp-regex-replace');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var createGitCheckoutStream = highland.wrapCallback(git.checkout);
var createGitMergeStream = highland.wrapCallback(git.merge);
var createGitPushStream = highland.wrapCallback(git.push);
var createGitTagStream = highland.wrapCallback(git.tag);
var createPromptStream = highland.wrapCallback(inquirer.prompt);

var oldPackageJson = require('./package.json');
var newPackageJson;
var versionType;

var metadataFiles = [
  './bower.json',
  './component.json',
  './package.json'
];

gulp.task('default', ['build']);

gulp.task('browserify', ['bump-metadata-files'], function() {

  var bundler = browserify({
    entries: ['./index.js'],
    debug: true
  });

  var bundle = function() {
    return bundler
      .bundle()
      .pipe(source(getBundleName() + '.js'))
      .pipe(buffer())
      // Add transformation tasks to the pipeline here.
      .pipe(uglify())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist/'));
  };

  return bundle();
});

gulp.task('build', [
  'browserify',
  'build-docs'
], function(callback) {
  return callback();
});

gulp.task('build-docs', ['bump-readme'], function(callback) {
  // I think gulp-jsdoc currently cannot use an external conf.json.
  // Until it's confirmed that it does, we'll disable the gulp-jsdoc command
  // and use exec to run the command at the command line.
  /*
  gulp.src(['./lib/*.js', 'README.md'])
    .pipe(jsdoc.parser())
    .pipe(jsdoc.generator('./docs', {
      path: './node_modules/jaguarjs-jsdoc/'
    }, jsdocOptions));
  //*/

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

gulp.task('bump', [
  'bump-git'
], function(callback) {
  return callback();
});

// bump git
gulp.task('bump-git', ['build'], function bumpGit(callback) {
  // TODO remove gulpfile.js when done testing this
  gulp.src(['./dist/*', './docs/*', 'gulpfile.js'].concat(metadataFiles))
  .pipe(git.add())
  .pipe(git.commit('Bump version and build.'))
  .pipe(createGitTagStream('v' + newPackageJson.version,
          'Version ' + newPackageJson.version))
  /*
  .pipe(createGitPushStream('origin', 'master'))
  .pipe(createGitPushStream('origin', 'v' + newPackageJson.version))
  //*/
  .each(function(data) {
    return callback(null, data);
  });
});

// Update bower, component, npm at once:
gulp.task('bump-metadata-files', ['get-version-type'], function(callback) {
  gulp.src(metadataFiles)
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
gulp.task('get-version-type', ['verify-git-status'], function(callback) {
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

// publish to github repo, github pages and npm.
gulp.task('publish', ['bump-git'], function publish(callback) {
  highland(createGitPushStream('origin', 'master'))
  .errors(killStream)
  .pipe(createGitPushStream('origin', 'v' + newPackageJson.version))
  .errors(killStream)
  .pipe(createGitCheckoutStream('gh-pages'))
  .pipe(createGitMergeStream('master'))
  .pipe(createGitPushStream('origin', 'gh-pages'))
  .pipe(createGitCheckoutStream('master'))
  .head()
  .each(function(data) {
    return callback(null, data);
  });
  /*
  .flatMap(highland.wrapCallback(
    // TODO can this be refactored to be cleaner?
    function(data, callback) {
      git.tag('v' + newPackageJson.version,
        'Version ' + newPackageJson.version,
        function(err, stdout) {
          if (err) {
            throw err;
          }
          return callback(null, stdout);
        });
    }
  ))
  .map(function(stdout) {
    var gitStatusOk = (stdout === '');
    if (!gitStatusOk) {
      var message = 'Problem with creating local tag.';
      throw new Error(message);
    }
    return gitStatusOk;
  })
  .errors(killStream)
  .each(function(gitStatusOk) {
    console.log('gitStatusOk140');
    console.log(gitStatusOk);
    return callback(null, gitStatusOk);
  });

  git.push('origin', 'v' + newPackageJson.version, function(err) {
    //if (err) ...
  });

  // TODO make the following work async

  git.push('origin', 'master', function(err) {
    //if (err) ...
  });

  git.checkout('gh-pages', function(err) {
    //if (err) ...
  });

  git.merge('master', function(err) {
    //if (err) ...
  });

  git.push('origin', 'gh-pages', function(err) {
    //if (err) ...
  });

  git.checkout('master', function(err) {
    //if (err) ...
  });

  // TODO change this to publish to npm
  exec('echo "hello"', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
  //*/
});

gulp.task('test-exec', function(cb) {
  exec('echo "hello"', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// verify git is ready
gulp.task('verify-git-status', function verifyGitStatus(callback) {
  var desiredBranch = 'master';

  highland([{}])
  .flatMap(highland.wrapCallback(git.status))
  .errors(killStream)
  .map(function(stdout) {
    var inDesiredBranch = stdout.indexOf('On branch ' + desiredBranch) > -1;
    var nothingToCommit = stdout.indexOf('nothing to commit') > -1;
    var gitStatusOk = inDesiredBranch && nothingToCommit;
    if (!gitStatusOk) {
      var message = 'Please checkout master and ' +
        'commit all changes before bumping.';
      throw new Error(message);
    }
    return stdout;
  })
  .errors(killStream)
  .flatMap(highland.wrapCallback(
    // TODO why does this run before git.status, unless I use this
    // extra function?
    function(data, callback) {
      git.exec({args : 'diff master origin/master'}, function(err, stdout) {
        return callback(null, stdout);
      });
    }
  ))
  .map(function(stdout) {
    var gitStatusOk = (stdout === '');
    if (!gitStatusOk) {
      var message = 'local/master is ahead of and/or behind origin/master.' +
        ' Please push/pull before bumping.';
      throw new Error(message);
    }
    return gitStatusOk;
  })
  .errors(killStream)
  .each(function(gitStatusOk) {
    console.log('gitStatusOk1043');
    console.log(gitStatusOk);
    return callback(null, gitStatusOk);
  });

  /*
  // TODO what if there are merge conflicts?
  git.pull('origin', 'master', function(err) {
    //if (err) ...
    return callback(null, gitStatusOk);
  });
  //*/
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

function killStream(err, push) {
  console.error(err);
  if (_.isString(err)) {
    // err is not of the JS type "error".
    err = new Error(err);
  } else if (_.isPlainObject(err)) {
    // err is not of the JS type "error".
    var jsError = new Error(err.msg || err.message || 'Error');
    _.assign(jsError, err);
    err = jsError;
  }

  // Using process.exit is a kludge to stop everything in this case.
  process.exit(1);
  // It would seem that Highland could kill the stream by
  // using some combination of the commented-out options below,
  // but in reality, at least with this version of Highland,
  // none of those options stop the stream.
  // Unless we use process.exit, the stream will continue, e.g.,
  // git diff below will still run.
  //stream.destroy();
  //push(err);
  //throw err;
}
