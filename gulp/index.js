var fs = require('fs');
var killStream = require('./util/kill-stream.js');
var onlyScripts = require('./util/scriptFilter');
var tasks = fs.readdirSync('./gulp/tasks/').filter(onlyScripts);

tasks.forEach(function(task) {
  require('./tasks/' + task);
});

/*
var exec = require('child_process').exec;
gulp.task('test-exec', function(cb) {
  exec('echo "hello"', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});
//*/
