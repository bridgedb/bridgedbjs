/***********************************
 * Entity Type Control
 **********************************/

/**
 * Module dependencies.
 */

var _ = require('lodash');
// TODO figure out why m.redraw doesn't work with browserify
// and kaavio-editor
//var m = require('mithril');
var Rx = require('rx-extra');

var entityTypeControl = {};

entityTypeControl.vm = (function() {
  var vm = {};

  var entityTypes = vm.entityTypes = [{
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

  // specify placeholder selection
  var entityTypePlaceholder = {
    'id': '',
    'name': 'Select type'
  };

  vm.init = function(ctrl) {

    vm.entityTypeSelectionList = window.m.prop([entityTypePlaceholder]
      .concat(entityTypes)
      .map(function(item) {
        return item;
      }));

    /*
    vm.reset = function() {
      vm.entityTypeId(entityTypePlaceholder.id);
    }
    //*/
  }

  return vm;
})();

entityTypeControl.controller = function(ctrl) {
  entityTypeControl.vm.init(ctrl);
};

entityTypeControl.view = function(ctrl, args) {
  var vm = entityTypeControl.vm;
  var entityTypeId = args.entityTypeId;
  return window.m('select.form-control.input.input-sm',
  {
    //*
    onchange: window.m.withAttr('value', function(entityTypeId) {
      args.entityTypeId = entityTypeId;
      if (args.onchange) {
        args.onchange(entityTypeId);
      }
      /*
      var entityType = _.find(vm.entityTypeSelectionList(), function(entityType) {
        return entityType.id === entityTypeId;
      });
      if (args.onchange) {
        args.onchange(entityType);
      }
      //*/
    }),
    //*/
    value: args.entityTypeId,
    disabled: args.disabled()
  },
  [
    vm.entityTypeSelectionList()
      .map(function(entityType, index) {
        return window.m('option', {
          key: entityType.id,
          value: entityType.id,
          selected: entityType.id === args.entityTypeId,
          disabled: _.isEmpty(entityType.id)
        }, entityType.name);
      })
  ]);
}

module.exports = entityTypeControl;
