// TODO make this an actual functioning integration of the components.
// this is largely just a placeholder so far.

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var fs = require('fs');
//var mockserverMocha  =  require('../../mockserver-mocha.js');
//var RxFs = require('rx-fs');
var sinon      = require('sinon');
//var testUtils = require('../../test-utils');
//var wd = require('wd');

var expect = chai.expect;
chai.use(chaiAsPromised);
chai.should();
//chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var $ = require('jquery');

var Rx = require('rx-extra');

var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../../render-in-document');

var BridgeDb = require('../../../lib/main.js');
process.env.MOCKSERVER_PORT = 4522;

var BridgeDbUIElement = require('../../../lib/ui-components');

var timeout = 3000;

function fireEvent(node, eventName) {
  // Make sure we use the ownerDocument from the provided node to avoid cross-window problems
  var doc;
  var event;
  if (node.ownerDocument) {
    doc = node.ownerDocument;
  } else if (node.nodeType == 9) {
    // the node may be the document itself, nodeType 9 = DOCUMENT_NODE
    doc = node;
  } else {
    throw new Error('Invalid node passed to fireEvent: ' + node.id);
  }

  if (node.dispatchEvent) {
    // Gecko-style approach (now the standard) takes more work
    var eventClass = '';

    // Different events have different event classes.
    // If this switch statement can't map an eventName to an eventClass,
    // the event firing is going to fail.
    switch (eventName) {
      // Dispatching of 'click' appears to not work correctly in Safari.
      // Use 'mousedown' or 'mouseup' instead.
      case 'click':
      case 'mousedown':
      case 'mouseup':
        eventClass = 'MouseEvents';
        break;

      case 'focus':
      case 'change':
      case 'blur':
      case 'select':
        eventClass = 'HTMLEvents';
        break;

      default:
        throw 'fireEvent: Couldn\'t find an event class for event \'' + eventName + '\'.';
    }
    event = doc.createEvent(eventClass);

    var bubbles = eventName == 'change' ? false : true;
    event.initEvent(eventName, bubbles, true); // All events created as bubbling and cancelable.

    event.synthetic = true; // allow detection of synthetic events
    // The second parameter says go ahead with the default action
    node.dispatchEvent(event, true);
  } else if (node.fireEvent) {
    // IE-old school style
    event = doc.createEventObject();
    event.synthetic = true; // allow detection of synthetic events
    node.fireEvent('on' + eventName, event);
  }
}

