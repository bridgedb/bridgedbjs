var Rx = global.Rx = require('rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../render-in-document');

var BridgeDbUIElement = require('../../lib/ui-components');

var latestBridgeDbCommitHash = 'c641ab0279dbf6bf3aee8d6d238d77865361e211';
var context = [
  'https://cdn.rawgit.com/bridgedb/BridgeDb/',
  latestBridgeDbCommitHash,
  '/org.bridgedb.rdf/resources/jsonld-context.jsonld'
].join('');

var entity = {
  '@context': context,
  entityReference: {
    type: ['biopax:SmallMoleculeReference'],
    isDataItemIn: {
      id: 'http://identifiers.org/cas/'
    },
    identifier: '50-00-0',
  },
  organism: 'Homo sapiens',
  type: ['gpml:Metabolite'],
  'datasource_name': 'CAS',
  identifier: '50-00-0',
  name: 'Formaldehyde',
  displayName: 'formaldehyde'
};

var vnode = h(BridgeDbUIElement, {
  entity: entity,
  onChange: function(updatedEntity) {
    console.log('updatedEntity');
    console.log(updatedEntity);
  },
});
//var vnode = h(BridgeDbUIElement, {
//  organism: 'Homo sapiens'
//});

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
