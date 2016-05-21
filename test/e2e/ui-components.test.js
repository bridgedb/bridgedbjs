var Rx = global.Rx = global.Rx || require('rx-extra');
Rx.wee = 'wee-is-here';
var yolk = require('yolk');
var h = yolk.h;
//var renderInDocument = require('../render-in-document');
var render = yolk.render;

var fs = require('fs');
var insertCss = require('insert-css');

var jsonldMarkup = require('jsonld-markup');
//var jsonldVis = require('jsonld-vis');
var noop = function() {};

var BridgeDbUIElement = require('../../lib/ui-components');

var latestBridgeDbCommitHash = 'd01b14ea4924a421cf2c604fb550f63cd51d99cf';
var context = [
  'https://cdn.rawgit.com/bridgedb/BridgeDb/',
  latestBridgeDbCommitHash,
  '/org.bridgedb.rdf/resources/jsonld-context.jsonld'
].join('');

[
  fs.readFileSync(require.resolve('jsonld-markup/jsonld-markup.css'))
]
.map(insertCss);

var entity = {
  '@context': context,
  organism: 'Homo sapiens',
  type: ['gpml:Metabolite'],
  'datasource_name': 'CAS',
  identifier: '50-00-0',
  name: 'Formaldehyde',
  displayName: 'formaldehyde',
  entityReference: {
    type: ['biopax:SmallMoleculeReference'],
    isDataItemIn: {
      id: 'http://identifiers.org/cas/'
    },
    identifier: '50-00-0',
  },
};

//var vnode = h('div', {},
//  h(BridgeDbUIElement, {
//    entity: entity,
//    onChange: function(updatedEntity) {
//      console.log('updatedEntity');
//      console.log(updatedEntity);
//      var code = document.querySelector('code');
//      var data = JSON.parse(JSON.stringify(updatedEntity));
//      var context = data.entityReference['@context'];
//      delete data['@context'];
//      delete data.entityReference['@context'];
//      code.innerHTML = jsonldMarkup(data, context);
//    },
//  }),
//  h('pre', {},
//    h('code', {
//    }, 'Change a value above and then view JSON result here')
//  )
//);

var vnode = h(BridgeDbUIElement, {
  entity: entity,
  onChange: function(updatedEntity) {
    console.log('updatedEntity');
    console.log(updatedEntity);
  },
});

//var vnode = h('div', {}, 'hello');

//var result = renderInDocument(vnode);

//var document = window.document;
var document = require('global/document');
var node = document.createElement('div');
document.body.appendChild(node);
render(vnode, node);
