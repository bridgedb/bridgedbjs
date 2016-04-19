/***********************************
 * bridgeDbIdControl
 **********************************/

var _ = require('lodash');
var datasetControl = require('./dataset-control.js');
var JsonldRx = require('jsonld-rx-extra');
//var entityReferenceTypeControl = require('./xref-type-control.js');
// TODO figure out why m.redraw doesn't work with browserify
// and kaavio-editor
//var m = require('mithril');
var uuid = require('uuid');

var bridgeDbIdControl = {};

bridgeDbIdControl.vm = (function() {

  var jsonldRx = new JsonldRx();

  var vm = {};

  /**
   * init
   *
   * @param {object} ctrl
   */
  vm.init = function(ctrl) {
    /*
    vm.cancel = function() {
      vm.reset();
    };

    vm.reset = function() {
      vm.datasetPreferredPrefix('');
      vm.entityReferenceTypeId('');
      vm.identifier('');
      vm.displayName('');
      vm.disabled(true);
    };
    //*/

    vm.onunload = function() {
      // do something
    };
  };

  return vm;
})();

bridgeDbIdControl.controller = function(ctrl) {
  bridgeDbIdControl.vm.init(ctrl);
};

bridgeDbIdControl.view = function(ctrl, args) {
  var vm = bridgeDbIdControl.vm;
  args.entityReference.isDataItemIn = args.entityReference.isDataItemIn || {id: ''};
  var dataset = args.entityReference.isDataItemIn;
  var datasetId = dataset.id;
  var identifier = args.entityReference.identifier;

  return window.m('div', {
    style: args.style,
    /*
    oninput: function() {
      if (args.oninput) {
        args.oninput();
      }
    },
    onchange: function() {
      if (args.onchange) {
        args.onchange();
      }
    }
    //*/
  }, [
    /*
   window. m.component(entityReferenceTypeControl, {
      disabled: args.disabled,
      entityReferenceTypeId: args.entityReferenceTypeId
    }),
    //*/
    window.m.component(datasetControl, {
      disabled: args.disabled,
      dataset: dataset,
      entityReferenceType: args.entityReference.type,
      onchange: function(dataset) {
        // TODO look at copying the bridgeDb enrichment happening in gpml2pvjson
        // into here to happen whenever the dataset is changed. That would be
        // better than deleting values, because the values to be deleted would
        // need to be kept up to date with what's coming from bridgeDb.
        // Do the same for oninput for identifier.
        var entityReference = args.entityReference;
        entityReference.isDataItemIn = dataset;
        datasetId = dataset.id;
        if (datasetId && identifier) {
          entityReference.id = datasetId + identifier;
        } else {
          entityReference.id = uuid.v1();
          if (!dataset.exampleIdentifier && identifier) {
            entityReference.isDataItemIn.exampleIdentifier = identifier;
          }
        }
        delete entityReference.db;
        // jscs: disable
        delete entityReference.data_source;
        // jscs: enable
        delete entityReference['owl:sameAs'];
        delete entityReference.xref;
        args.entityReference = entityReference;
        if (args.onchange) {
          args.onchange(entityReference);
        }
      }
    }),
    window.m('input', {
      'class': 'pvjs-editor-identifier form-control input input-sm',
      placeholder: 'Identifier',
      oninput: window.m.withAttr('value', function(identifier) {
        var entityReference = args.entityReference;
        entityReference.identifier = identifier;
        if (datasetId && identifier) {
          entityReference.id = datasetId + identifier;
        } else {
          entityReference.id = uuid.v1();
          if (!datasetId && identifier) {
            entityReference.isDataItemIn.exampleIdentifier = identifier;
          }
        }
        delete entityReference['owl:sameAs'];
        delete entityReference.xref;
        args.entityReference = entityReference;
        if (args.oninput) {
          args.oninput(entityReference);
        }
      }),
      value: args.entityReference.identifier || '',
      disabled: args.disabled()
    })
  ]);
};

module.exports = bridgeDbIdControl;
