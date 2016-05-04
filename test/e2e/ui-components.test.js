var Rx = global.Rx = require('rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../render-in-document');

var BridgeDbUIElement = require('../../lib/ui-components');

var vnode = h(BridgeDbUIElement);

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
