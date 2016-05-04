
var BridgeDb = require('../main.js');
var Rx = global.Rx = require('rx-extra');

var yolk = require('yolk');
var h = yolk.h;

var EntityTypeControl = require('./entity-type-control.js');
var DatasourceControl = require('./datasource-control.js');
var IdentifierControl = require('./identifier-control.js');
var XrefSearch = require('./xref-search.js');

var fs = require('fs');
var insertCss = require('insert-css');

function BridgeDbUIElement(args) {
  [
    fs.readFileSync(__dirname + '/index.css'),
    fs.readFileSync(__dirname + '/stripped-bootstrap.css')
  ]
  .map(insertCss);

  return h('div.bridgedb', null,
    h('h1.container', null, 'hello'),
    h(XrefSearch, {
      // TODO we don't want to pass xrefs in, do we?
      // we just want a single, selected xref.
  //    xrefs: [{
  //      displayName: 'displayName123',
  //      db: 'db123',
  //      identifier: 'identifier123',
  //    }]
    }),
    h(EntityTypeControl),
    h(DatasourceControl),
    h(IdentifierControl)
  );
}

module.exports = BridgeDbUIElement;

//module.exports = {
//  BridgeDbUIElement: require('./bridgedb-ui-element.js'),
//  EntityTypeControl: require('./entity-type-control.js'),
//  DatasourceControl: require('./datasource-control.js'),
//  IdentifierControl: require('./identifier-control.js'),
//  XrefSearch: require('./xref-search.js'),
//};
