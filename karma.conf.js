var bridgeDbDefaultConfig = require('./lib/config.js');
//require('./test/mockserver.js');

module.exports = function(config) {
  var options = {
    basePath: '',
    frameworks: ['mocha', 'chai', 'browserify'],
    browsers: [
      'Chrome',
      //'Firefox'
    ],
    files: ['test/unit/ui-components/**/*.js'],
    preprocessors: {
      'test/unit/ui-components/**/*.js': 'browserify'
    },
    browserify: {
      debug: true,
      transform: ['brfs']
    },
    colors: true,
    reporters: [
      'coverage',
      'mocha',
    ],
    browserDisconnectTimeout: 60000,
    browserNoActivityTimeout: 60000,
    client: {
      mocha: {
        timeout: 59000,
      },
    },
  };

  process.env.MOCKSERVER_PORT = 4522;
  var proxies = {};
  proxies[bridgeDbDefaultConfig.baseIri] = {
    target: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
    changeOrigin: true
  };
  proxies[bridgeDbDefaultConfig.datasetsMetadataIri] = {
    target: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
    changeOrigin: true
  };
  options.proxies = proxies;

  if (process.env.CIRCLECI) {
    options.singleRun = true;
  }

  if (process.env.GROWL) {
    options.reporters.push('growl');
  }

  config.set(options);
};
