'use strict';

//var document = require('global/document');
var document = global.document || require('global/document');
var render = require('yolk').render;

module.exports = function renderInDocument(vnode) {
  var node = document.createElement('div');
  document.body.appendChild(node);

  var cleanup = function() {
    return document.body.removeChild(node);
  };

  render(vnode, node);

  return {
    node: node.firstChild,
    cleanup: cleanup
  };
};
