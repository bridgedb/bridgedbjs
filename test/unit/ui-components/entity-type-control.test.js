var $ = require('jquery');

var Rx = require('rx-extra');

var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../../render-in-document');

var BridgeDb = require('../../../lib/main.js');
process.env.MOCKSERVER_PORT = 4522;

var bridgeDbUI = {
  EntityTypeControl: require('../../../lib/ui-components/entity-type-control.js')
};

var timeout = 300;

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

describe('create an entity type select (dropdown) element', function() {
  it('select when entity type is NOT pre-selected', function(done) {
    var vnode = h(bridgeDbUI.EntityTypeControl);
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    setTimeout(function() {
      assert.equal(node.tagName, 'SELECT');
      assert.equal($node.find('option:selected').text(), 'Select type');

      $node.val('gpml:GeneProduct');
      fireEvent($node[0], 'change');
      assert.equal($node.find('option:selected').text(), 'Gene Product');

      cleanup();
      done();
    }, timeout);
  });

  it('select when entity type is pre-selected', function(done) {
    var selectedEntityType$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.EntityTypeControl, {
      entityType: selectedEntityType$,
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    selectedEntityType$.onNext({
      id: 'gpml:GeneProduct'
    });

    setTimeout(function() {
      assert.equal(node.tagName, 'SELECT');

      assert.equal($node.find('option:selected').text(), 'Gene Product');

      $node.val('biopax:Pathway');
      fireEvent($node[0], 'change');
      assert.equal($node.find('option:selected').text(), 'Pathway');

      $node.val('gpml:Metabolite');
      fireEvent($node[0], 'change');
      assert.equal($node.find('option:selected').text(), 'Metabolite');

      cleanup();
      done();
    }, timeout);
  });

  it('enable and then select', function(done) {
    var disabled$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.EntityTypeControl, {
      disabled: disabled$
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    disabled$.onNext(true);

    setTimeout(function() {
      assert.equal(node.tagName, 'SELECT');

      assert.equal($node.prop('disabled'), true);

      setTimeout(function() {
        disabled$.onNext(false);

        assert.equal($node.find('option:selected').text(), 'Select type');
        assert.equal($node.prop('disabled'), false);

        $node.val('biopax:Pathway');
        fireEvent($node[0], 'change');
        assert.equal($node.find('option:selected').text(), 'Pathway');

        $node.val('gpml:Metabolite');
        fireEvent($node[0], 'change');
        assert.equal($node.find('option:selected').text(), 'Metabolite');

        cleanup();
        done();
      }, timeout);
    }, timeout);
  });

  it('programmatically set entity type', function(done) {
    var selectedEntityType$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.EntityTypeControl, {
      entityType: selectedEntityType$,
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    selectedEntityType$.onNext({
      id: 'gpml:GeneProduct'
    });

    setTimeout(function() {
      assert.equal(node.tagName, 'SELECT');

      assert.equal($node.find('option:selected').text(), 'Gene Product');

      cleanup();
      done();
    }, timeout);
  });

  it('programmatically set entity type and then programmatically update', function(done) {
    var selectedEntityType$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.EntityTypeControl, {
      entityType: selectedEntityType$,
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    selectedEntityType$.onNext({
      id: 'gpml:GeneProduct'
    });

    var $node = $(node);

    assert.equal(node.tagName, 'SELECT');

    setTimeout(function() {
      assert.equal($node.find('option:selected').text(), 'Gene Product');

      selectedEntityType$.onNext({
        id: 'gpml:GeneProduct'
      });

      assert.equal($node.find('option:selected').text(), 'Gene Product');

      setTimeout(function() {
        assert.equal($node.find('option:selected').text(), 'Gene Product');

        selectedEntityType$.onNext({
          id: 'biopax:Protein'
        });

        assert.equal($node.find('option:selected').text(), 'Protein');

        setTimeout(function() {
          assert.equal($node.find('option:selected').text(), 'Protein');

          cleanup();
          done();
        }, timeout);
      }, timeout);
    }, timeout);
  });

  it('programmatically set entity type and then select', function(done) {
    var selectedEntityType$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.EntityTypeControl, {
      entityType: selectedEntityType$,
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    selectedEntityType$.onNext({
      id: 'gpml:GeneProduct'
    });

    var $node = $(node);

    assert.equal(node.tagName, 'SELECT');

    setTimeout(function() {
      assert.equal($node.find('option:selected').text(), 'Gene Product');

      $node.val('biopax:Pathway');
      fireEvent($node[0], 'change');
      assert.equal($node.find('option:selected').text(), 'Pathway');

      cleanup();
      done();

    }, timeout);
  });
});
