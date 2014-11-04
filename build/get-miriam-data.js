var _ = require('lodash');
var fs = require('fs');
var highland = require('highland');
var httpErrors = require('../lib/http-errors.js');
var jsonLdContext = require('../lib/context.json');
var JSONStream = require('JSONStream');
var request = require('request');
var sax = require('sax');
var saxMode = 'xml';

function getMiriamData() {
  'use strict';
  var source = 'http://www.ebi.ac.uk/miriam/main/export/xml/';

  // use (saxMode === 'html') when parsing HTML
  var saxStream = sax.createStream((saxMode === 'xml'), {
    xmlns: true
    , trim: true
  });
  var saxEventStream = highland(request({
    url: source,
    withCredentials: false
  }))
  .errors(function (err, push) {
    console.log(err);
    console.log('in entityReferenceService.searchByAttribute()');
  })
  .pipe(saxStream)
  .on('error', function (err) {
    // unhandled errors will throw, since this is a proper node
    // event emitter.
    console.error('error!', err);
    // clear the error
    this._parser.error = null;
    this._parser.resume();
  });

  var openTagStream = highland('opentag', saxEventStream);
  var textStream = highland('text', saxEventStream);
  var closeTagStream = highland('closetag', saxEventStream);

  var desiredTagNames = [
    'datatype',
    'uri',
    'name',
    'synonym',
    'namespace'
  ];

  var dbTagNames = [
    'name',
    'synonym',
    'namespace'
  ];

  return highland.merge([
    openTagStream.filter(function(element) {
      return desiredTagNames.indexOf(element.name) > -1;
    }),
    textStream,
    closeTagStream.filter(function(element) {
      return desiredTagNames.indexOf(element) > -1;
    })
  ])
  .pipe(highland.pipeline(function(s) {
    var newElement;
    var currentTagName;
    var currentTextIsPossiblyIdentifiersIri;
    return s.consume(function (err, element, push, next) {
      if (err) {
        // pass errors along the stream and consume next value
        push(err);
        next();
      } else if (element === highland.nil) {
        // pass nil (end event) along the stream
        push(null, element);
      } else {
        var elementName = element.name;
        if (!!elementName) {
          currentTagName = elementName;
        } else if (element === currentTagName) {
          currentTagName = null;
        }

        if (elementName === 'uri') {
          var attributes = element.attributes;
          var deprecatedAttribute = attributes.deprecated;
          var deprecated = !!deprecatedAttribute ? Boolean(deprecatedAttribute.value) : false;
          currentTextIsPossiblyIdentifiersIri = deprecated ? !deprecated : attributes.type.value === 'URL';
        } else if (currentTagName === 'uri') {
          newElement.iris.push(element);
          if (currentTextIsPossiblyIdentifiersIri && element.indexOf('identifiers.org') > -1) {
            newElement.identifiersIri = element;
          }
        } else if (dbTagNames.indexOf(elementName) === -1 && dbTagNames.indexOf(currentTagName) > -1) {
          newElement.dbNames.push(element);
        } else if (element === 'datatype') {
          push(null, newElement);
        } else if (elementName === 'datatype') {
          newElement = {};
          newElement.iris = [];
          newElement.dbNames = [];
          newElement.identifierPattern = element.attributes.pattern.value;
        }
        next();
      }
    });
  }));
}

//*
getMiriamData().each(function(data) {
  console.log('data');
  console.log(data);
});
//*/

/*
getMiriamData()
.pipe(JSONStream.stringify())
.pipe(fs.createWriteStream('./miriam-data.json'));
//*/

exports = module.exports = getMiriamData;

