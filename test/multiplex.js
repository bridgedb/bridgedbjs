process.title = 'multiplex.js';
var _ = require('lodash');
var fs = require('fs');

var blessed = require('blessed');

module.exports = function(options) {
  var screen;

  screen = blessed.screen({
    smartCSR: true,
    //log: process.env.HOME + '/blessed-terminal.log',
    fullUnicode: true,
    dockBorders: true,
    ignoreDockContrast: true
  });

  options.header = options.header || {};
  options.header.label = options.header.label || '';
  options.header.content = options.header.content || '';
  var headerHeight = 3;
  var top = blessed.box({
    label: options.header.label,
    top: 0,
    left: 0,
    width: '100%',
    height: headerHeight,
    content: 'Quit with Ctrl/Cmd-Q. Scroll with Up/Down keys.' + options.header.content,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'default',
      bg: 'default',
      hover: {
        border: {
          fg: 'green'
        }
      }
    }
  });

  options.left = options.left || {};
  options.left.label = options.left.label || 'left';
  options.left.content = options.left.content || '';
  var left = blessed.box({
    label: options.left.label,
    top: headerHeight,
    left: 0,
    width: '50%',
    height: '100%-' + String(headerHeight),
    content: options.left.content,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'default',
      bg: 'default',
      hover: {
        border: {
          fg: 'green'
        }
      }
    },
    scrollable: true
  });

  options.right = options.right || {};
  options.right.label = options.right.label || 'right';
  options.right.content = options.right.content || '';
  var right = blessed.box({
    label: options.right.label,
    top: headerHeight,
    left: '50%-1',
    width: '50%',
    height: '100%-' + String(headerHeight),
    content: options.right.content,
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'default',
      bg: 'default',
      hover: {
        border: {
          fg: 'green'
        }
      }
    },
    scrollable: true
  });

  [top, left, right].forEach(function(box) {
    screen.append(box);
  });

  var contentBoxes = [left, right];
  contentBoxes.forEach(function(box) {
    box.on('click', function(data) {
      box.focus();
      screen.render();
    });

    function scroll(value) {
      contentBoxes.forEach(function(box) {
        box.scroll(value);
      });
      screen.render();
    }
    function down() {
      scroll(1);
    }
    function up() {
      scroll(-1);
    }
    box.key('down', down);
    box.key('j', down);
    box.key('up', up);
    box.key('k', up);
  });

  screen.key('C-q', function() {
    return screen.destroy();
  });

  // Focus left box.
  left.focus();

  screen.render();
};
