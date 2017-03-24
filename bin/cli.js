#!/usr/bin/env node

var _ = require('lodash');
var crypto = require('crypto');
var csv = require('csv-streamify');
var fs = require('fs');
var BridgeDb = require('../lib').BridgeDb;
var hl = require('highland');
var ndjson = require('ndjson');
var npmPackage = JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf8'}));
var program = require('commander');
var Rx = require('rx-extra');
var VError = require('verror');

program
  .version(npmPackage.version)
  .description('CLI client for BridgeDb ID mapping webservice.');

program
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    Display xrefs in command line:');
    console.log('    $ bridgedb xrefs \'Homo sapiens\' \'Entrez Gene\' 1234');
    console.log();
    console.log('    Save multiple xrefs to new file:');
    console.log([
      '    $ bridgedb xrefsBatch ',
      '--organism=\'Homo sapiens\' --database=\'Entrez Gene\' ',
      '< ./test/dbNamesAndIds.csv > ./xrefs.json',
    ].join(''));
  });

// npm run compile:es5 && node bin/cli.js xrefs 'Homo sapiens' 'Entrez Gene' '1234'
program
  .command('xrefs <organism> <database> <identifier>')
  .action(function (organism, database, identifier) {
    var bridgeDb = new BridgeDb();

    var serialize = ndjson.serialize();
    bridgeDb.xrefs(organism, database, identifier)
      .throughNodeStream(serialize)
      .subscribe(function(output) {
        process.stdout.write(output);
      }, function(err) {
        console.error(err);
        process.exit(1);
      }, function() {
        process.exit(0);
      });
  });

/*
Compile, if needed:
npm run compile:es5

Run it, as in one of the following examples:

echo $'1234\n1235\n' | node bin/cli.js xrefsBatch --organism 'Homo sapiens' --database 'Entrez Gene'

node bin/cli.js xrefsBatch --organism 'Homo sapiens' --database 'Entrez Gene' <<< $'1234\n1235\n'

echo $'identifier\n1234\n1235\n' | node bin/cli.js xrefsBatch --organism 'Homo sapiens'
    --database 'Entrez Gene' --headers=true

cat test/dbIds.csv | node bin/cli.js xrefsBatch --organism="Homo sapiens" --database="Entrez Gene"

node bin/cli.js xrefsBatch --organism="Homo sapiens" < test/dbNamesAndIds.csv

cat test/dbNamesAndIds.csv | node bin/cli.js xrefsBatch --organism="Homo sapiens"
*/
program
  .command('xrefsBatch [identifierColumn] [databaseColumn] [organismColumn]')
  .description('Get xrefs for entities in a delimited file (CSV, TSV, etc.)')
  .option('-d, --delimiter [string]',
          'Delimiter for file, e.g., "," or "\t". Default: ","')
  .option('--organism [string]',
          'If organismColumn not specified, set organism, e.g., "Homo sapiens"')
  .option('--database [string]',
          'If databaseColumn not specified, set database, e.g., "Entrez Gene"')
  .option('--headers [boolean]',
          'First row of file is headers')
  .action(function (identifierColumnStr, databaseColumnStr, organismColumnStr, options) {
    var organismOption = options.organism;
    var databaseOption = options.database;
    var headersOption = options.hasOwnProperty('headers') ? Boolean(options.headers) : false;
    var delimiterOption = options.delimiter || ',';
    var newlineOption = options.newline || '\n'; // newline character (use \r\n for CRLF files)
    var quoteOption = options.quote || '"';

    var organismColumn = typeof organismColumnStr !== 'undefined' ?
      parseInt(organismColumnStr)
    :
      typeof organismOption === 'undefined' ?
        0
      :
        null;

    var databaseColumn = typeof databaseColumnStr !== 'undefined' ?
      parseInt(databaseColumnStr)
    :
      typeof databaseOption === 'undefined' ?
        organismColumn === null ? 0 : organismColumn + 1
      :
        null;

    var identifierColumn = typeof identifierColumnStr !== 'undefined' ?
      parseInt(identifierColumnStr)
    :
      typeof identifierOption === 'undefined' ?
        databaseColumn === null ? 0 : databaseColumn + 1
      :
        null;

    var bridgeDb = new BridgeDb();

    var parser = csv({
      delimiter: delimiterOption,
      newline: newlineOption,  
      quote: quoteOption,
      objectMode: true,
    });

    Rx.Observable.fromNodeReadableStream(
      hl(process.stdin)
        .through(parser)
        .drop(headersOption ? 1 : 0)
    )
      .mergeMap(function(row) {
        var organism = typeof organismOption !== 'undefined' ? organismOption : row[organismColumn];
        var database = typeof databaseOption !== 'undefined' ? databaseOption : row[databaseColumn];
        var identifier = typeof identifierOption !== 'undefined' ?
          identifierOption : row[identifierColumn];
        var serialize = ndjson.serialize();
        return bridgeDb.xrefs(organism, database, identifier)
          .toArray()
          .map(function(xrefs) {
            return {
              organism: organism,
              database: database,
              identifier: identifier,
              xrefs: xrefs,
            };
          })
          .throughNodeStream(serialize);
      })
      .subscribe(function(output) {
        process.stdout.write(output);
      }, function(err) {
        console.error(err);
        process.exit(1);
      }, function() {
        process.exit(0);
      });

  });

program.parse(process.argv);
