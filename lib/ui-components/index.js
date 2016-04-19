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

function BridgeDbUI(args) {
  var jsonldRx = new JsonldRx();

  var bridgeDb = new BridgeDb();

  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var datasetPlaceholder = {
    'id': '',
    'name': 'Select datasource'
  };

  var primaryDatasetList = Rx.Observable.merge(
      Rx.Observable.from([datasetPlaceholder]),
      bridgeDb.dataset.query()
      .map(function(dataset) {
        console.log('dataset63');
        console.log(dataset);
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
  );
  //.toPromise();

  var primaryDatasetListOnce = primaryDatasetList;
  //var primaryDatasetListOnce = Rx.Observable.fromPromise(primaryDatasetList);
  //var primaryDatasetListOnce = primaryDatasetList.first();

  //primaryDatasetListOnce.subscribe();

  var selectedDataset = props.dataset;
  var selectedDatasetId = selectedDataset
  .map(function(dataset) {
    return dataset.id;
  });

  var entityReferenceType = props.entityReferenceType
  .map(jsonldRx.arrayifyClean);

  //var selectedTypes = entityReferenceType;

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
        primaryDatasetListOnce
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
