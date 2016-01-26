var http    =  require('http');
var mockserver  =  require('mockserver');

http.createServer(mockserver('../input-data/')).listen(4522);
