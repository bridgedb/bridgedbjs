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
  var headerLabel = options.header.label || '';
  var headerContent = options.header.content || '';
  // TODO trying to better handle showing any errors and yet
  // having the diff at the bottom. But the error(s) may take up
  // a varying amount of space. Fix this.
  var headerHeight = 30;
  var top = blessed.box({
    label: headerLabel,
    top: 0,
    left: 0,
    width: '100%',
    height: headerHeight,
    content: 'Quit with Ctrl-Q (even for OS/X). Scroll with Up/Down keys.' + headerContent,
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
  var leftLabel = options.left.label || 'left';
  var leftContent = options.left.content || '';
  var leftHeight = options.left.height ||
      '100%-' + String(headerHeight);
  var left = blessed.box({
    label: leftLabel,
    top: headerHeight,
    left: 0,
    width: '50%',
    height: leftHeight,
    content: leftContent,
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
  var rightLabel = options.right.label || 'right';
  var rightContent = options.right.content || '';
  var rightHeight = options.right.height ||
      '100%-' + String(headerHeight);
  var right = blessed.box({
    label: rightLabel,
    top: headerHeight,
    left: '50%-1',
    width: '50%',
    height: rightHeight,
    content: rightContent,
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

    function scrollBoth(value) {
      contentBoxes.forEach(function(box) {
        box.scroll(value);
      });
      screen.render();
    }
    function up() {
      scrollBoth(-1);
    }
    function down() {
      scrollBoth(1);
    }

    var pageHeight = box.getScrollHeight();
    function pageUp() {
      scrollBoth(-1 * pageHeight);
    }
    function pageDown() {
      scrollBoth(1 * pageHeight);
    }

    function pageUpHalf() {
      scrollBoth(-1 * pageHeight / 2);
    }
    function pageDownHalf() {
      scrollBoth(1 * pageHeight / 2);
    }

    box.key('up', up);
    box.key('k', up);

    box.key('down', down);
    box.key('j', down);

    box.key('C-b', pageUp);
    box.key('C-f', pageDown);

    box.key('C-u', pageUpHalf);
    box.key('C-d', pageDownHalf);
  });

  screen.key('C-q', function() {
    return screen.destroy();
  });

  // Focus left box.
  left.focus();

  // TODO trying to better handle showing any errors and yet
  // having the diff at the bottom. But the error(s) may take up
  // a varying amount of space. Fix this.
  setTimeout(function() {
    screen.render();
  }, 1500);
};
