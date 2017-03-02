/// <reference path="../../typings/index.d.ts" />

import * as _ from 'lodash';
import Rx = require('rx-extra');
import bridgeDbConfig from '../config.js';
import BridgeDb from '../main.js';

var yolk = require('yolk');
var h = yolk.h;

var EntityReferenceTypeControl = require('./entity-reference-type-control.js');
var DatasourceControl = require('./datasource-control.js');
var IdentifierControl = require('./identifier-control.js');
var EntityReferenceSearch = require('./entity-reference-search.js');

var fs = require('fs');
var insertCss = require('insert-css');

var DATASOURCES_HEADERS_NS = [
  'https://github.com/bridgedb/BridgeDb/blob/master/',
  'org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#'
].join('');

var css = [
  fs.readFileSync(__dirname + '/index.css'),
  fs.readFileSync(__dirname + '/stripped-bootstrap.css')
];

function BridgeDbUIElement(args) {

  css.map(insertCss);

  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var onChange$ = props.onChange;
  var entityReferenceIn$ = props.entityReference;

  var organismIn$ = props.organism;

  bridgeDbConfig.organism = null;
  var bridgeDbInstance$ = Rx.Observable.pairs(bridgeDbConfig)
  .flatMap(function(pair) {
    var key = pair[0];
    var value$;
    if (props.hasOwnProperty(key)) {
      value$ = props[key].first();
    } else {
      value$ = Rx.Observable.return(pair[1]);
    }
    return value$
    .map(function(value) {
      return [key, value];
    });
  })
  .reduce(function(acc, pair) {
    var key = pair[0];
    var value = pair[1];
    acc[key] = value;
    return acc;
  }, {})
  .doOnError(function(err) {
    err.message = err.message || '';
    err.message += ', observed when getting bridgeDbConfig';
    throw err;
  })
  .map(function(bridgeDbConfig) {
    return new BridgeDb(bridgeDbConfig)
  })
  .doOnNext(function(bridgeDbInstance) {
    console.log('bridgeDbInstance');
    console.log(bridgeDbInstance);
  })
  .repeat();

  var transferSpecifiedProperties = function(keys, source, dest) {
    dest = dest || {};
    return keys.reduce(function(accumulator, key) {
      if (source.hasOwnProperty(key)) {
        accumulator[key] = source[key];
      }
      return accumulator;
    }, dest);
  };

  var latestEntityReference$ = new Rx.BehaviorSubject();
  var latestEntityReferenceFiltered$ = latestEntityReference$
    .filter(function(entityReference) {
    return _.isObject(entityReference);
  });

  entityReferenceIn$
  .filter(function(entityReference) {
    var entityReferenceKeys = _.keys(entityReference);
    return entityReferenceKeys && entityReferenceKeys.length;
  })
  .concatMap(function(entityReference) {
    return bridgeDbInstance$.first()
    .map(function(bridgeDbInstance) {
      return [entityReference, bridgeDbInstance];
    });
  })
  .concatMap(function(result) {
    var entityReference = result[0];
    var bridgeDbInstance = result[1];
    return bridgeDbInstance.entityReference.enrich(entityReference, bridgeDbInstance);
  })
  .subscribe(function(entityReference) {
    latestEntityReference$.onNext(entityReference);
  }, function(err) {
    err.message = err.message || '';
    err.message += ', observed in entityReferenceIn$';
    throw err;
  });

  var entityReferenceOut$ = new Rx.Subject();
  entityReferenceOut$
  .debounce(300)
  .concatMap(function(entityReference) {
    return bridgeDbInstance$.first()
    .map(function(bridgeDbInstance) {
      return [entityReference, bridgeDbInstance];
    });
  })
  .concatMap(function(result) {
    var entityReference = result[0];
    var bridgeDbInstance = result[1];
    return bridgeDbInstance.entityReference.enrich(entityReference, bridgeDbInstance);
  })
  .subscribe(function(entityReference) {
    latestEntityReference$.onNext(entityReference);
    if (onChange$) {
      onChange$
      .subscribe(function(onChange) {
        onChange(entityReference);
      });
    }
  }, function(err) {
    err.message = err.message || '';
    err.message += ', observed in entityReferenceOut$';
    throw err;
  });

  return h('nav', {
          'className': 'kaavio-editor-annotation navbar ' +
                       'navbar-form',
        },
        h('div', {
              'className': 'navbar-left',
            },
            h(EntityReferenceSearch, {
              organism: latestEntityReferenceFiltered$.map(function(entityReference) {
                return entityReference.organism;
              }),
              onChange: function(entityReference) {
                if (!entityReference) {
                  console.warn('no entityReference specified');
                  return;
                }

                // NOTE: AP requested that selection via
                // entity reference search NOT change the value
                // of the entityReference type
                latestEntityReferenceFiltered$
                .first()
                .subscribe(function(latestEntityReferenceFiltered) {
                  var updatedEntityReference = {};

                  // transfer the properties that should not change,
                  // even if they conflict with new entityReference
                  var specifiedEntityReferenceKeys = [
                    '@context',
                    'type',
                    'organism',
                  ];
                  updatedEntityReference = transferSpecifiedProperties(
                      specifiedEntityReferenceKeys, latestEntityReferenceFiltered, updatedEntityReference
                  );

                  entityReferenceOut$.onNext(updatedEntityReference);
                }, function(err) {
                  err.message = err.message || '';
                  err.message += ', observed in latestEntityReferenceFiltered$ (E.R. Search onChange)';
                  throw err;
                });
              },
            })
        ),
        h('div', {
              'className': 'form-group.navbar-left',
            },
            h('div', {
              'className': 'form-control',
              style: {
                'min-width': '580px',
                height: '44px'
              }
            },
            h(EntityReferenceTypeControl, {
              entityReferenceType: latestEntityReferenceFiltered$.map(function(entityReference) {
                return entityReference.type;
              }),
              onChange: function(entityReferenceType) {
                if (!entityReferenceType) {
                  console.warn('no entityReferenceType specified');
                  return;
                }

                latestEntityReferenceFiltered$
                .first()
                .subscribe(function(entityReference) {
                  if (entityReferenceType.id) {
                    entityReference.type = [entityReferenceType.id];
                  } else if (_.isString(entityReferenceType)) {
                    entityReference.type = [entityReferenceType];
                  } else {
                    var message = 'Cannot handle entityReferenceType: "' + JSON.stringify(entityReferenceType) + '"';
                    throw new Error(message);
                  }
                  entityReferenceOut$.onNext(entityReference);
                }, function(err) {
                  err.message = err.message || '';
                  err.message += ', observed in latestEntityReferenceFiltered$ (EntityReferenceTypeCtrl onChange)';
                  throw err;
                });
              },
            }),
            h(DatasourceControl, {
              datasource: latestEntityReferenceFiltered$.map(function(entityReference) {
                return entityReference.isDataItemIn;
              }),
              entityReferenceType: latestEntityReferenceFiltered$
              .map(function(entityReference) {
                return entityReference.type;
              }),
              onChange: function(datasource) {
                if (!datasource) {
                  console.warn('no datasource specified');
                  return;
                }

                latestEntityReferenceFiltered$
                .first()
                .subscribe(function(latestEntityReferenceFiltered) {
                  var updatedEntity = {};

                  // NOTE: we are changing this one in order to give a
                  // placeholder so that the entityReference.type does not pollute
                  // these values. TODO is this correct?
                  latestEntityReferenceFiltered.type = ['EntityReference'];

                  entityReferenceOut$.onNext(latestEntityReferenceFiltered);
                }, function(err) {
                  err.message = err.message || '';
                  err.message += ', observed in latestEntityReferenceFiltered$ (DatasourceCtrl onChange)';
                  throw err;
                });
              },
            }),
            h(IdentifierControl, {
              identifier: latestEntityReferenceFiltered$
                          .map(function(entityReference) {
                            return entityReference.identifier || '';
                          }),
              onChange: function(identifier) {
                latestEntityReferenceFiltered$
                .first()
                .subscribe(function(latestEntityReferenceFiltered) {
                  latestEntityReferenceFiltered.identifier = identifier;
                  entityReferenceOut$.onNext(latestEntityReferenceFiltered);
                }, function(err) {
                  err.message = err.message || '';
                  err.message += ', observed in latestEntityReferenceFiltered$ (IdentifierCtrl onChange)';
                  throw err;
                });
              },
            }),
            h('input', {
              className: 'pvjs-editor-label form-control input input-sm',
              placeholder: 'Display name',
              //disabled: disabled$,
              onChange: function(ev) {
                var updatedDisplayName = ev.target.value || '';
                latestEntityReferenceFiltered$
                .first()
                .subscribe(function(latestEntityReferenceFiltered) {
                  latestEntityReferenceFiltered.displayName = updatedDisplayName;
                  entityReferenceOut$.onNext(latestEntityReferenceFiltered);
                }, function(err) {
                  err.message = err.message || '';
                  err.message += ', observed in latestEntityReferenceFiltered$ (DisplayNameCtrl onChange)';
                  throw err;
                });
              },
              //required: required$,
              type: 'text',
              value: latestEntityReferenceFiltered$
                     .map(function(entityReference) {
                       return entityReference.displayName || '';
                     }),
            })
        )
    )
  );
}

module.exports = BridgeDbUIElement;

// TODO should index.js be the combo ui component, or should it
// export all the other ui comoponents as shown below?
//module.exports = {
//  BridgeDbUIElement: require('./bridgedb-ui-element.js'),
//  EntityReferenceTypeControl: require('./entity-reference-type-control.js'),
//  DatasourceControl: require('./datasource-control.js'),
//  IdentifierControl: require('./identifier-control.js'),
//  EntityReferenceSearch: require('./entity-reference-search.js'),
//};
