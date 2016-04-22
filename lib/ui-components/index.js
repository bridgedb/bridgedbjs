/***********************************
 * Datasource Control
 **********************************/

/**
 * Module dependencies.
 */

// TODO add the CSS

var _ = require('lodash');
var BridgeDb = require('../main.js');
var JsonldRx = require('jsonld-rx-extra');
var Rx = require('rx-extra');
var yolk = require('yolk');

var h = yolk.h;
var render = yolk.render;

var entityTypeTermsByGpmlTerm = {
  'gpml:Pathway': [
    'gpml:Pathway',
    'biopax:Pathway',
  ],
  'gpml:Metabolite': [
    'gpml:Metabolite',
    'biopax:SmallMolecule',
    'biopax:SmallMoleculeReference',
  ],
  'gpml:Protein': [
    'gpml:Protein',
    'biopax:Protein',
    'biopax:ProteinReference',
  ],
  'gpml:Rna': [
    'gpml:Rna',
    'biopax:Rna',
    'biopax:RnaReference',
  ],
  'gpml:GeneProduct': [
    'gpml:GeneProduct',
    'gpml:Protein',
    'gpml:Rna',
    'biopax:Dna',
    'biopax:DnaReference',
    'biopax:Rna',
    'biopax:RnaReference',
    'biopax:Protein',
    'biopax:ProteinReference',
  ],
};

var expandEntityTypes = function(entityTypes) {
  if (_.isEmpty(entityTypes)) {
    return entityTypes;
  }
  return entityTypes.reduce(function(acc, entityType) {
    var mappedTerms;
    if (entityType.indexOf('gpml') === 1) {
      mappedTerms = entityTypeTermsByGpmlTerm[entityType];
    } else {
      // e.g., if entityType is a BioPAX term
      mappedTerms = _.toPairs(entityTypeTermsByGpmlTerm)
      .reduce(function(acc, pair) {
        var gpmlTerm = pair[0];
        var allTerms = pair[1];
        if (allTerms.indexOf(entityType) > -1) {
          acc = acc.concat(allTerms);
        }
        return acc;
      }, []);
    }
    if (!mappedTerms) {
      return acc;
    }
    return acc.concat(mappedTerms);
  }, []);
};

