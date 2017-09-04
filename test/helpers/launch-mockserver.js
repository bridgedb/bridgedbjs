var http    =  require('http');
var mockserver  =  require('mockserver');

var server = http.createServer(mockserver(__dirname + '/input-data/'))
.listen(4522);

server.on('request', function(req, res) {
  console.log('method: ' + req.method);
  console.log('url: ' + req.url);
  console.log('headers: ');
  console.log(req.headers);
});

server.on('response', function(req, res) {
  console.log('req15');
  console.log(req);
  console.log('res17');
  console.log(res);
  console.log('respiped');
  res.pipe(process.stdout);
  res.connection.pipe(process.stdout);
  res.socket.pipe(process.stdout);
//  res.on('data', function(err, data) {
//    if (err) {
//      console.log('err');
//      console.log(err);
//      throw err;
//    }
//    console.log('data');
//    console.log(data);
//  });
});
