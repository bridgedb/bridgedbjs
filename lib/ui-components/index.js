
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
  var props = args.props;

  [
    fs.readFileSync(__dirname + '/index.css'),
    fs.readFileSync(__dirname + '/stripped-bootstrap.css')
  ]
  .map(insertCss);

  var entityType$ = new Rx.BehaviorSubject();
  entityType$.onNext({
    id: ''
  });

  var datasource$ = new Rx.BehaviorSubject();
  var identifier$ = new Rx.BehaviorSubject();
  identifier$.onNext('');

  return h('div.bridgedb', null,
    h(XrefSearch, {
      organism: props.organism,
      onChange: function(xref) {
        console.log('xref from bridgedb UI component');
        console.log(xref);
      },
    }),
    h(EntityTypeControl, {
      entityType: entityType$,
      onChange: function(entityType) {
        console.log('entityType from bridgedb UI component');
        console.log(entityType);
        entityType$.onNext(entityType);
      },
    }),
    h(DatasourceControl, {
      datasource: datasource$,
      entityReferenceType: entityType$
                           .map(function(entityType) {
                             return entityType.id;
                           }),
      onChange: function(datasource) {
        console.log('datasource from bridgedb UI component');
        console.log(datasource);
      },
    }),
    h(IdentifierControl, {
      identifier: identifier$
    })
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
