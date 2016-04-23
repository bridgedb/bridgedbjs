/***********************************
 * Entity Type Control
 **********************************/

/**
 * Module dependencies.
 */

var _ = require('lodash');
var Rx = require('rx-extra');

var yolk = require('yolk');

var h = yolk.h;

var entityTypes = [{
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

function EntityTypeControl(args) {
  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var disabled$ = props.disabled || Rx.Observable.return(false);
  var required$ = props.required || Rx.Observable.return(false);

  // specify placeholder selection
  var entityTypePlaceholder = {
    'id': '',
    'name': 'Select type'
  };

  var handleChange = createEventHandler();
  props.entityType = (props.entityType || Rx.Observable.return(entityTypePlaceholder));
  var selectedEntityType$ = Rx.Observable.merge(
      props.entityType,
      handleChange
      .map(function(entityTypeSelection) {
        return entityTypeSelection.target.value;
      })
      .map(function(selectedEntityTypeId) {
        return _.find(entityTypes, function(candidateEntityType) {
          return candidateEntityType.id === selectedEntityTypeId;
        });
      })
      //.startWith({})
  );

  return h('select.form-control.input.input-sm', {
    data: selectedEntityType$,
    disabled: disabled$,
    onChange: handleChange,
    required: required$,
  }, [
    selectedEntityType$.map(function(selectedEntityType) {
      return [entityTypePlaceholder]
      .concat(entityTypes)
      .map(function(entityType, index) {
        return h('option', {
          key: entityType.id,
          value: entityType.id,
          selected: (entityType.id === selectedEntityType.id),
        }, entityType.name);
      });
    })
  ]);
}

module.exports = EntityTypeControl;
