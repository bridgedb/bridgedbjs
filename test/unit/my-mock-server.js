var BridgeDb = require('../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var http    =  require('http');
var mockserver  =  require('mockserver');

http.createServer(mockserver('../input-data/')).listen(4522);