function BridgeDbUI(args) {
  var jsonldRx = new JsonldRx();

  var bridgeDb = new BridgeDb();

  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var disabled$ = props.disabled || Rx.Observable.return(false);
  var required$ = props.required || Rx.Observable.return(false);

  var datasetPlaceholder = {
    'id': '',
    'name': 'Select datasource'
  };

  var primaryDatasetList$ = bridgeDb.dataset.query()
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
  .repeat();

  var handleChange = createEventHandler();
  props.dataset = (props.dataset || Rx.Observable.return(datasetPlaceholder));
  var selectedDataset$ = Rx.Observable.merge(
      props.dataset,
      handleChange
      .map(function(datasetSelection) {
        return datasetSelection.target.value;
      })
      .concatMap(function(selectedDatasetId) {
        return primaryDatasetList$
        .take(1)
        .map(function(candidateDatasets) {
          return _.find(candidateDatasets, function(candidateDataset) {
            return candidateDataset.id === selectedDatasetId;
          });
        });
      })
      .doOnNext(function(selecteddataset) {
        console.log('selecteddataset.id from handlechange: ' + selecteddataset.id);
      })
      //.startWith({})
  );

  var getCurrentDatasetList = function(selectedTypes, selectedDataset) {
    //console.log('selectedTypes: ' + JSON.stringify(selectedTypes));
    //console.log('selectedDataset.id: ' + selectedDataset.id);
    return Rx.Observable.return(datasetPlaceholder)
    .concat(
        primaryDatasetList$
        .take(1)
        .concatMap(function(candidateDatasets) {
          var candidateDataset$ = Rx.Observable.from(candidateDatasets);

          // return all if no entity type specified
          if (_.isEmpty(selectedTypes)) {
            return candidateDataset$;
          }

          return candidateDataset$
          .filter(function(candidateDataset) {
            // Filtering datasources based on the currently
            // selected GPML DataNode Type

            var candidateDatasetSubjects = expandEntityTypes(jsonldRx.arrayifyClean(
                candidateDataset.subject));

            // If the IRIs are the same, we include the entry
            // regardless of entity type
            if (candidateDataset.id === selectedDataset.id) {
              return true;
            }

            // We include all Datasets when GPML DataNode Type is equal to
            // one of these entries:
            var includeAllForTheseTerms = [
              'biopax:Complex',
              'gpml:Unknown',
              'gpml:UnknownReference',
            ];
            if (_.intersection(selectedTypes, includeAllForTheseTerms).length > 0) {
              return true;
            }

            var pathwayTerms = entityTypeTermsByGpmlTerm['gpml:Pathway'];
            if (_.intersection(selectedTypes, pathwayTerms).length > 0 &&
                _.intersection(candidateDatasetSubjects, pathwayTerms).length > 0) {
              return true;
            }

            var metaboliteTerms = entityTypeTermsByGpmlTerm['gpml:Metabolite'];
            if (_.intersection(selectedTypes, metaboliteTerms).length > 0 &&
                _.intersection(candidateDatasetSubjects, metaboliteTerms).length > 0) {
              return true;
            }

            var geneProductTerms = entityTypeTermsByGpmlTerm['gpml:GeneProduct'];
            if (_.intersection(selectedTypes, geneProductTerms).length > 0 &&
                _.intersection(candidateDatasetSubjects, geneProductTerms).length > 0) {
              return true;
            }

            // NOTE: we are intentionally filtering out datasets that lack a subject.
            // That's a BridgeDb curation issue, not an issue for this client.
            return false;
          });
        })
    )
    .map(function(dataset) {
      if (dataset.id === selectedDataset.id) {
        dataset.selected = true;
      }
      return dataset;
    })
    .toArray();
  };

  var entityReferenceTypeList$ = (props.entityReferenceType || Rx.Observable.return('gpml:Unknown'))
  .map(jsonldRx.arrayifyClean)
  .map(expandEntityTypes);

  var currentDatasetList$ = new Rx.Subject();

  entityReferenceTypeList$
  .withLatestFrom(selectedDataset$)
  .concatMap(function(result) {
    var selectedTypes = result[0];
    var selectedDataset = result[1];
    return getCurrentDatasetList(selectedTypes, selectedDataset);
  })
  .subscribe(function(currentDatasetList) {
    //console.log('currentDatasetList.length205: ' + currentDatasetList.length);
    currentDatasetList$.onNext(currentDatasetList);
  }, console.error);

  selectedDataset$
  .withLatestFrom(entityReferenceTypeList$)
  .concatMap(function(result) {
    var selectedDataset = result[0];
    var selectedTypes = result[1];
    return getCurrentDatasetList(selectedTypes, selectedDataset);
  })
  .subscribe(function(currentDatasetList) {
    //console.log('currentDatasetList.length217: ' + currentDatasetList.length);
    currentDatasetList$.onNext(currentDatasetList);
  }, console.error);

  return h('select', {
    'className': 'pvjs-editor-dataset form-control input input-sm',
    data: selectedDataset$,
    disabled: disabled$,
    onChange: handleChange,
    required: required$,
    style: 'max-width: 135px; '
  }, [
    currentDatasetList$
    .map(function(candidateDatasets) {
      //console.log('candidateDatasets.length:  ' + candidateDatasets.length);
      //console.log('candidateDatasets[0]');
      //console.log(candidateDatasets[0]);
      return candidateDatasets
      .map(function(candidateDataset) {
        //console.log('candidateDataset.id: ' + candidateDataset.id);
        //console.log(candidateDataset);
        var candidateDatasetId = candidateDataset.id;

        return h('option', {
          key: candidateDatasetId,
          value: candidateDatasetId,
          selected: candidateDataset.selected
        }, candidateDataset.name);
      });
    })
  ]);
}

module.exports = BridgeDbUI;
