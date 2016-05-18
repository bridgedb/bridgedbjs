var Rx = global.Rx = require('rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var renderInDocument = require('../render-in-document');

var fs = require('fs');
var insertCss = require('insert-css');

var jsonldMarkup = require('jsonld-markup');
//var jsonldVis = require('jsonld-vis');
var noop = function() {};

var BridgeDbUIElement = require('../../lib/ui-components');

var latestBridgeDbCommitHash = 'c641ab0279dbf6bf3aee8d6d238d77865361e211';
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

var vnode = h('div', {},
  h(BridgeDbUIElement, {
    entity: entity,
    onChange: function(updatedEntity) {
      console.log('updatedEntity');
      console.log(updatedEntity);
      var code = document.querySelector('code');
      var data = JSON.parse(JSON.stringify(updatedEntity));
      var context = data['@context'];
      delete data['@context'];
      delete data.entityReference['@context'];
      code.innerHTML = jsonldMarkup(data, context);
    },
  }),
  h('pre', {},
    h('code', {
    }, 'Change a value above and then view JSON result here')
  )
);

var result = renderInDocument(vnode);
