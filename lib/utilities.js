var highland = require('highland');

var Utilities = (function(){
  // TODO why do we get an error when we use strict here?
  //'use strict';
  var that = this;
  var runOnce = function(dataName, onLoadEventStream, init) {
    var data = that[dataName];
    if (!!data) {
      console.log('U1247: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (that[dataName + 'Loading']) {
      console.log('U1247: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1247: init ' + dataName);
      that[dataName + 'Loading'] = true;
      return init(that);
    }
  };

  var runOncePerInstance = function(instance, dataName, onLoadEventStream, init) {
    var data = instance[dataName];
    if (!!data) {
      console.log('U1246: returning loaded result for ' + dataName);
      return highland([data]);
    } else if (instance[dataName + 'Loading']) {
      console.log('U1246: waiting for ' + dataName);
      return onLoadEventStream.fork();
    } else {
      console.log('U1246: init ' + dataName);
      instance[dataName + 'Loading'] = true;
      return init();
    }
  };

  return {
    runOnce:runOnce,
    runOncePerInstance:runOncePerInstance
  };
}());

exports = module.exports = Utilities;
