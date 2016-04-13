var _ = require('lodash');
var freeport = require('freeport');
var http    =  require('http');
var mockserver  =  require('mockserver');
var Rx = require('rx-extra');

var getFreePort = Rx.Observable.fromNodeCallback(freeport);

var mockserverMocha = function(options) {
  options = options || {};
  var timeout = options.timeout || 5000;

  var server;
  var checkNotBusyForCloseInterval = 1000;

  global.before(function(next) {
    var portSource;
    if (typeof process.env.MOCKSERVER_PORT !== 'undefined') {
      var isBusyServer = http.createServer()
      .listen(process.env.MOCKSERVER_PORT);

      portSource = Rx.Observable.fromEvent(isBusyServer, 'error')
      .flatMap(function(err) {
        if (err.code === 'EADDRINUSE') {
          return Rx.Observable.empty();
        } else {
          return Rx.Observable.throw(err);
        }
      })
      .timeout(
          // TODO is it safe to assume that no error for 400ms
          // means the server port is free?
          400,
          Rx.Observable.return(process.env.MOCKSERVER_PORT)
          .doOnNext(function() {
            isBusyServer.close();
          })
      );
    } else {
      portSource = getFreePort();
    }

    portSource
    .doOnNext(function(port) {
      process.env.MOCKSERVER_PORT = port;
    })
    .subscribe(function(port) {
      server = http.createServer(
          mockserver(__dirname + '/input-data/')
      )
      .listen(port);
      setTimeout(function() {
        next(null);
      }, 1500);
    }, function(err) {
      err.message = (err.message || '') + ' in "before" for mockserverMocha';
      next(err);
    });
  });

  global.after(function(next) {

    if (!server) {
      return next(null);
    }

    Rx.Observable.timer(checkNotBusyForCloseInterval, checkNotBusyForCloseInterval)
    .skipWhile(function() {
      return server._connections > 0;
    })
    .first()
    .doOnError(function(err) {
      err.message = (err.message || '') + ' in "after" for mockserverMocha';
      next(err);
    })
    .subscribeOnCompleted(function() {
      server.close();
      next(null);
    });
  });
};

exports = module.exports = mockserverMocha;
