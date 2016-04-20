/***********************************
 * Datasource Control
 **********************************/

/**
 * Module dependencies.
 */

//var Observable = require('rxjs/Observable').Observable;
//var BehaviorSubject = require('rxjs/BehaviorSubject').BehaviorSubject;
//var Subject = require('rxjs/Subject').Subject;

var _ = require('lodash');
var BridgeDb = require('../main.js');
var JsonldRx = require('jsonld-rx-extra');
var yolk = require('yolk');
var h = yolk.h;
var render = yolk.render;
//var render = require('yolk/lib/render');

var Rx = require('rx-extra');

//require('rxjs/add/observable/from');
//require('rxjs/add/observable/fromPromise');
//require('rxjs/add/observable/merge');
//
//require('rxjs/add/operator/filter');
//require('rxjs/add/operator/first');
//require('rxjs/add/operator/map');
//require('rxjs/add/operator/repeat');
//require('rxjs/add/operator/scan');
//require('rxjs/add/operator/startWith');
//require('rxjs/add/operator/withLatestFrom');
//require('rxjs/add/operator/toArray');
//require('rxjs/add/operator/toPromise');

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
  .toArray();
  //.replay();

//  var entityReferenceTypeList$ = props.entityReferenceType || Rx.Observable.return([])
//  .defaultIfEmpty()
//  .first()
//  .map(jsonldRx.arrayifyClean);

  var entityReferenceTypeList$ = (props.entityReferenceType || Rx.Observable.return('gpml:Unknown'))
  .map(jsonldRx.arrayifyClean)
  .map(expandEntityTypes);

  var currentDatasetList$ = Rx.Observable.return(datasetPlaceholder)
  .concat(
      primaryDatasetList$
      .withLatestFrom(
          entityReferenceTypeList$,
          function(candidateDatasets, selectedTypes) {
            return [candidateDatasets, selectedTypes];
          }
      )
      .concatMap(function(zipped) {
        var candidateDatasets = zipped[0];
        var selectedTypes = zipped[1];

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

          // NOTE: intentionally filtering out datasets that lack a subject.
          // That's a BridgeDb curation issue, not an issue for this client.
          return false;
        });
      })
  );

  var selectedDataset = props.dataset;
  var selectedDatasetId = selectedDataset
  .map(function(dataset) {
    return dataset.id;
  });

  var handleClick = createEventHandler();

  handleClick
  .map(function(selectedDatasetId) {
    return selectedDatasetId.value;
  })
  .startWith({});

  return h('div', {}, [
      //h('p', {}, selectedDatasetId),
      //h('p', {}, entityReferenceType.map(JSON.stringify)),
      //h('p', {}, primaryDatasetListOnce.map(JSON.stringify)),
      //h('p.bdb', {}, bridgeDb.dataset.query().map(JSON.stringify)),
      /*
      h('select', {
          className: 'pvjs-editor-dataset form-control input input-sm',
          onClick: handleClick,
          //onChange: handleChange,
          style: 'max-width: 135px; ',
          required: 'true'
        },
        bridgeDb.dataset.query()
        .map(function(datasetCandidate, index) {
          console.log('datasetCandidate');
          console.log(datasetCandidate);
          return h('option', {
            key: datasetCandidate.id,
            value: datasetCandidate.id,
            selected: datasetCandidate.id === selectedDatasetId
          }, datasetCandidate.name);
        })
        .toArray()
      ),
      //*/
      h('select', {}, [
        currentDatasetList$
        .map(function(datasetCandidate, index) {
          return h('option', {
            key: datasetCandidate.id,
            value: datasetCandidate.id,
            selected: datasetCandidate.id === selectedDatasetId
          }, datasetCandidate.name);
        })
        .toArray()
      ])
    ]
  );
}

module.exports = BridgeDbUI;
