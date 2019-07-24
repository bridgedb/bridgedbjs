var replaceStream = require("replacestream");
var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var hl = require("highland");
var ndjson = require("ndjson");
var JSONStream = require("JSONStream");
var npmPackage = require("../package.json");
var Rx = require("rx-extra");
require("../es5/spinoffs/pipeToStdout");
require("../es5/spinoffs/toNodeStream");
var VError = require("verror");

const NEST0_OBJECT_KEY = "BRIDGEDB_NEST0_OBJECT_KEY";

/*
echo '[{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
./bin/bridgedb xrefs -f json -i ".[]"\
Human ".[].xrefDataSource" ".[].xrefIdentifier"\
ensembl ncbigene uniprot wikidata
 */

// path options
// https://www.npmjs.com/package/node-red-contrib-json
// JSONata: https://github.com/jsonata-js/jsonata/blob/master/tutorial.md
// JSON Path: http://goessner.net/articles/JsonPath/
// jq
// ...

function parseJQPath(path) {
  return path
    .replace(/^\./, "")
    .split(".")
    .reduce((acc, s) => {
      (s.match(/(\w+)?(\[\w*\])?/) || [])
        .slice(1)
        .filter(_.negate(_.isUndefined))
        .map(s => (s === "[]" ? true : s.replace(/\[(\w+)\]/, "\1")))
        //.map(s => s.replace(/\[(\w+)\]/, "\1").replace(/\[\]/, true))
        .forEach(function(s) {
          acc.push(s);
        });
      return acc;
    }, []);
}

function resolveJQPath(base, relativePath) {
  if (base.endsWith(".") && relativePath.startsWith(".")) {
    return base + relativePath.replace(/^\./, "");
  } else if (base.endsWith(".") || relativePath.startsWith(".")) {
    return base + relativePath;
  } else {
    return base + "." + relativePath;
  }
}

/* _.get doesn't allow for path to indicate identity.
 * this function allows the parsed path to be [], indicating
 * we just want to return the entire value.
 */
function getByParsedPath(value, path) {
  if (path.length > 0) {
    return _.get(value, path);
  } else {
    return value;
  }
}

