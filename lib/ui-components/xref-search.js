// TODO make a yolk modal
// then redo this
// then make a custom element that optionally integrates them all

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

function XrefSearch(args) {

  var changeStateToGlyphiconMappings = {
    'true': 'btn-success',
    'false': 'btn-default'
  };

  var bridgeDbInstance = new BridgeDb({
    organism: args.organism
  });

  var query = new Rx.Subject();
  query.onNext('');

  var showEntityReferences = new Rx.Subject();
  showEntityReferences.onNext(false);

  var reset = function() {
    // clears the query field
    query.onNext('');
    showEntityReferences.onNext(false);
  };

  var search = function(query) {
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
  };

  return h('div.form-search.form-group', [
    h('div.input-group.input-group-sm.form-control', [
      h('input', {
        id: 'xref-search-input',
        'class': 'form-control',
        'placeholder': 'Search by name',
        //onchange: m.withAttr('value', vm.query),
        type: 'text',
        value: query,
        disabled: args.disabled || false
      }),
      h('span.input-group-btn', {
//        onclick: function() {
//          if (!_.isEmpty(query)) {
//            vm.showEntityReferences(true);
//            vm.search(query);
//          }
//        },
        style: args.disabled ? 'pointer-events: none; ' : null
      },
        h('button[type="submit"]', {
          'class': 'btn ' +
              changeStateToGlyphiconMappings[!args.disabled]
        }, [
          h('span[aria-hidden="true"].glyphicon.glyphicon-search')
        ])),
      (function() {
        var content;
        //var xrefs = vm.xrefs;
        var xrefs = null;
        if (xrefs && vm.showEntityReferences()) {
          if (xrefs.length > 0) {
            content = h('table.table.table-hover.table-bordered', [
              h('thead', [
                h('tr', {}, [
                  h('th', {}, 'Name'),
                  h('th', {}, 'Datasource'),
                  h('th', {}, 'Identifier')
                ])
              ]),
              h('tbody', {}, [
                xrefs.map(function(xref, index) {
                  return h('tr[style="cursor: pointer;"]', {
                    id: xref.id,
                    //onclick: m.withAttr('id', vm.saveAndClose)
                  }, [
                    h('td', {}, xref.displayName),
                    h('td', {}, xref.db),
                    h('td', {}, xref.identifier),
                  ]);
                })
              ])
            ]);
          } else {
            // TODO the current code will never reach this state
            content = h('div', {}, 'No results found.');
          }
        }

        return h(YolkSimpleModal, {
          content: content,
          buttons: [{
            text: 'Cancel',
            closeOnClick: true,
            callback: function(value) {
              //vm.xrefs = null;
              showEntityReferences.onNext(false);
              //m.redraw();
            }
          }],
          onchange: function(value) {
            // do something
          }
          //status: vm.modalStatus()
        });
      })()
    ])
  ]);
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

//module.exports = function() {
//
//  //var jsonldRx = new JsonldRx();
//  /******************************
//   * search by name input
//   *****************************/
//
//  //module for xrefSearch
//  //for simplicity, we use this module to namespace the model classes
//  var xrefSearch = {};
//
//  //the view-model tracks a running list of xrefs,
//  //stores a query for new xrefs before they are created
//  //and takes care of the logic surrounding when searching is permitted
//  //and clearing the input after searching a xref to the list
//  xrefSearch.vm = (function() {
//    var vm = {};
//
//    vm.changeStateToGlyphiconMappings = {
//      'true': 'btn-success',
//      'false': 'btn-default'
//    };
//
//    vm.init = function(ctrl) {
//      xrefSearch.trigger = ctrl.trigger;
//
//      // TODO make changes required to allow
//      // us to use the defaults for baseIri
//      // and datasetsMetadataIri
//      var bridgeDbInstance = new BridgeDb({
//        baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
//        datasetsMetadataIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php',
//        organism: ctrl.organism
//      });
//
//      vm.showEntityReferences = m.prop(false);
//
//      //a slot to store the name of a new xref before it is created
//      vm.query = m.prop('');
//
//      vm.modalStatus = function() {
//        if (vm.showEntityReferences()) {
//          var xrefs = vm.xrefs;
//          if (xrefs && xrefs.length > 0) {
//            return 'open';
//          } else {
//            return 'loading';
//          }
//        } else {
//          return 'closed';
//        }
//      };
//
//      vm.saveAndClose = function(selectedEntityReferenceId) {
//        var selectedEntityReference = _.find(vm.xrefs, function(xref) {
//          return xref.id === selectedEntityReferenceId;
//        });
//        ctrl.onchange(selectedEntityReference);
//        vm.reset();
//        m.redraw();
//      };
//
//      // searches for xrefs, which are added to the list
//      vm.search = function(query) {
//        var queryLowerCase = query.toLowerCase();
//        var queryLength = query.length;
//        var searchResultSource = bridgeDbInstance.entityReference.freeSearch(
//            {attribute: query})
//        .timeout(45 * 1000) // 45sec seems really long, but sometimes the query response is slow.
//        .filter(function(xref) {
//          return xref.isDataItemIn.primary;
//        })
//        .groupBy(function(xref) {return xref.isDataItemIn.preferredPrefix;})
//        .flatMap(function(xrefGroupSource) {
//          return xrefGroupSource.toArray().map(function(xrefGroup) {
//            return xrefGroup.sort(function(xref1, xref2) {
//              var displayName1 = xref1.displayName;
//              var displayNameLowerCase1 = displayName1.toLowerCase();
//              var displayName2 = xref2.displayName;
//              var displayNameLowerCase2 = displayName2.toLowerCase();
//
//              if (displayNameLowerCase1 === queryLowerCase) {
//                return -1;
//              } else if (displayNameLowerCase2 === queryLowerCase) {
//                return 1;
//              }
//
//              /*
//              // match based on letter characters only (must be at least three in query)
//              var queryLetters = queryLowerCase.replace(/[^a-zA-Z]/g, '');
//              if (queryLetters.length > 2) {
//                var letters1 = displayNameLowerCase1.replace(/[^a-zA-Z]/g, '');
//                var letters2 = displayNameLowerCase2.replace(/[^a-zA-Z]/g, '');
//                var letterMatch1 = letters1 === queryLetters;
//                var letterMatch2 = letters2 === queryLetters;
//
//                if (letterMatch1 && !letterMatch2) {
//                  return -1;
//                } else if (!letterMatch1 && letterMatch2) {
//                  return 1;
//                }
//
//                if (queryLetters.length > 3) {
//                  var queryMatchIndex1 = displayNameLowerCase1.indexOf(queryLowerCase);
//                  var queryMatchIndex2 = displayNameLowerCase2.indexOf(queryLowerCase);
//                  var queryMatch1 = queryMatchIndex1 > -1;
//                  var queryMatch2 = queryMatchIndex2 > -1;
//
//                  if (queryMatch1 && !queryMatch2) {
//                    return -1;
//                  } else if (!queryMatch1 && queryMatch2) {
//                    return 1;
//                  } else if (queryMatch1 && queryMatch2) {
//                    return queryMatchIndex1 > queryMatchIndex2;
//                  }
//                }
//              }
//              //*/
//
//              //*
//              // sort by letter characters in query appearing in the candidate name
//              // (must be at least two letters in query)
//              // if not all the letter characters appear in the candidate name but
//              // the first letter of each candidate matches the first letter of the query,
//              // sort by smallest Levenshtein distance between query and candidate name
//              var queryLetters = queryLowerCase.replace(/[^a-zA-Z]/g, '');
//              var queryLettersLength = queryLetters.length;
//              if (queryLettersLength >= 2) {
//                var letters1 = displayNameLowerCase1.replace(/[^a-zA-Z]/g, '');
//                var letters2 = displayNameLowerCase2.replace(/[^a-zA-Z]/g, '');
//
//                var lettersPrefixMatch1 = letters1.substr(0, queryLettersLength) === queryLetters;
//                var lettersPrefixMatch2 = letters2.substr(0, queryLettersLength) === queryLetters;
//
//                if (lettersPrefixMatch1 && !lettersPrefixMatch2) {
//                  return -1;
//                } else if (!lettersPrefixMatch1 && lettersPrefixMatch2) {
//                  return 1;
//                } else {
//                  var firstLetterMatch1 = letters1[0] === queryLetters[0];
//                  var firstLetterMatch2 = letters2[0] === queryLetters[0];
//
//                  if (firstLetterMatch1 && !firstLetterMatch2) {
//                    return -1;
//                  } else if (!firstLetterMatch1 && firstLetterMatch2) {
//                    return 1;
//                  } else if (firstLetterMatch1 && firstLetterMatch2) {
//                    var levenshtein1 = new Levenshtein(queryLetters, letters1);
//                    var levenshtein2 = new Levenshtein(queryLetters, letters2);
//                    var levenshteinDistance1 = levenshtein1.distance;
//                    var levenshtein1Distance2 = levenshtein2.distance;
//                    if (levenshteinDistance1 !== levenshtein1Distance2) {
//                      // Sort by closest match between letters in displayName and query
//                      return levenshteinDistance1 > levenshtein1Distance2;
//                    }
//                  }
//                }
//              }
//
//              return displayName1 > displayName2;
//            });
//          })
//        })
//        .toArray()
//        .map(function(xrefGroups) {
//          return xrefGroups.sort(function(xrefGroup1, xrefGroup2) {
//            var datasetPreferredPrefix1 = xrefGroup1[0].isDataItemIn.preferredPrefix;
//            var datasetPreferredPrefix2 = xrefGroup2[0].isDataItemIn.preferredPrefix;
//
//            // Ensembl shows up first
//            if (datasetPreferredPrefix1 === 'ensembl') {
//              return -1;
//            } else if (datasetPreferredPrefix2 === 'ensembl') {
//              return 1;
//            }
//
//            // Entrez Gene shows up next
//            if (datasetPreferredPrefix1 === 'ncbigene') {
//              return -1;
//            } else if (datasetPreferredPrefix2 === 'ncbigene') {
//              return 1;
//            }
//
//            // The rest are sorted alphabetically
//            return datasetPreferredPrefix1 > datasetPreferredPrefix2;
//          })
//          .reduce(function(xrefs, xrefGroup) {
//            return xrefs.concat(xrefGroup);
//          }, [])
//          //*/
//        })
//        .subscribe(function(xrefs) {
//          vm.xrefs = xrefs;
//
//          /*
//          if (!xrefs.length) {
//            vm.reset();
//            xrefSearch.trigger('warning.xrefSearch', {
//              message: 'Your search "' + query + '" did not match any identifiers.'
//            });
//          }
//          //*/
//
//          m.redraw();
//        }, function(err) {
//          console.error('Error getting xrefs');
//          console.error(err);
//          vm.reset();
//          m.redraw();
//
//          var message = err.message ? err.message : err.toString();
//          xrefSearch.trigger('error.' + message, {
//            message: message
//          });
//        }, function() {
//          // do something on complete.
//        });
//      };
//
//      vm.reset = function() {
//        // clears the query field
//        vm.query('');
//        // TODO refactor the below line - shouldn't need to do this.
//        //document.querySelector('#xref-search-input').value = '';
//        vm.xrefs = null;
//        vm.showEntityReferences(false);
//      };
//    }
//
//    return vm
//  }());
//
//  // the controller defines what part of the model is relevant for the current page
//  // in our case, there's only one view-model that handles everything
//  xrefSearch.controller = function(ctrl) {
//    xrefSearch.vm.init(ctrl);
//  }
//
//  //here's the view
//  xrefSearch.view = function(ctrl, args) {
//    var vm = xrefSearch.vm;
//    return h('div.form-search.form-group', [
//      h('div.input-group.input-group-sm.form-control', [
//        h('input', {
//          id: 'xref-search-input',
//          'class': 'form-control',
//          'placeholder': 'Search by name',
//          onchange: m.withAttr('value', vm.query),
//          type: 'text',
//          value: vm.query(),
//          disabled: args.disabled()
//        }),
//        h('span.input-group-btn', {
//          onclick: function() {
//            var query = vm.query();
//            if (!_.isEmpty(query)) {
//              vm.showEntityReferences(true);
//              vm.search(query);
//            }
//          },
//          style: args.disabled() ? 'pointer-events: none; ' : null
//        },
//          h('button[type="submit"]', {
//            'class': 'btn ' +
//                vm.changeStateToGlyphiconMappings[!args.disabled()]
//          }, [
//            h('span[aria-hidden="true"].glyphicon.glyphicon-search')
//          ])),
//        (function() {
//          var content;
//          var xrefs = vm.xrefs;
//          if (xrefs && vm.showEntityReferences()) {
//            if (xrefs.length > 0) {
//              content = h('table.table.table-hover.table-bordered', [
//                h('thead', [
//                  h('tr', {}, [
//                    h('th', {}, 'Name'),
//                    h('th', {}, 'Datasource'),
//                    h('th', {}, 'Identifier')
//                  ])
//                ]),
//                h('tbody', {}, [
//                  xrefs.map(function(xref, index) {
//                    return h('tr[style="cursor: pointer;"]', {
//                      id: xref.id,
//                      onclick: m.withAttr('id', vm.saveAndClose)
//                    }, [
//                      h('td', {}, xref.displayName),
//                      h('td', {}, xref.db),
//                      h('td', {}, xref.identifier),
//                    ]);
//                  })
//                ])
//              ]);
//            } else {
//              // TODO the current code will never reach this state
//              content = h('div', {}, 'No results found.');
//            }
//          }
//
//          return m.component(YolkSimpleModal, {
//            content: content,
//            buttons: [{
//              text: 'Cancel',
//              closeOnClick: true,
//              callback: function(value) {
//                vm.xrefs = null;
//                vm.showEntityReferences(false);
//                m.redraw();
//              }
//            }],
//            onchange: function(value) {
//              // do something
//            },
//            status: vm.modalStatus()
//          });
//        })()
//      ])
//    ]);
//  };
//
//  return xrefSearch;
//};
