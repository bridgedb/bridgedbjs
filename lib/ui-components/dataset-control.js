/***********************************
 * Datasource Control
 **********************************/

/**
 * Module dependencies.
 */

var _ = require('lodash');
var BridgeDb = require('../main.js');
var JsonldRx = require('jsonld-rx-extra');

var jsonldRx = new JsonldRx();

var bridgeDb = new BridgeDb({
  // TODO organism is not always going to be human.
  // Commenting it out -- AR 2016-04-05
  //organism: 'Homo sapiens'
});

var primaryDatasetList = bridgeDb.dataset.query()
.map(function(dataset) {
  dataset.subject = jsonldRx.arrayifyClean(dataset.subject);
  return dataset;
})
.filter(function(dataset) {
  // Dataset subjects that indicate the dataset should not be used for identifying
  // an Entity Reference for a gpml:DataNode.
  var nonApplicableSubjects = [
    'interaction',
    'ontology',
    'probe',
    'experiment',
    'publication',
    'model',
    'organism'
  ];
  return dataset.primary &&
      !!dataset.id &&
      nonApplicableSubjects.indexOf(dataset._bridgeDbType) === -1;
})
.toArray()
.toPromise();

var datasetPlaceholder = {
  'id': '',
  'name': 'Select datasource'
};

//specify placeholder selection
vm.dataset = datasetPlaceholder;

vm.datasetList = window.m.prop([datasetPlaceholder]);

primaryDatasetList.then(function(datasetList) {
  var placeholderUnshifted = _.find(datasetList, function(dataset) {
    return dataset.id === datasetPlaceholder.id &&
      dataset.name === datasetPlaceholder.name;
  });
  if (!placeholderUnshifted) {
    datasetList.unshift(datasetPlaceholder);
  }
  vm.datasetList(datasetList);
  window.m.redraw();
}, function(err) {
  throw err;
});

var datasetControl = function(args) {
  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var handleClick = createEventHandler();

  var entityReferenceType = jsonldRx.arrayifyClean(props.entityReferenceType);
  var selectedDataset = props.dataset || {};
  /*
  var selectedDatasetSubjects = jsonldRx.arrayifyClean(selectedDataset.subject);
  var selectedTypes = selectedDatasetSubjects.concat(entityReferenceType);
  //*/
  var selectedTypes = entityReferenceType;
  var selectedDatasetId = selectedDataset.id;
  var preferredPrefix = selectedDataset.preferredPrefix;

  return window.m('select', {
    'class': 'pvjs-editor-dataset form-control input input-sm',
    onchange: window.m.withAttr('value', function(selectedDatasetId) {
      var selectedDataset = _.find(vm.datasetList(), function(dataset) {
        return dataset.id === selectedDatasetId;
      });
      if (args.onchange) {
        args.onchange(selectedDataset);
      }
    }),
    disabled: args.disabled(),
    style: 'max-width: 135px; ',
    required: true
  }, [
    vm.datasetList()
      .filter(function(candidateDataset) {
        // Filtering datasources based on the currently
        // selected GPML DataNode Type

        var candidateDatasetSubjects = candidateDataset.subject;
        candidateDatasetSubjects = jsonldRx.arrayifyClean(candidateDatasetSubjects);

        // We include all Datasets when GPML DataNode Type is equal to "gpml:UnknownReference" or
        // is null, undefined, '' or not selected. We also include the placeholder prompt.
        if (_.isEmpty(selectedTypes) ||
            _.isEmpty(candidateDatasetSubjects) ||
            candidateDataset.id === selectedDataset.id ||
            selectedTypes.indexOf('gpml:Unknown') > -1 ||
            selectedTypes.indexOf('biopax:Complex') > -1) {
          return true;
        }

        if (selectedTypes.indexOf('biopax:Pathway') > -1 &&
            candidateDatasetSubjects.indexOf('biopax:Pathway') > -1) {
          return true;
        }

        if (selectedTypes.indexOf('biopax:SmallMoleculeReference') > -1 &&
            candidateDatasetSubjects.indexOf('biopax:SmallMoleculeReference') > -1) {
          return true;
        }

        if ((selectedTypes.indexOf('biopax:RnaReference')  > -1 ||
              selectedTypes.indexOf('gpml:GeneProduct')  > -1) &&
            (candidateDatasetSubjects.indexOf('biopax:RnaReference') > -1 ||
              candidateDatasetSubjects.indexOf('gpml:GeneProduct') > -1)) {
          return true;
        }

        if ((selectedTypes.indexOf('gpml:GeneProduct') > -1 ||
              selectedTypes.indexOf('biopax:ProteinReference') > -1) &&
            (candidateDatasetSubjects.indexOf('biopax:ProteinReference') > -1 ||
              candidateDatasetSubjects.indexOf('gpml:GeneProduct') > -1)) {
          return true;
        }

        // NOTE: intentionally filtering out datasets that lack a subject.
        // That's a BridgeDb curation issue, not a pvjs issue.

        return false;
      })
      .map(function(dataset, index) {
        return window.m('option', {
          key: dataset.id,
          value: dataset.id,
          selected: dataset.id === selectedDatasetId
        }, dataset.name);
      })
  ]);
};

module.exports = datasetControl;
