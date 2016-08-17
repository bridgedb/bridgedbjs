/// <reference path="../../index.d.ts" />

/***********************************
 * EntityReference Type Control
 **********************************/

/**
 * Module dependencies.
 */

import * as _ from 'lodash';
import Rx = require('rx-extra');
import yolk from 'yolk';

var h = yolk.h;

var entityReferenceTypes = [{
  'id': 'biopax:Complex',
  name: 'Complex'
}, {
  'id': 'gpml:GeneProduct',
  name: 'Gene Product'
}, {
  'id': 'gpml:Metabolite',
  name: 'Metabolite'
}, {
  'id': 'biopax:Pathway',
  name: 'Pathway'
}, {
  'id': 'biopax:Protein',
  name: 'Protein'
}, {
  'id': 'biopax:Rna',
  name: 'RNA'
}, {
  'id': 'gpml:Unknown',
  name: 'Unknown'
}];

function EntityReferenceTypeControl(args) {
  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var disabled$ = props.disabled || Rx.Observable.return(false);
  var required$ = props.required || Rx.Observable.return(false);
  var onChange$ = props.onChange;

  // specify placeholder selection
  var entityReferenceTypePlaceholder = {
    'id': '',
    'name': 'Select type'
  };

  var entityReferenceTypeIn$;
  if (!props.entityReferenceType) {
    entityReferenceTypeIn$ = Rx.Observable.return(entityReferenceTypePlaceholder);
  } else {
    entityReferenceTypeIn$ = props.entityReferenceType
    .concatMap(function(entityReferenceTypeOrTypes) {
      if (_.isArray(entityReferenceTypeOrTypes)) {
        return Rx.Observable.from(entityReferenceTypeOrTypes);
      } else {
        return Rx.Observable.return(entityReferenceTypeOrTypes);
      }
    })
    .map(function(entityReferenceType) {
      var entityReferenceTypeId;
      if (entityReferenceType.id) {
        entityReferenceTypeId = entityReferenceTypePlaceholder;
      } else if (_.isString(entityReferenceType)) {
        entityReferenceTypeId = entityReferenceType;
      } else {
        var message = [
          'Cannot get entityReferenceTypeId from ',
          JSON.stringify(entityReferenceType),
          '.'
        ].join('');
        return Rx.Observable.throw(new Error(message));
      }

      return _.find(entityReferenceTypes, function(candidateEntityReferenceType) {
        return candidateEntityReferenceType.id === entityReferenceTypeId;
      });
    })
    .filter(function(x) {
      return !_.isEmpty(x);
    });
  }

  var handleChange = createEventHandler();
  var selectedEntityReferenceType$ = Rx.Observable.merge(
      entityReferenceTypeIn$.defaultIfEmpty(entityReferenceTypePlaceholder),
      handleChange
      .map(function(entityReferenceTypeSelection) {
        return entityReferenceTypeSelection.target.value;
      })
      .filter(function(entityReferenceTypeSelection) {
        return !!entityReferenceTypeSelection && entityReferenceTypeSelection !== 'null';
      })
      .map(function(selectedEntityReferenceTypeId) {
        return _.find(entityReferenceTypes, function(candidateEntityReferenceType) {
          return candidateEntityReferenceType.id === selectedEntityReferenceTypeId;
        });
      })
      .doOnNext(function(entityReferenceType) {
        if (onChange$) {
          onChange$.subscribe(function(onChange) {
            onChange(entityReferenceType);
          });
        }
      })
  );

  return h('select.form-control.input.input-sm', {
    data: selectedEntityReferenceType$,
    disabled: disabled$,
    onChange: handleChange,
    required: required$,
  }, [
    selectedEntityReferenceType$.map(function(selectedEntityReferenceType) {
      return [entityReferenceTypePlaceholder]
      .concat(entityReferenceTypes)
      .map(function(entityReferenceType, index) {
        return h('option', {
          key: entityReferenceType.id,
          value: entityReferenceType.id,
          selected: (entityReferenceType.id === selectedEntityReferenceType.id),
        }, entityReferenceType.name);
      });
    })
  ]);
}

export default EntityReferenceTypeControl;