module.exports = function(
  bridgeDb,
  organism,
  pathToXrefDataSource,
  pathToXrefIdentifier,
  desiredXrefDataSources,
  { base, format, insertionPoint }
) {
  var pathToInsertionPoint = insertionPoint;

  var { common, relPaths } = _.zip
    .apply(
      undefined,
      [pathToXrefDataSource, pathToXrefIdentifier]
        .map(p => resolveJQPath(base, p))
        .map(parseJQPath)
    )
    .reduce(
      function(acc, pair, i) {
        const { common, relPaths } = acc;
        const [first, second] = pair;
        acc.matched = acc.matched && first === second;
        if (acc.matched) {
          common.push(first);
        } else {
          pair.forEach(function(p, i) {
            if (acc.relPaths[i]) {
              acc.relPaths[i].push(p);
            } else {
              acc.relPaths[i] = [p];
            }
          });
        }
        return acc;
      },
      { matched: true, common: [], relPaths: [] }
    );

  const commonIndexOfTrue = common.indexOf(true);
  var JSONStreamParentPath = common.slice(
    0,
    commonIndexOfTrue > -1 ? commonIndexOfTrue : common.length - 1
  );
  var JSONStreamPath;
  if (common.length > 0) {
    JSONStreamPath = _.concat(JSONStreamParentPath, [{ emitPath: true }]);
  } else {
    JSONStreamPath = [];
    // NOTE: using emitPath doesn't work when the input is just one object (Map).
    // We want to get the following to be consistent with other inputs:
    // {"path": [], value: THE_INPUT_OBJECT}
    // But we actually get the key/value pairs of the input object.
    // So we need to use the kludge above.
    //var JSONStreamPath = [{emitPath: true}];
  }
  var containerParser = JSONStream.parse(
    JSONStreamPath.length > 0 ? JSONStreamPath : undefined
  );

  var rootKey = common[0];

  const [
    relPathToXrefDataSourceParsed,
    relPathToXrefIdentifierParsed
  ] = relPaths;

  if (_.intersection(_.uniq(relPaths), [true]).length > 0) {
    if (common.lastIndexOf(true) > 1) {
      throw new Error(
        `Currently unable to handle more than one level of nesting before "[]".

      These are OK:
      .a
      .a.z
      .a.z.x
      .a.z.x.y
      .[]
      .[].z
      .[].z.y
      .[].z.y.x
      .a[]
      .a[].z
      .a[].z.y
      .a[].z.y.x
    
      These are not:
      .a.b[]
      .a.b.c[]
      `
      );
    } else {
      throw new Error(
        `There must only be one xrefDataSource per xrefIdentifier, but
    provided paths may violate that constraint.
    `
      );
    }
  }

  const pathToInsertionPointParsed = parseJQPath(
    resolveJQPath(base, pathToInsertionPoint)
  );
  const addLocally =
    pathToInsertionPointParsed.join().indexOf(common.join()) === 0;

  var headerStream = hl("header", containerParser).map(function(result) {
    return {
      event: "header",
      path: [],
      value: result
    };
  });

  var dataStream = hl("data", containerParser);

  var footerStream = hl("footer", containerParser).map(function(result) {
    return {
      event: "footer",
      path: [],
      value: result
    };
  });

  var endStream = hl("end", containerParser);

  var lastCommonKey = common.slice(-1)[0] || NEST0_OBJECT_KEY;
  var parsedDataStream = dataStream
    .map(function(data) {
      if (JSONStreamPath.length > 0) {
        return data;
      } else {
        // This kludge is needed to handle un-nested objects as input, e.g.,
        // {"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}
        // We want process them same way we do for other inputs to JSONStream.parse.
        return { path: [NEST0_OBJECT_KEY], value: data };
      }
    })
    .reduce({ inputXrefsById: {} }, function(acc, data) {
      const { value, path } = data;
      const valueKey = path.slice(-1)[0];
      if (!("valuesByKey" in acc)) {
        acc.valuesByKey = _.isFinite(valueKey) ? [] : {};
      }
      var valuesByKey = acc.valuesByKey;

      var entityKey =
        lastCommonKey !== true ? lastCommonKey : path.slice(-1)[0];

      var entityPathRelToValue = common
        .slice(JSONStreamPath.length)
        .map(s => (s === true ? entityKey : s));
      var entity = getByParsedPath(value, entityPathRelToValue);
      var xrefDataSource = getByParsedPath(
        entity,
        relPathToXrefDataSourceParsed
      );
      var xrefIdentifier = getByParsedPath(
        entity,
        relPathToXrefIdentifierParsed
      );
      if (xrefDataSource && xrefIdentifier) {
        const entityPathRelToValuesByKey = [valueKey].concat(
          entityPathRelToValue
        );
        var xrefDataSourceAndIdentifier = [xrefDataSource, xrefIdentifier].join(
          ":"
        );
        if (acc.inputXrefsById[xrefDataSourceAndIdentifier]) {
          acc.inputXrefsById[xrefDataSourceAndIdentifier].entityPaths.push(
            entityPathRelToValuesByKey
          );
        } else {
          acc.inputXrefsById[xrefDataSourceAndIdentifier] = {
            entityPaths: [entityPathRelToValuesByKey],
            xrefDataSource: xrefDataSource,
            xrefIdentifier: xrefIdentifier
          };
        }
      }
      valuesByKey[valueKey] = value;
      return acc;
    })
    .flatMap(function(reducedData) {
      var { inputXrefsById, valuesByKey } = reducedData;
      var inputXrefs = _.values(reducedData.inputXrefsById);
      var inputXrefDataSources = _.uniq(
        inputXrefs.map(function(inputXref) {
          return inputXref.xrefDataSource;
        })
      );

      const validInputXrefDataSources$ = hl(
        _.uniq(
          inputXrefs.map(function(inputXref) {
            return inputXref.xrefDataSource;
          })
        )
      ).flatMap(function(inputXrefDataSource) {
        return bridgeDb
          .identifyHeaderNameForXrefDataSource(inputXrefDataSource)
          .filter(function(inputXrefDataSourceType) {
            return inputXrefDataSourceType !== null;
          })
          .map(function(inputXrefDataSourceType) {
            return inputXrefDataSource;
          })
          .toNodeStream();
      });

      return validInputXrefDataSources$
        .collect()
        .flatMap(function(validInputXrefDataSources) {
          const validInputXrefs = inputXrefs.filter(({ xrefDataSource }) => {
            return validInputXrefDataSources.indexOf(xrefDataSource) > -1;
          });

          if (validInputXrefs.length === 0) {
            console.warn("No valid input xrefs found.");
            return hl();
          }
          return bridgeDb
            .xrefsBatch(
              organism,
              validInputXrefs.map(({ xrefDataSource }) => xrefDataSource),
              validInputXrefs.map(({ xrefIdentifier }) => xrefIdentifier),
              desiredXrefDataSources
            )
            .map(function(xrefsResult) {
              const { inputXrefDataSource, inputXrefIdentifier } = xrefsResult;
              xrefsResult.inputId = [
                inputXrefDataSource,
                inputXrefIdentifier
              ].join(":");
              return xrefsResult;
            })
            .filter(function(xrefsResult) {
              // TODO we can probably get rid of this. It's only here
              // b/c my dummy server returns incorrect xrefs.
              return xrefsResult.inputId in inputXrefsById;
            })
            .toArray()
            .toNodeStream()
            .map(function(xrefsResults) {
              if (pathToInsertionPoint === "none") {
                return xrefsResults;
              }

              /*
               * Consider specifying the xref in entitiesById and
                        then adding the mappings to sameAs.
               * Then for the SVG, we might only use "type" for class
                        but use type + mapped sameAs for typeof???
                //*/

              xrefsResults.forEach(function(xrefsResult) {
                var inputXrefId = xrefsResult.inputId;
                if (addLocally) {
                  inputXrefsById[inputXrefId].entityPaths.forEach(function(
                    entityPath
                  ) {
                    var entity = getByParsedPath(valuesByKey, entityPath);
                    var whereToAdd = pathToInsertionPointParsed.slice(
                      common.length
                    );
                    var xrefContainer =
                      getByParsedPath(entity, whereToAdd) || [];
                    var xrefMapping;
                    if (!_.isArray(xrefContainer)) {
                      xrefsResult.xrefs.map(function(xref) {
                        var { xrefDataSource, xrefIdentifier } = xref;
                        if (!(xrefDataSource in xrefContainer)) {
                          xrefContainer[xrefDataSource] = xrefIdentifier;
                        } else {
                          const preexistingXrefDataSource =
                            xrefContainer[xrefDataSource];
                          if (_.isString(preexistingXrefDataSource)) {
                            if (preexistingXrefDataSource !== xrefIdentifier) {
                              xrefContainer[xrefDataSource] = [
                                preexistingXrefDataSource,
                                xrefIdentifier
                              ];
                            }
                          } else if (_.isArray(preexistingXrefDataSource)) {
                            if (
                              preexistingXrefDataSource.indexOf(
                                xrefIdentifier
                              ) === -1
                            ) {
                              xrefContainer[xrefDataSource].push(
                                xrefIdentifier
                              );
                            }
                          } else {
                            console.warn(`
Property ${xrefDataSource} already set at specified path, and
it's not a string or array. Skipping addition of ${xrefIdentifier}.`);
                            console.warn(JSON.stringify(entity));
                          }
                        }
                      });
                    } else {
                      xrefsResult.xrefs.map(function(xref) {
                        var mappedXref = [
                          xref.xrefDataSource,
                          xref.xrefIdentifier
                        ].join(":");
                        if (xrefContainer.indexOf(mappedXref) === -1) {
                          xrefContainer.push(mappedXref);
                        }
                      });
                    }
                    if (xrefContainer !== entity) {
                      _.set(entity, whereToAdd, xrefContainer);
                    }
                  });
                } else {
                  var xrefMapping;
                  var xrefMappingStarter = {
                    closeMatch: []
                  };
                  if (!_.isArray(valuesByKey)) {
                    if (!(inputXrefId in valuesByKey)) {
                      xrefMapping = valuesByKey[
                        inputXrefId
                      ] = xrefMappingStarter;
                    } else {
                      xrefMapping = valuesByKey[inputXrefId];
                    }
                  } else {
                    xrefMapping = _.find(
                      ({ id }) => id === inputXrefId,
                      valuesByKey
                    );
                    if (!xrefMapping) {
                      xrefMapping = xrefMappingStarter;
                      valuesByKey.push(xrefMapping);
                    }
                  }

                  if (!("id" in xrefMapping)) {
                    xrefMapping.id = inputXrefId;
                  }

                  if (!("closeMatch" in xrefMapping)) {
                    xrefMapping.closeMatch = [];
                  }
                  var closeMatch = xrefMapping.closeMatch;
                  xrefsResult.xrefs.map(function(xref) {
                    var mappedXref = [
                      xref.xrefDataSource,
                      xref.xrefIdentifier
                    ].join(":");
                    if (closeMatch.indexOf(mappedXref) === -1) {
                      closeMatch.push(mappedXref);
                    }
                  });
                }
              });

              return {
                event: "data",
                path: JSONStreamParentPath,
                value:
                  NEST0_OBJECT_KEY in valuesByKey
                    ? valuesByKey[NEST0_OBJECT_KEY]
                    : valuesByKey
              };
            });
        });
    });

  process.stdin.pipe(containerParser);

  endStream.each(function() {
    headerStream.write(hl.nil);
    dataStream.write(hl.nil);
    footerStream.write(hl.nil);
    /*
    headerStream.end();
    dataStream.end();
    footerStream.end();
    //*/
  });

  var stringifier;
  var i = 0;

  if (pathToInsertionPoint === "none") {
    return (
      parsedDataStream
        .flatMap(x => hl(x[0].xrefs))
        //.through(JSONStream.stringify(false))
        .through(ndjson.serialize())
        .pipe(process.stdout)
    );
  }

  return hl([headerStream, parsedDataStream, footerStream])
    .merge()
    .reduce({}, function(acc, result) {
      var { path, value, event } = result;
      if (_.isArray(value)) {
        if (i === 0) {
          stringifier = JSONStream.stringify();
          if (_.isEmpty(path)) {
            acc = [];
          }
        }
        if (_.isEmpty(path)) {
          value.forEach(function(v) {
            acc.push(v);
          });
        } else {
          _.updateWith(
            acc,
            path,
            nsValue =>
              typeof nsValue === "undefined"
                ? value
                : _.isArray(nsValue)
                ? nsValue.concat(value)
                : _.assign(nsValue, value),
            (nsValue, key, nsObject) =>
              nsValue || _.isFinite(parseInt(key)) ? Array : Object
          );
        }
      } else {
        if (i === 0) {
          stringifier = JSONStream.stringify(false);
          //stringifier = JSONStream.stringifyObject();
        }
        if (_.isEmpty(path)) {
          acc = _.assign(acc, value);
        } else {
          _.updateWith(
            acc,
            path,
            nsValue =>
              _.isArray(nsValue)
                ? nsValue.concat(value)
                : _.assign(nsValue, value),
            (nsValue, key, nsObject) => (nsValue || _.isFinite(key) ? [] : {})
          );
        }
      }
      i += 1;
      return acc;
    })
    .flatMap(function(s) {
      return hl(_.isArray(s) ? s : [s])
        .through(stringifier)
        .concat(hl(["\n"]));
    })
    .pipe(process.stdout);
};
