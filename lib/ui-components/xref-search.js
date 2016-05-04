var _ = require('lodash');
var BridgeDb = require('../../index.js');
//var Levenshtein = require('levenshtein');
var Rx = require('rx-extra');
var YolkSimpleModal = require('yolk-simple-modal').default;

console.log('YolkSimpleModal');
console.log(YolkSimpleModal);

var yolk = require('yolk');
var h = yolk.h;
var render = yolk.render;

var changeStateToGlyphiconMappings = {
  'true': 'btn-success',
  'false': 'btn-default'
};

function XrefSearch(args) {
  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var disabled$ = props.disabled || Rx.Observable.return(false);
  var required$ = props.required || Rx.Observable.return(false);

  var bridgeDbInstance = new BridgeDb({
    organism: args.organism
  });

  var handleQueryFieldChange = createEventHandler();
  var xrefsPlaceholder = [{
    displayName: 'displayName-placeholder',
    db: 'db-placeholder',
    identifier: 'identifier-placeholder',
  }];
  props.query = (props.query || '');
  var querySubject$ = new Rx.Subject();
  querySubject$.onNext('');
  var query$ = Rx.Observable.merge(
      props.query,
      querySubject$,
      handleQueryFieldChange
      .debounce(300)
      .map(function(x) {
        return x.target.value;
      })
      .filter(function(query) {
        return !!query;
      })
      //.startWith({})
  );

  var xrefsSubject$ = new Rx.Subject();
  var xrefsList$ = Rx.Observable.merge(
      xrefsSubject$,
      query$
      .flatMap(function(query) {
        var queryLowerCase = query.toLowerCase();
        var queryLength = query.length;
        return bridgeDbInstance.entityReference.freeSearch(
            {attribute: query})
        .timeout(45 * 1000) // 45sec seems really long, but sometimes the query response is slow.
        .filter(function(xref) {
          return xref.isDataItemIn.primary;
        })
        .groupBy(function(xref) {return xref.isDataItemIn.preferredPrefix;})
        .flatMap(function(xrefGroupSource) {
          return xrefGroupSource.toArray().map(function(xrefGroup) {
            return xrefGroup.sort(function(xref1, xref2) {
              var displayName1 = xref1.displayName;
              var displayNameLowerCase1 = displayName1.toLowerCase();
              var displayName2 = xref2.displayName;
              var displayNameLowerCase2 = displayName2.toLowerCase();

              if (displayNameLowerCase1 === queryLowerCase) {
                return -1;
              } else if (displayNameLowerCase2 === queryLowerCase) {
                return 1;
              }

              /*
              // match based on letter characters only (must be at least three in query)
              var queryLetters = queryLowerCase.replace(/[^a-zA-Z]/g, '');
              if (queryLetters.length > 2) {
                var letters1 = displayNameLowerCase1.replace(/[^a-zA-Z]/g, '');
                var letters2 = displayNameLowerCase2.replace(/[^a-zA-Z]/g, '');
                var letterMatch1 = letters1 === queryLetters;
                var letterMatch2 = letters2 === queryLetters;

                if (letterMatch1 && !letterMatch2) {
                  return -1;
                } else if (!letterMatch1 && letterMatch2) {
                  return 1;
                }

                if (queryLetters.length > 3) {
                  var queryMatchIndex1 = displayNameLowerCase1.indexOf(queryLowerCase);
                  var queryMatchIndex2 = displayNameLowerCase2.indexOf(queryLowerCase);
                  var queryMatch1 = queryMatchIndex1 > -1;
                  var queryMatch2 = queryMatchIndex2 > -1;

                  if (queryMatch1 && !queryMatch2) {
                    return -1;
                  } else if (!queryMatch1 && queryMatch2) {
                    return 1;
                  } else if (queryMatch1 && queryMatch2) {
                    return queryMatchIndex1 > queryMatchIndex2;
                  }
                }
              }
              //*/

              //*
              // sort by letter characters in query appearing in the candidate name
              // (must be at least two letters in query)
              // if not all the letter characters appear in the candidate name but
              // the first letter of each candidate matches the first letter of the query,
              // sort by smallest Levenshtein distance between query and candidate name
              var queryLetters = queryLowerCase.replace(/[^a-zA-Z]/g, '');
              var queryLettersLength = queryLetters.length;
              if (queryLettersLength >= 2) {
                var letters1 = displayNameLowerCase1.replace(/[^a-zA-Z]/g, '');
                var letters2 = displayNameLowerCase2.replace(/[^a-zA-Z]/g, '');

                var lettersPrefixMatch1 = letters1.substr(0, queryLettersLength) === queryLetters;
                var lettersPrefixMatch2 = letters2.substr(0, queryLettersLength) === queryLetters;

                if (lettersPrefixMatch1 && !lettersPrefixMatch2) {
                  return -1;
                } else if (!lettersPrefixMatch1 && lettersPrefixMatch2) {
                  return 1;
                } else {
                  var firstLetterMatch1 = letters1[0] === queryLetters[0];
                  var firstLetterMatch2 = letters2[0] === queryLetters[0];

                  if (firstLetterMatch1 && !firstLetterMatch2) {
                    return -1;
                  } else if (!firstLetterMatch1 && firstLetterMatch2) {
                    return 1;
                  } else if (firstLetterMatch1 && firstLetterMatch2) {
                    var levenshtein1 = new Levenshtein(queryLetters, letters1);
                    var levenshtein2 = new Levenshtein(queryLetters, letters2);
                    var levenshteinDistance1 = levenshtein1.distance;
                    var levenshtein1Distance2 = levenshtein2.distance;
                    if (levenshteinDistance1 !== levenshtein1Distance2) {
                      // Sort by closest match between letters in displayName and query
                      return levenshteinDistance1 > levenshtein1Distance2;
                    }
                  }
                }
              }

              return displayName1 > displayName2;
            });
          });
        })
        .toArray()
        .map(function(xrefGroups) {
          return xrefGroups.sort(function(xrefGroup1, xrefGroup2) {
            var datasetPreferredPrefix1 = xrefGroup1[0].isDataItemIn.preferredPrefix;
            var datasetPreferredPrefix2 = xrefGroup2[0].isDataItemIn.preferredPrefix;

            // Ensembl shows up first
            if (datasetPreferredPrefix1 === 'ensembl') {
              return -1;
            } else if (datasetPreferredPrefix2 === 'ensembl') {
              return 1;
            }

            // Entrez Gene shows up next
            if (datasetPreferredPrefix1 === 'ncbigene') {
              return -1;
            } else if (datasetPreferredPrefix2 === 'ncbigene') {
              return 1;
            }

            // The rest are sorted alphabetically
            return datasetPreferredPrefix1 > datasetPreferredPrefix2;
          })
          .reduce(function(xrefs, xrefGroup) {
            return xrefs.concat(xrefGroup);
          }, []);
          //*/
        })
        .doOnError(function(err) {
          console.error('Error getting xrefs');
          console.error(err);
          reset();

          var message = err.message ? err.message : err.toString();
          xrefSearch.trigger('error.' + message, {
            message: message
          });
        });
      })
  );

  var xrefsModalPlaceholder = h('span', {}, 'xrefs-modal-placeholder');

//  var handleXrefsSelection = createEventHandler()
//  .map(function(datasetSelection) {
//    return datasetSelection.target.value;
//  })
//  .concatMap(function(selectedDatasetId) {
//    return primaryDatasetList$
//    .take(1)
//    .map(function(candidateDatasets) {
//      return _.find(candidateDatasets, function(candidateDataset) {
//        return candidateDataset.id === selectedDatasetId;
//      });
//    });
//  });
//  //.startWith({})

  var reset = function() {
    // clears the query field
    querySubject$.onNext('');
    xrefList.onNext(null);
  };

  return h('div.form-search.form-group', null,
    h('span', null, disabled$.map(function(disabled) {
        return [
          'disabled? ' + disabled,
          'class: ' + changeStateToGlyphiconMappings[!disabled]
        ].join(',\ ');
      })
    ),
    h('div.input-group.input-group-sm.form-control', null,
      h('input', {
        id: 'xref-search-input',
        'className': 'form-control',
        disabled: disabled$,
        onChange: handleQueryFieldChange,
        'placeholder': 'Search by name',
        required: required$,
        type: 'text',
        value: query$,
      }),
      h('span.input-group-btn', {
        // NOTE: we are relying on the debounce watcher on the
        // input box above to trigger the initiation of a query.
        // This submit button is a dummy that does nothing other
        // than help with UX.
        style: disabled$.map(function(disabled) {
          return disabled ? 'pointer-events: none; ' : null;
        })
      },
        h('button[type="submit"]', {
          'className': disabled$.map(function(disabled) {
            return 'btn ' + changeStateToGlyphiconMappings[!disabled];
          })
        },
          h('span[aria-hidden="true"].glyphicon.glyphicon-search')
        )
      ),
      xrefsList$
      .map(function(xrefs) {
        if (!xrefs) {
          return xrefsModalPlaceholder;
        }

        var content;
        if (xrefs.length > 0) {
          content = h('table.table.table-hover.table-bordered', null,
            h('thead', null,
              h('tr', {},
                h('th', {}, 'Name'),
                h('th', {}, 'Datasource'),
                h('th', {}, 'Identifier')
              )
            ),
            h('tbody', {},
              xrefs.map(function(xref, index) {
                return h('tr[style="cursor: pointer;"]', {
                  id: xref.id,
                  //onclick: m.withAttr('id', vm.saveAndClose)
                },
                  h('td', {}, xref.displayName),
                  h('td', {}, xref.db),
                  h('td', {}, xref.identifier)
                );
              })
            )
          );
        } else {
          content = h('div', {}, 'No results found.');
        }

        return h(YolkSimpleModal, {
          content: content,
          buttons: [{
            text: 'Cancel',
            closeOnClick: true,
            callback: function(value) {
              xrefsSubject$.onNext(null);
            }
          }],
          onchange: function(value) {
            // do something
          }
          //status: vm.modalStatus()
        });
      })
      .startWith(xrefsModalPlaceholder)
    )
  );
//  return h(YolkSimpleModal, {
//    className: 'placeholder-class-name',
//    content: new BridgeDb().dataset.query(args.query)
//            .toArray()
//            .map(function(data) {
//              //return h('p', {}, data);
//              return '<p>' + JSON.stringify(data) + '</p>';
//            }),
//    title: 'Datasources',
//  });
}

module.exports = XrefSearch;
