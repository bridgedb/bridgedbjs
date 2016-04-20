var $ = require('jquery');

var Rx = require('rx-extra');

var yolk = require('yolk');
var h = yolk.h;
var noop = function() {};
var render = yolk.render;
var renderInDocument = require('../../render-in-document');

var BridgeDb = require('../../../lib/main.js');
process.env.MOCKSERVER_PORT = 4522;

var BridgeDbUI = require('../../../lib/ui-components');

describe('kitchen sink of tests', function() {

  it('creates a simple clicker', function() {
    function MyComponent(args) {
      var createEventHandler = args.createEventHandler;
      var handleClick = createEventHandler();

      var numberOfClicks = handleClick
      .scan(function(acc, ev) {
        return acc + 1;
      }, 0)
      .startWith(0);

      return h('.my-counter-component', {},
        h('span#counter', {}, 'Number of clicks: ', numberOfClicks),
        h('button#clicker', {onClick: handleClick}, 'Click me!')
      );
    }

    var vnode = h(MyComponent);
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    assert.equal(node.tagName, 'DIV');

    var $node = $(node);
    var $clicker = $node.find('#clicker');
    $clicker.trigger('click');

    var $counter = $node.find('#counter');
    assert.equal($counter.text(), 'Number of clicks: 1');

    cleanup();
  });

  it('creates a fresh datasource selection element', function(done) {
    var vnode = h(BridgeDbUI, {
      dataset: Rx.Observable.empty()
      //entityReferenceType: Rx.Observable.return('gpml:Metabolite')
      //entityReferenceType: Rx.Observable.empty()
    });
    var result = renderInDocument(vnode);
    var node = result.node;
    var cleanup = result.cleanup;

    setTimeout(function() {
      assert.equal(node.tagName, 'DIV');

      var $node = $(node);

      var $firstOption = $node.find('option').first();
      assert.equal($firstOption.text(), 'Select datasource');

      var $selected = $node.find('[value="http://identifiers.org/ncbigene/"]');
      $selected.trigger('click');
      assert.equal($selected.text(), 'Entrez Gene');

      cleanup();
      done();
    }, 2 * 1000);
  });

  describe('create a datasource selection element', function() {

    it('filtered by GPML entity type (Observable)', function(done) {
      var vnode = h(BridgeDbUI, {
        dataset: Rx.Observable.empty(),
        entityReferenceType: Rx.Observable.return(['gpml:Metabolite'])
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      setTimeout(function() {
        assert.equal(node.tagName, 'DIV');

        var $node = $(node);

        var $metaboliteSelection = $node.find('[value="http://identifiers.org/chembl.compound/"]');
        $metaboliteSelection.trigger('click');
        assert.equal($metaboliteSelection.text(), 'ChEMBL compound');

        var $geneSelection = $node.find('[value="http://identifiers.org/ncbigene/"]');
        assert.equal($geneSelection.length, 0);

        cleanup();
        done();
      }, 2 * 1000);
    });

    it('filtered by GPML entity type (plain object)', function(done) {
      var vnode = h(BridgeDbUI, {
        dataset: Rx.Observable.empty(),
        entityReferenceType: ['gpml:Metabolite']
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      setTimeout(function() {
        assert.equal(node.tagName, 'DIV');

        var $node = $(node);

        var $metaboliteSelection = $node.find('[value="http://identifiers.org/chembl.compound/"]');
        $metaboliteSelection.trigger('click');
        assert.equal($metaboliteSelection.text(), 'ChEMBL compound');

        var $geneSelection = $node.find('[value="http://identifiers.org/ncbigene/"]');
        assert.equal($geneSelection.length, 0);

        cleanup();
        done();
      }, 2 * 1000);
    });

    it('filtered by BioPAX entity type (plain object)', function(done) {
      var vnode = h(BridgeDbUI, {
        dataset: Rx.Observable.empty(),
        entityReferenceType: ['biopax:SmallMoleculeReference']
      });
      var result = renderInDocument(vnode);
      var node = result.node;
      var cleanup = result.cleanup;

      setTimeout(function() {
        assert.equal(node.tagName, 'DIV');

        var $node = $(node);

        var $metaboliteSelection = $node.find('[value="http://identifiers.org/chembl.compound/"]');
        $metaboliteSelection.trigger('click');
        assert.equal($metaboliteSelection.text(), 'ChEMBL compound');

        var $geneSelection = $node.find('[value="http://identifiers.org/ncbigene/"]');
        assert.equal($geneSelection.length, 0);

        cleanup();
        done();
      }, 2 * 1000);
    });

  });

//  it('creates a datasource selection element', function(done) {
//    var vnode = h(BridgeDbUI, {
//      dataset: Rx.Observable.from([{
//        id: 2,
//        name: 'second'
//      }, {
//        id: 1,
//        name: 'first'
//      }]),
//      entityReferenceType: Rx.Observable.from([['gpml:Metabolite']])
//    });
//    var result = renderInDocument(vnode);
//    var node = result.node;
//    var cleanup = result.cleanup;
//
//    setTimeout(function() {
//      assert.equal(node.tagName, 'DIV');
//
//      var $node = $(node);
//
//      console.log('$node82');
//      console.log($node[0]);
//
//      var $first = $node.find('[value="http://identifiers.org/ncbigene/"]');
//      $first.trigger('click');
//      assert.equal($first.text(), 'Entrez Gene');
//
//      cleanup();
//      done();
//    }, 10 * 1000);
//  });

  /*
  it('gets all datasources', function(done) {
    console.log('working...');
    var bridgeDb = new BridgeDb();
//    var bridgeDb = new BridgeDb({
//      baseIri: 'http://localhost:' + process.env.MOCKSERVER_PORT + '/',
//      datasetsMetadataIri:
//          'http://localhost:' + process.env.MOCKSERVER_PORT + '/datasources.txt'
//    });
    bridgeDb.dataset.query()
    .toArray()
    .subscribe(function(result) {
      console.log('result exists? ' + !!result);
      assert.equal(result.length, 137);
      done();
    }, function(err) {
      console.error('err');
      console.error(err);
      done(err);
    });
  });
  //*/

//  it('creates a simple clicker', () => {
//    function Counter ({createEventHandler}) {
//      const handlePlus = createEventHandler(1)
//      const handleMinus = createEventHandler(-1)
//      const count = handlePlus
//                    .merge(handleMinus)
//                    .scan((x, y) => x + y)
//                    .startWith(0)
//
//      return h('div', {},
//        h('button#plus', {onClick: handlePlus}, '+ ', 'PLUS'),
//        h('button#minus', {onClick: handleMinus}, '- ', 'MINUS'),
//        h('span#count', {}, count)
//      )
//    }
//
//    const vnode = h(Counter)
//    const {node, cleanup} = renderInDocument(vnode)
//
//    const $node = $(node)
//    const $plus = $node.find('#plus')
//    const $minus = $node.find('#minus')
//
//    assert.equal(node.tagName, 'DIV')
//    assert.equal(node.children[0].tagName, 'BUTTON')
//    assert.equal(node.children[0].id, 'plus')
//    assert.equal(node.children[0].textContent, '+ PLUS')
//    assert.equal(node.children[1].tagName, 'BUTTON')
//    assert.equal(node.children[1].id, 'minus')
//    assert.equal(node.children[1].textContent, '- MINUS')
//    assert.equal(node.children[2].tagName, 'SPAN')
//    assert.equal(node.children[2].textContent, '0')
//
//    $plus.trigger('click')
//    $plus.trigger('click')
//    $plus.trigger('click')
//    $plus.trigger('click')
//    $minus.trigger('click')
//
//    assert.equal(node.children[2].textContent, '3')
//
//    cleanup();
//  });

});
