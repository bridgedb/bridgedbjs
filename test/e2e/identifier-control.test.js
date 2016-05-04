var BridgeDb = require('../../index.js');
var Rx = require('rx');
var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../render-in-document');

var bridgeDbUI = {
  IdentifierControl: require('../../lib/ui-components/identifier-control.js')
};

var vnode = h(bridgeDbUI.IdentifierControl);
var result = renderInDocument(vnode);

//var YolkSimpleModal = require('../../index.ts').default;
//
//var vnode = h(YolkSimpleModal, {
//  className: 'placeholder-class-name',
//  content: new BridgeDb().dataset.query({id: 'http://identifiers.org/ncbigene/'})
//          .toArray()
//          .map(function(data) {
//            //return h('p', {}, data);
//            return '<p>' + JSON.stringify(data) + '</p>';
//          }),
//  title: 'Datasources',
//});
//var result = renderInDocument(vnode);
//var node = result.node;
//var cleanup = result.cleanup;
