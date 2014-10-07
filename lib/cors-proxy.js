var d3 = require('d3');
var jsonLdContext = require('./context.json');
var config = require('./config.js');

var CorsProxy = (function(){

  function convertOptions(options) {
    var corsifiedOptionsHost = config.proxy.host;
    var corsifiedOptionsPath = config.proxy.path + options.path;
    options.host = corsifiedOptionsHost;
    options.path = corsifiedOptionsPath;
    return options;
  }

  return {
    convertOptions:convertOptions
  };
}());

module.exports = CorsProxy;
