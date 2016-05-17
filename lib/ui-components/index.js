var _ = require('lodash');
var BridgeDb = require('../main.js');
var JsonldRx = require('jsonld-rx-extra');
var Rx = global.Rx = require('rx-extra');

var yolk = require('yolk');
var h = yolk.h;

var EntityTypeControl = require('./entity-type-control.js');
var DatasourceControl = require('./datasource-control.js');
var IdentifierControl = require('./identifier-control.js');
var XrefSearch = require('./xref-search.js');

var fs = require('fs');
var insertCss = require('insert-css');

var DATASOURCES_HEADERS_NS = [
  'https://github.com/bridgedb/BridgeDb/blob/master/',
  'org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt#'
].join('');

function BridgeDbUIElement(args) {
  var jsonldRx = new JsonldRx();
  console.log('args');
  console.log(args);
  [
    fs.readFileSync(__dirname + '/index.css'),
    fs.readFileSync(__dirname + '/stripped-bootstrap.css')
  ]
  .map(insertCss);

  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var onChange$ = props.onChange;
  var entityIn$ = props.entity;

  var bridgeDbInstance$ = entityIn$
  .map(function(entity) {
    return new BridgeDb({organism: entity.organism});
  });

  var convertEntityTypesToEntityReferenceTypes = function(entityTypes) {
    // TODO this could likely fail for many different inputs
    var entityReferenceTypes = entityTypes
    .filter(function(entityType) {
      return entityType.indexOf('gpml') === 0 || entityType.indexOf('biopax') === 0;
    })
    .map(function(entityType) {
      if (entityType.indexOf('gpml') === 0 || !entityType.match(/Reference$/)) {
        return entityType;
      }
      return entityType + 'Reference';
    });
    entityReferenceTypes.unshift('EntityReference');
    return entityReferenceTypes;
  };

  var convertEntityReferenceTypesToEntityTypes = function(entityReferenceTypes) {
    // TODO this could likely fail for many different inputs
    return entityReferenceTypes
    .filter(function(entityReferenceType) {
      return entityReferenceType.indexOf('gpml') > -1 || entityReferenceType.indexOf('biopax') > -1;
    })
    .map(function(entityReferenceType) {
      return entityReferenceType.replace(/(.+)Reference$/, '$1');
    });
  };

  var syncEntityAndEntityReferenceSync = function(entity, bridgeDbInstance) {
    if (_.isEmpty(entity) || (!entity.identifier && !entity.entityReference)) {
      throw new Error('Insufficiently specified entity arg in syncEntityAndEntityReferenceSync');
    }
    var entityReference = entity.entityReference;
    if (!entityReference) {
      entityReference = entity.entityReference = {};
    } else if (_.isString(entity.entityReference)) {
      entityReference = entity.entityReference = {
        id: entity.entityReference
      };
    }
    entityReference.isDataItemIn = entityReference.isDataItemIn || {};
    var bridgeDbDatasourceName = entity.bridgeDbDatasourceName ||
        entity[DATASOURCES_HEADERS_NS + 'datasource_name'] ||
        entityReference[DATASOURCES_HEADERS_NS + 'datasource_name'] ||
        entityReference.isDataItemIn[DATASOURCES_HEADERS_NS + 'datasource_name'] ||
        entity['datasource_name'] ||
        entityReference['datasource_name'] ||
        entityReference.isDataItemIn['datasource_name'];

    entity['datasource_name'] =
      entityReference['datasource_name'] =
      entityReference.isDataItemIn['datasource_name'] =
      bridgeDbDatasourceName;

    delete entity.bridgeDbDatasourceName;

    var standardDatasourceName = entityReference.isDataItemIn.name ||
                                 entity.db ||
                                 entityReference.db;
    if (standardDatasourceName) {
      entityReference.isDataItemIn.name = entity.db = entityReference.db = standardDatasourceName;
    }

    var context = entity['@context'] || entityReference['@context'];
    if (context) {
      entity['@context'] = entity['@context'] || context;
      entityReference['@context'] = entityReference['@context'] || context;
    }

    var organism = entity.organism || entityReference.organism;
    if (organism) {
      entity.organism = entityReference.organism = organism;
    }

    var identifier = entity.identifier || entityReference.identifier;
    entity.identifier = entityReference.identifier = identifier;

    var entityTypes = entity.type = jsonldRx.arrayifyClean(entity.type);
    if (_.isEmpty(entityTypes)) {
      entity.type = entityTypes = convertEntityReferenceTypesToEntityTypes(
          jsonldRx.arrayifyClean(entityReference.type)
      );
    }
    var entityReferenceTypes = entityReference.type = jsonldRx.arrayifyClean(entityReference.type);
    if (_.isEmpty(entityReferenceTypes)) {
      entityReference.type = entityReferenceTypes = convertEntityTypesToEntityReferenceTypes(
          jsonldRx.arrayifyClean(entity.type)
      );
    }

    var entityName = entity.name ||
                     entityReference.name ||
                     entity.displayName ||
                     entityReference.displayName;
    if (entityName) {
      entity.name = entityName;

      entity.displayName = entity.displayName ||
                           entityReference.displayName ||
                           entityName;

      entityReference.name = entityReference.name ||
                             entityReference.displayName ||
                             entity.name ||
                             entity.displayName;

      entityReference.displayName = entityReference.displayName ||
                                    entityReference.name ||
                                    entity.displayName ||
                                    entity.name;
    }

    return entity;
  };

  var syncEntityAndEntityReference = function(entity, bridgeDbInstance) {
    entity = syncEntityAndEntityReferenceSync(entity, bridgeDbInstance);
    return bridgeDbInstance.entityReference.enrich(entity.entityReference)
    .map(function(enrichedEntityReference) {
      entity.entityReference = enrichedEntityReference;
      return syncEntityAndEntityReferenceSync(entity, bridgeDbInstance);
    });
  };

  var latestEntity$ = new Rx.BehaviorSubject();
  entityIn$
  .withLatestFrom(bridgeDbInstance$)
  .concatMap(function(result) {
    var entity = result[0];
    var bridgeDbInstance = result[1];

    entity = syncEntityAndEntityReferenceSync(entity, bridgeDbInstance);
    var entityReference = entity.entityReference;
    latestEntity$.onNext(entity);
    return syncEntityAndEntityReference(entity, bridgeDbInstance);
  })
  .subscribe(function(entity) {
    console.log('entityIn$, enriched');
    console.log(entity);
    latestEntity$.onNext(entity);
  });

  var entityOut$ = new Rx.Subject();
  entityOut$
  .debounce(300)
  .withLatestFrom(bridgeDbInstance$)
  .concatMap(function(result) {
    var entity = result[0];
    var bridgeDbInstance = result[1];
    return syncEntityAndEntityReference(entity, bridgeDbInstance);
  })
  .subscribe(function(entity) {
    console.log('entityOut$, enriched');
    console.log(entity);
    latestEntity$.onNext(entity);
    if (onChange$) {
      onChange$
      .subscribe(function(onChange) {
        onChange(entity);
      });
    }
  });

//  var latestEntityReference$ = new Rx.BehaviorSubject();
//  entityReferenceIn$
//  .withLatestFrom(bridgeDbInstance$)
//  .concatMap(function(result) {
//    var entityReference = result[0];
//    var bridgeDbInstance = result[1];
//    if (_.isEmpty(entityReference) || !entityReference.identifier) {
//      return Rx.Observable.return(entityReference);
//    }
//    latestEntityReference$.onNext(entityReference);
//    return bridgeDbInstance.entityReference.enrich(entityReference);
//  })
//  .subscribe(function(entityReference) {
//    latestEntityReference$.onNext(entityReference);
//  });
//
//  var entityReferenceOut$ = new Rx.Subject();
//  entityReferenceOut$
//  .debounce(300)
//  .withLatestFrom(bridgeDbInstance$)
//  .concatMap(function(result) {
//    var entityReference = result[0];
//    var bridgeDbInstance = result[1];
//    if (_.isEmpty(entityReference) || !entityReference.identifier) {
//      return Rx.Observable.return(entityReference);
//    }
//    return bridgeDbInstance.entityReference.enrich(entityReference);
//  })
//  .subscribe(function(entityReference) {
//    latestEntityReference$.onNext(entityReference);
//    if (onChange$) {
//      onChange$
//      .subscribe(function(onChange) {
//        onChange(entityReference);
//      });
//    }
//  });

  return h('div.bridgedb', null,
    h(XrefSearch, {
      organism: latestEntity$.map(function(entity) {
        return entity.organism;
      }),
      onChange: function(entityReference) {
        // NOTE: AP requested that selection via xref search NOT change the value
        // of the type select element for the entity reference

        latestEntity$
        .first()
        .subscribe(function(latestEntity) {
          entityOut$.onNext({
            entityReference: entityReference,
            type: latestEntity.type || entityReference.type,
            displayName: entityReference.displayName ||
                         entityReference.name,
            organism: latestEntity.organism || entityReference.organism,
          });
        });
      },
    }),
    h(EntityTypeControl, {
      entityType: latestEntity$.map(function(entity) {
        return entity.type;
      }),
      onChange: function(entityType) {
        latestEntity$
        .first()
        .subscribe(function(entity) {
          if (entityType.id) {
            entity.type = [entityType.id];
          } else if (_.isString(entityType)) {
            entity.type = [entityType];
          } else {
            throw new Error('Cannot handle entityType: "' + JSON.stringify(entityType) + '"');
          }
          entityOut$.onNext(entity);
        });
      },
    }),
    h(DatasourceControl, {
      datasource: latestEntity$.map(function(entity) {
        return entity.entityReference.isDataItemIn;
      }),
      entityType: latestEntity$
      .map(function(entity) {
        return entity.type;
      }),
      onChange: function(datasource) {
        latestEntity$
        .first()
        .subscribe(function(latestEntity) {
          if (!!latestEntity.identifier) {
            entityOut$.onNext({
              entityReference: {
                isDataItemIn: datasource,
                identifier: latestEntity.identifier,
              },
              identifier: latestEntity.identifier,
              organism: latestEntity.organism,
            });
          }
        });
      },
    }),
    h(IdentifierControl, {
      identifier: latestEntity$
                  .map(function(entity) {
                    return entity.identifier || '';
                  }),
      onChange: function(identifier) {
        latestEntity$
        .first()
        .subscribe(function(latestEntity) {
          var latestEntityReference = latestEntity.entityReference;
          if (!!latestEntityReference.isDataItemIn) {
            entityOut$.onNext({
              entityReference: {
                isDataItemIn: latestEntityReference.isDataItemIn,
                identifier: identifier,
              },
              identifier: identifier,
              organism: latestEntity.organism,
            });
          }
        });
      },
    }),
    h('input', {
      className: 'pvjs-editor-label form-control input input-sm',
      placeholder: 'Display name',
      //disabled: disabled$,
      onChange: function(ev) {
        latestEntity$
        .first()
        .subscribe(function(latestEntity) {
          var latestEntityReference = latestEntity.entityReference;
          latestEntityReference.displayName = ev.target.value || '';
          entityOut$.onNext(latestEntityReference);
        });
      },
      //required: required$,
      type: 'text',
      value: latestEntity$
             .map(function(entity) {
               return entity.displayName || '';
             }),
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
