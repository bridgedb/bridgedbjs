var BridgeDb = require('../../index.js');
var Rx = global.Rx = require('rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../render-in-document');

var bridgeDbUI = {
  IdentifierControl: require('../../lib/ui-components/identifier-control.js')
};

var identifierInput$ = new Rx.Subject();

var vnode = h(bridgeDbUI.IdentifierControl, {
  identifier: identifierInput$
});

identifierInput$.subscribe(function(identifierInput) {
  console.log('identifierInput');
  console.log(identifierInput);
}, console.error);

var result = renderInDocument(vnode);

var inputEl = window.document.querySelector('input');
var identifierOutput = Rx.Observable.fromEvent(inputEl, 'change')
.map(function(x) {
  return x.target.value;
});

identifierOutput.subscribe(function(identifierOutput) {
  console.log('identifierOutput');
  console.log(identifierOutput);
}, console.error);
