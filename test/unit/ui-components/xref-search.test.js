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
  XrefSearch: require('../../../lib/ui-components/xref-search.js')
};

// Note: must be greater than the debounce period
var timeout = 500;

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

describe('create an xref search element', function() {
  it('add query and run', function(done) {
    var query$ = new Rx.Subject();
    var vnode = h(bridgeDbUI.XrefSearch, {
      //query: query$,
      query: 'ENSG00000012048',
      organism: 'Homo sapiens',
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    var $node = $(node);

    //query$.onNext('ENSG00000012048');

    setTimeout(function() {
      assert.equal(node.tagName, 'DIV');

      console.log('node');
      console.log(node);

      assert.equal($node.val(), 'ENSG00000012048');

      $node.val('672');
      fireEvent($node[0], 'change');
      assert.equal($node.val(), '672');

      cleanup();
      done();
    }, timeout);
  });

});
