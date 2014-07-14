var d3 = require('d3')
  , csv = require('csv')
  , _ = require('lodash')
  , http = require('http');

module.exports = (function(){

  var bridgedbLinkOutsUriStub = 'webservice.bridgedb.org';
  var bridgedbDatasources = 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php';

  function convertToEnsembl(singleSpecies, id, datasource, label, desc, callback) {
    //For unannotated nodes, without datasource or identifier
    if (null === id || null === datasource){
        var annotationData = {
          'header': label,
          'description': desc,
          'listItems': ['Missing ID and datasource']
        };
        callback(annotationData);
    }
    else {
    getDataSources(function(err, dataSources) {
      var dataSourceRowCorrespondingToDataNodeXrefDatabase = getDataSourceRowByName(datasource, dataSources);
      if (!dataSourceRowCorrespondingToDataNodeXrefDatabase) {
        return callback(null);
      }
      var systemCode = dataSourceRowCorrespondingToDataNodeXrefDatabase.systemCode;
      getXrefAliases(singleSpecies, systemCode, id, function(xRefAliases) {
        var currentDataSourceRow;
        var listItems = [];
        if (typeof xRefAliases !== 'undefined') { //BridgeDb Error
        listItems = [];
        xRefAliases.forEach(function(xRefAlias) {
          var listItem = {};
          listItem.title = xRefAlias.dataSourceName;
          listItem.text = xRefAlias.xRefId;
          if (!!xRefAlias.dataSourceName) {
            currentDataSourceRow = getDataSourceRowByName(xRefAlias.dataSourceName, dataSources);
            if (!!currentDataSourceRow) {
              listItem.priority = currentDataSourceRow.priority;
              if (currentDataSourceRow.hasOwnProperty('linkoutPattern')) {
                if (currentDataSourceRow.linkoutPattern !== '' && currentDataSourceRow.linkoutPattern !== null) {
                  listItem.uri = currentDataSourceRow.linkoutPattern.replace('$id', listItem.text);
                }
              }
            }
            else {
              listItem.priority = 3;
            }
            listItems.push(listItem);
          }
        });
        }

        listItems.sort(function(a, b) {
          if (a.priority === b.priority)
          {
              var x = a.title.toLowerCase(), y = b.title.toLowerCase();

              return x < y ? -1 : x > y ? 1 : 0;
          }
          return b.priority - a.priority;
        });

        var nestedListItems = d3.nest()
        .key(function(d) { return d.title; })
        .entries(listItems);

        // handle case where nothing is returned by bridgedb webservice
        if (nestedListItems.length === 0){
          var uri = '';
          var ds = getDataSourceRowByName(datasource, dataSources);
           if (ds.hasOwnProperty('linkoutPattern')) {
             if (ds.linkoutPattern !== '' && ds.linkoutPattern !== null) {
               uri = ds.linkoutPattern.replace('$id', id);
             }
           }
          nestedListItems = [{'key': datasource, 'values':[{'priority': '1','text': id,'title': datasource,'uri':uri}]}];
        }

        // We want the identifier that was listed by the pathway creator for this data node to be listed first.

        var ensemblIds = nestedListItems.filter(function(element) {return (element.key === 'Ensembl');});
        if (ensemblIds.length > 0) {
          var ensemblId = ensemblIds[0].values[0].text;
          var ensemblUri = 'http://identifiers.org/ensembl/' + ensemblId;
          callback(ensemblUri);
        }
        else {
          callback(null);
        }
      });
    });
   }
  }


  function getXrefAnnotationDataByDataNode(singleSpecies, id, datasource, label, desc, callback) {
    //For unannotated nodes, without datasource or identifier
    if (null === id || null === datasource){
        var annotationData = {
          'header': label,
          'description': desc,
          'listItems': ['Missing ID and datasource']
        };
        callback(annotationData);
    }
    else {
    getDataSources(function(err, dataSources) {
      var dataSourceRowCorrespondingToDataNodeXrefDatabase = getDataSourceRowByName(datasource, dataSources);
      var systemCode = dataSourceRowCorrespondingToDataNodeXrefDatabase.systemCode;
      getXrefAliases(singleSpecies, systemCode, id, function(xRefAliases) {
        var currentDataSourceRow;
        var listItems = [];
        if (typeof xRefAliases !== 'undefined') { //BridgeDb Error
        listItems = xRefAliases.map(function(xRefAlias) {
          var listItem = {};
          listItem.title = xRefAlias.dataSourceName;
          listItem.text = xRefAlias.xRefId;
          currentDataSourceRow = getDataSourceRowByName(xRefAlias.dataSourceName, dataSources);
          listItem.priority = currentDataSourceRow.priority;
          if (currentDataSourceRow.hasOwnProperty('linkoutPattern')) {
            if (currentDataSourceRow.linkoutPattern !== '' && currentDataSourceRow.linkoutPattern !== null) {
              listItem.uri = currentDataSourceRow.linkoutPattern.replace('$id', listItem.text);
            }
          }
          return listItem;
        });
        }

        listItems.sort(function(a, b) {
          if (a.priority === b.priority)
          {
              var x = a.title.toLowerCase(), y = b.title.toLowerCase();

              return x < y ? -1 : x > y ? 1 : 0;
          }
          return b.priority - a.priority;
        });

        var nestedListItems = d3.nest()
        .key(function(d) { return d.title; })
        .entries(listItems);

        // handle case where nothing is returned by bridgedb webservice
        if (nestedListItems.length === 0){
          var uri = '';
          var ds = getDataSourceRowByName(datasource, dataSources);
           if (ds.hasOwnProperty('linkoutPattern')) {
             if (ds.linkoutPattern !== '' && ds.linkoutPattern !== null) {
               uri = ds.linkoutPattern.replace('$id', id);
             }
           }
          nestedListItems = [{'key': datasource, 'values':[{'priority': '1','text': id,'title': datasource,'uri':uri}]}];
        }

        // We want the identifier that was listed by the pathway creator for this data node to be listed first.

        var specifiedListItem = _.remove(nestedListItems, function(element) {return (element.key === datasource);});

        var specifiedXRefId = _.remove(specifiedListItem.values, function(element) {return (element.text === id);});
        specifiedListItem.values.unshift(specifiedXRefId);

        nestedListItems.unshift(specifiedListItem);

        var annotationData = {
          'header': label,
          'description': desc,
          'listItems': nestedListItems
        };
        callback(annotationData);
      });
    });
   }
  }

  function getDataSourceRowByName(dataSourceName, dataSources) {
    var regexp = /[^\w]/gi;
    var dataSourceRow = dataSources.filter(function(row) { return row.dataSourceName === dataSourceName; })[0];
    if (!dataSourceRow) {
      dataSourceRow = dataSources.filter(function(row) { return row.dataSourceName.replace(regexp, '').toLowerCase() === dataSourceName.replace(regexp, '').toLowerCase(); })[0];
    }
    return dataSourceRow;
  }

  function getDataSources(callbackOutside) {
    /*
      var https = require('https');
      var options = {
        host: 'spreadsheets.google.com',
        path: '/feeds/list/0AjT8IiFDIm5DdDEyMk42UEhMWFpoTzV5c09tLU5uNWc/od6/public/values?alt=json',
        port: '443',
        //This is the only line that is new. `headers` is an object with the headers to request
        headers: {'custom': 'Custom Header Demo works'}
      };

      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          var data = JSON.parse(str);
          var entries = data.feed.entry;
          console.log('entries');
          console.log(entries);
          var dataSources = [];

          _.forEach(entries, function(entry) {
            // TODO remove this code if the datasources google doc gets corrected, making these corrections redundant.
            var dataSource = {};
            entry.gsx$miriamrooturn.$t = entry.gsx$miriamrooturn.$t.toLowerCase();
            if (!!entry.gsx$miriamrooturn.$t && entry.gsx$miriamrooturn.$t.indexOf('urn:miriam') > -1) {
              if (entry.gsx$miriamrooturn.$t === 'urn:miriam:obo.go') {
                entry.gsx$miriamrooturn.$t = 'urn:miriam:go:';
              }
              if (entry.gsx$miriamrooturn.$t[entry.gsx$miriamrooturn.$t.length - 1] !== ':') {
                entry.gsx$miriamrooturn.$t += ':';
              }
              dataSource.miriamRootUrn = entry.gsx$miriamrooturn.$t;
              dataSource.namespace = dataSource.miriamRootUrn.substring(11, dataSource.miriamRootUrn.length - 1);
            }

            if (!!entry.gsx$regex.$t) {
              dataSource.regex = entry.gsx$regex.$t;
            }

            if (!!entry.gsx$systemcode.$t) {
              dataSource.systemCode = entry.gsx$systemcode.$t;
            }

            if (!dataSource.applicableOnlyToSpecies) {
              delete dataSource.applicableOnlyToSpecies;
            }

            if (!!entry.gsx$entitytype.$t) {
              if (entry.gsx$entitytype.$t === 'gene') {
                dataSource.entityType = 'Dna';
              } else if (entry.gsx$entitytype.$t === 'rna') {
                dataSource.entityType = 'Rna';
              } else if (entry.gsx$entitytype.$t === 'protein') {
                dataSource.entityType = 'Protein';
              } else if (entry.gsx$entitytype.$t === 'metabolite') {
                dataSource.entityType = 'SmallMolecule';
              } else if (entry.gsx$entitytype.$t === 'pathway') {
                dataSource.entityType = 'Pathway';
              }
            }
            dataSources.push(dataSource);
          });
          callbackOutside(null, dataSources);
          //*/

      var options = {
        host: 'svn.bigcat.unimaas.nl',
        path: '/bridgedb/trunk/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt',
        port: '80',
        //This is the only line that is new. `headers` is an object with the headers to request
        headers: {'custom': 'Custom Header Demo works'}
      };

      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          csv().from
          .string(
            str,
            {delimiter:'\t',
            columns:['dataSourceName', 'systemCode', 'website', 'linkoutPattern', 'exampleIdentifier', 'entityTypeExpected', 'applicableOnlyToSpecies', 'priority', 'miriamRootUrn', 'regex', 'officialName']} )
            .to.array( function(dataSources){
              _.forEach(dataSources, function(dataSource) {
                // TODO remove this code if the datasources.txt file gets corrected, making these corrections redundant.
                dataSource.miriamRootUrn = dataSource.miriamRootUrn.toLowerCase();
                if (!!dataSource.miriamRootUrn && dataSource.miriamRootUrn.indexOf('urn:miriam') > -1) {
                  if (dataSource.miriamRootUrn === 'urn:miriam:obo.go') {
                    dataSource.miriamRootUrn = 'urn:miriam:go:';
                  }
                  if (dataSource.miriamRootUrn[dataSource.miriamRootUrn.length - 1] !== ':') {
                    dataSource.miriamRootUrn += ':';
                  }
                  dataSource.namespace = dataSource.miriamRootUrn.substring(11, dataSource.miriamRootUrn.length - 1);
                } else {
                  delete dataSource.miriamRootUrn;
                }

                if (!dataSource.exampleIdentifier) {
                  delete dataSource.exampleIdentifier;
                }

                if (!dataSource.applicableOnlyToSpecies) {
                  delete dataSource.applicableOnlyToSpecies;
                }

                if (!dataSource.regex) {
                  delete dataSource.regex;
                }

                if (!!dataSource.entityType) {
                  if (dataSource.entityType === 'gene' || dataSource.entityType === 'probe' || dataSource.namespace === 'go') {
                    dataSource.entityType = 'Dna';
                  } else if (dataSource.entityType === 'rna') {
                    dataSource.entityType = 'Rna';
                  } else if (dataSource.entityType === 'protein') {
                    dataSource.entityType = 'Protein';
                  } else if (dataSource.entityType === 'metabolite') {
                    dataSource.entityType = 'SmallMolecule';
                  } else if (dataSource.entityType === 'pathway') {
                    dataSource.entityType = 'Pathway';
                  }
                }
              });
              callbackOutside(null, dataSources);
            });
        });
      };

      var req = http.request(options, callback);
      req.end();
  }

  function getXrefAliases(args, callbackOutside) {
    var path;
    if (!!args.iri) {
      var iriComponents = args.iri.split('webservice.bridgedb.org');
      path = iriComponents[iriComponents.length - 1];
    } else if (!!args.singleSpecies && !!args.systemCode && typeof args.xRefId !== 'undefined') {
      path = '/' + encodeURIComponent(args.singleSpecies) + '/xrefs/' + encodeURIComponent(args.systemCode) + '/' + encodeURIComponent(args.xRefId);
    } else {
      throw new Error('No IRI (URI) specified.');
    }
    
    console.log('path');
    console.log(path);

      var options = {
        host: 'webservice.bridgedb.org',
        path: path,
        port: '80',
        //This is the only line that is new. `headers` is an object with the headers to request
        headers: {'custom': 'Custom Header Demo works'}
      };

      var callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
          console.log('str');
          console.log(str);
          //*
          csv().from
          .string(
            str,
            {delimiter:'\t',
            columns:['xRefId', 'dataSourceName']} )
            .to.array( function(data){
              callbackOutside(null, data);
            });
        });
      };

      var req = http.request(options, callback);
      req.end();
  }

  return {
    convertToEnsembl:convertToEnsembl,
    getDataSources:getDataSources,
    getXrefAliases:getXrefAliases
  };
}());