describe('create a combo ui element', function() {

  it('should have correct initial value defaults when nothing is pre-selected', function(done) {
    //var spy = sinon.spy(h);
    var vnode = h(BridgeDbUIElement, {
      entityReference: Rx.Observable.return({
        organism: 'Homo sapiens',
      }),
    });

    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    setTimeout(function() {
      expect(node.tagName).to.equal('DIV');
      //expect(spy.callCount).to.equal(1);

      var entityReferenceSearchEl = node.querySelector('#entity-reference-search-input');
      var $entityReferenceSearch = $(entityReferenceSearchEl);
      expect(entityReferenceSearchEl.tagName).to.equal('INPUT');
      expect($entityReferenceSearch.val()).to.equal('');

      var entityTypeEl = node.querySelector('select');
      var $entityType = $(entityTypeEl);
      expect(entityTypeEl.tagName).to.equal('SELECT');
      expect($entityType.find('option:selected').text()).to.equal('Select type');

      var datasourceEl = node.querySelector('.pvjs-editor-dataset');
      var $datasource = $(datasourceEl);
      expect(datasourceEl.tagName).to.equal('SELECT');
      expect($datasource.find('option:selected').text()).to.equal('Select datasource');

      var identifierEl = node.querySelector('.pvjs-editor-identifier');
      var $identifier = $(identifierEl);
      expect(identifierEl.tagName).to.equal('INPUT');
      expect($identifier.val()).to.equal('');

      cleanup();
      done();
    }, timeout);
  });

//  it('should have correct initial value defaults when entity type is pre-selected',
//  function(done) {
//    var vnode = h(BridgeDbUIElement, {
//      organism: 'Homo sapiens',
//      entityReferenceType: Rx.Observable.return('gpml:Metabolite'),
//    });
//
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    var $node = $(node);
//
//    setTimeout(function() {
//      expect(node.tagName).to.equal('DIV');
//
//      var entityReferenceSearch = node.querySelector('#entity-reference-search-input');
//      var $entityReferenceSearch = $(entityReferenceSearch);
//      expect(entityReferenceSearch.tagName).to.equal('INPUT');
//      expect($entityReferenceSearch.val()).to.equal('');
//
//      var entityTypeEl = node.querySelector('select');
//      var $entityType = $(entityTypeEl);
//      expect(entityTypeEl.tagName).to.equal('SELECT');
//      expect($entityType.find('option:selected').text()).to.equal('Metabolite');
//
//      var datasourceEl = node.querySelector('.pvjs-editor-dataset');
//      var $datasource = $(datasourceEl);
//      expect(datasourceEl.tagName).to.equal('SELECT');
//      expect($datasource.find('option:selected').text()).to.equal('Select datasource');
//
//      var identifierEl = node.querySelector('.pvjs-editor-identifier');
//      var $identifier = $(identifierEl);
//      expect(identifierEl.tagName).to.equal('INPUT');
//      expect($identifier.val()).to.equal('');
//
//      cleanup();
//      done();
//    }, timeout);
//  });

  it('should have correct initial value defaults when all are pre-selected', function(done) {
    var vnode = h(BridgeDbUIElement, {
      entityReference: Rx.Observable.return({
        organism: 'Homo sapiens',
        type: ['gpml:Metabolite'],
        isDataItemIn: {
          id: 'http://identifiers.org/cas/'
        },
        identifier: '50-00-0',
      }),
    });

    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    setTimeout(function() {
      expect(node.tagName).to.equal('DIV');

      var entityReferenceSearchEl = node.querySelector('#entity-referenceSearch-search-input');
      var $entityReferenceSearch = $(entityReferenceSearchEl);
      expect(entityReferenceSearchEl.tagName).to.equal('INPUT');
      expect($entityReferenceSearch.val()).to.equal('');

      var entityTypeEl = node.querySelector('select');
      var $entityType = $(entityTypeEl);
      expect(entityTypeEl.tagName).to.equal('SELECT');
      expect($entityType.find('option:selected').text()).to.equal('Metabolite');

      var datasourceEl = node.querySelector('.pvjs-editor-dataset');
      var $datasource = $(datasourceEl);
      expect(datasourceEl.tagName).to.equal('SELECT');
      expect($datasource.find('option:selected').text()).to.equal('CAS');

      var identifierEl = node.querySelector('.pvjs-editor-identifier');
      var $identifier = $(identifierEl);
      expect(identifierEl.tagName).to.equal('INPUT');
      expect($identifier.val()).to.equal('50-00-0');

      cleanup();
      done();
    }, timeout);
  });

//  it('select when entity type is NOT pre-selected', function(done) {
//    var vnode = h(BridgeDbUIElement, {
//      organism: 'Homo sapiens'
//    });
//
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    var $node = $(node);
//
//    setTimeout(function() {
//      expect(node.tagName).to.equal('DIV');
//
//      var entityTypeEl = node.querySelector('select');
//      var $entityType = $(entityTypeEl);
//
//      expect(entityTypeEl.tagName).to.equal('SELECT');
//      expect($entityType.find('option:selected').text()).to.equal('Select type');
//
//      $entityType.val('gpml:GeneProduct');
//      fireEvent($node[0], 'change');
//      //fireEvent(entityTypeEl, 'change');
////      assert.equal($entityType.find('option:selected').text(), 'Gene Product');
//
//      cleanup();
//      done();
//    }, timeout);
//  });

//  it('select when entity type is pre-selected', function(done) {
//    var selectedEntityType$ = new Rx.Subject();
//    var vnode = h(bridgeDbUI.EntityTypeControl, {
//      entityType: selectedEntityType$,
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    var $node = $(node);
//
//    selectedEntityType$.onNext({
//      id: 'gpml:GeneProduct'
//    });
//
//    setTimeout(function() {
//      assert.equal(node.tagName, 'SELECT');
//
//      assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//      $node.val('biopax:Pathway');
//      fireEvent($node[0], 'change');
//      assert.equal($node.find('option:selected').text(), 'Pathway');
//
//      $node.val('gpml:Metabolite');
//      fireEvent($node[0], 'change');
//      assert.equal($node.find('option:selected').text(), 'Metabolite');
//
//      cleanup();
//      done();
//    }, timeout);
//  });

//  it('enable and then select', function(done) {
//    var disabled$ = new Rx.Subject();
//    var vnode = h(bridgeDbUI.EntityTypeControl, {
//      disabled: disabled$
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    var $node = $(node);
//
//    disabled$.onNext(true);
//
//    setTimeout(function() {
//      assert.equal(node.tagName, 'SELECT');
//
//      assert.equal($node.prop('disabled'), true);
//
//      setTimeout(function() {
//        disabled$.onNext(false);
//
//        assert.equal($node.find('option:selected').text(), 'Select type');
//        assert.equal($node.prop('disabled'), false);
//
//        $node.val('biopax:Pathway');
//        fireEvent($node[0], 'change');
//        assert.equal($node.find('option:selected').text(), 'Pathway');
//
//        $node.val('gpml:Metabolite');
//        fireEvent($node[0], 'change');
//        assert.equal($node.find('option:selected').text(), 'Metabolite');
//
//        cleanup();
//        done();
//      }, timeout);
//    }, timeout);
//  });
//
//  it('programmatically set entity type', function(done) {
//    var selectedEntityType$ = new Rx.Subject();
//    var vnode = h(bridgeDbUI.EntityTypeControl, {
//      entityType: selectedEntityType$,
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    var $node = $(node);
//
//    selectedEntityType$.onNext({
//      id: 'gpml:GeneProduct'
//    });
//
//    setTimeout(function() {
//      assert.equal(node.tagName, 'SELECT');
//
//      assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//      cleanup();
//      done();
//    }, timeout);
//  });
//
//  it('programmatically set entity type and then programmatically update', function(done) {
//    var selectedEntityType$ = new Rx.Subject();
//    var vnode = h(bridgeDbUI.EntityTypeControl, {
//      entityType: selectedEntityType$,
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    selectedEntityType$.onNext({
//      id: 'gpml:GeneProduct'
//    });
//
//    var $node = $(node);
//
//    assert.equal(node.tagName, 'SELECT');
//
//    setTimeout(function() {
//      assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//      selectedEntityType$.onNext({
//        id: 'gpml:GeneProduct'
//      });
//
//      assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//      setTimeout(function() {
//        assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//        selectedEntityType$.onNext({
//          id: 'biopax:Protein'
//        });
//
//        assert.equal($node.find('option:selected').text(), 'Protein');
//
//        setTimeout(function() {
//          assert.equal($node.find('option:selected').text(), 'Protein');
//
//          cleanup();
//          done();
//        }, timeout);
//      }, timeout);
//    }, timeout);
//  });
//
//  it('programmatically set entity type and then select', function(done) {
//    var selectedEntityType$ = new Rx.Subject();
//    var vnode = h(bridgeDbUI.EntityTypeControl, {
//      entityType: selectedEntityType$,
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    selectedEntityType$.onNext({
//      id: 'gpml:GeneProduct'
//    });
//
//    var $node = $(node);
//
//    assert.equal(node.tagName, 'SELECT');
//
//    setTimeout(function() {
//      assert.equal($node.find('option:selected').text(), 'Gene Product');
//
//      $node.val('biopax:Pathway');
//      fireEvent($node[0], 'change');
//      assert.equal($node.find('option:selected').text(), 'Pathway');
//
//      cleanup();
//      done();
//
//    }, timeout);
//  });
});
