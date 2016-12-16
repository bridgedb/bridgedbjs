// NOTE: mock-server must be started before running this.

var Rx = global.Rx = global.Rx || require('rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var render = yolk.render;

var fs = require('fs');
var insertCss = require('insert-css');

var BridgeDbUIElement = require('../../ui');

var context = JSON.parse(
    fs.readFileSync(__dirname + '/../../test/jsonld-context.jsonld')
);

var entity = {
  '@context': context['@context'],
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

// TODO do we need to specify this here? Seems wrong.
process.env.MOCKSERVER_PORT = '4522';

var vnode = h(BridgeDbUIElement, {
  onChange: function(updatedEntity) {
    console.log('updatedEntity');
    console.log(updatedEntity);
  },
  '@context': context,
  baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
  datasetsMetadataIri:
      'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt',
  organism: entity.organism,
  entity: entity,
});

var document = require('global/document');
var node = document.createElement('div');
document.body.appendChild(node);
render(vnode, node);
