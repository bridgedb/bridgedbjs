var BridgeDb = require('../../../index.js');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var colors = require('colors');
var expect = chai.expect;
var fs = require('fs');
var highland = require('highland');
var http    =  require('http');
var mockserver  =  require('mockserver');
var run = require('gulp-run');
var sinon      = require('sinon');
var wd = require('wd');

var desired = {'browserName': 'phantomjs'};
desired.name = 'example with ' + desired.browserName;
desired.tags = ['dev-test'];

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

describe('placeholder simple', function() {
  var allPassed = true;

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  //*
  it('should add 1 + 1 correctly', function(done) {
    //expect(1 === 1).to.be.true;
    var onePlusOne = 1 + 1;
    onePlusOne.should.equal(2);
    done();
  });
  //*/

});

describe('placeholder simple', function() {
  var allPassed = true;

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  //*
  it('should add 1 + 1 correctly', function(done) {
    //expect(1 === 1).to.be.true;
    var onePlusOne = 1 + 1;
    onePlusOne.should.equal(2);
    done();
  });
  //*/

});

describe('placeholder simple', function() {
  var allPassed = true;

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    done();
  });

  it('should throw a 403', function(done) {
  var err = new ReferenceError('404');
  var fn = function() { throw err; }
  expect(fn).to.throw(ReferenceError);
  expect(fn).to.throw('403');
  //expect(fn).to.throw(/bad function/);
  //expect(fn).to.not.throw('good function');
  expect(fn).to.not.throw('404');
  //expect(fn).to.throw(ReferenceError, /bad function/);
  expect(fn).to.throw(err);
  expect(fn).to.not.throw(new RangeError('Out of range.'));
  done();
  });
});
