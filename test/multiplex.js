process.title = 'multiplex.js';
var _ = require('lodash');
var fs = require('fs');
var Rx = require('rx');

var blessed = require('blessed');

module.exports = function(options, errorMessage) {
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
  var headerContent = (options.header.content || '') + '\n' + errorMessage;
  // TODO trying to better handle showing any errors and yet
  // having the diff at the bottom. But the error(s) may take up
  // a varying amount of space. Fix this.
  var headerHeight = 10;
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
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
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
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
  });

  [top, left, right].forEach(function(box) {
    screen.append(box);
  });

  // see https://github.com/chjj/blessed/issues/76
  function getMatchingScrollIndex(driver, driverScrolledUp) {
    var driverBottomIndex;
    var driverTopIndex;

    // Scroll index of either top or bottom visible line
    var driverScrollIndex = driver.getScroll();

    if (driverScrolledUp) {
      driverTopIndex = driverScrollIndex;
      driverBottomIndex = driverTopIndex + driver.height - 1;
    } else {
      driverBottomIndex = driverScrollIndex;
      driverTopIndex = driverBottomIndex - driver.height + 1;
    }

    var updatedFollowerScrollIndex;
    if (driverScrolledUp) {
      updatedFollowerScrollIndex = driverTopIndex;
    } else {
      updatedFollowerScrollIndex = driverTopIndex + 2;
    }
    return updatedFollowerScrollIndex;
  }

  // setting initial value
  var lastScrollIndex = 0;
  var contentBoxes = [left, right];
  contentBoxes.forEach(function(box) {
    var otherContentBoxes = contentBoxes.filter(function(filterBox) {
      return filterBox !== box;
    });

    var scrollDriverSource = Rx.Observable.fromEvent(box, 'scroll', function(data) {
      return data;
    })
    .debounce(300 /* ms */)
    .concatMap(function(data) {
      // if not equal, current box was scrolled, so its
      // scroll index is the desired scroll index for all
      // any other content box(es).
      var currentScrollIndex = box.getScroll();
      if (currentScrollIndex !== lastScrollIndex) {
        var driverScrolledUp = currentScrollIndex < lastScrollIndex;

        var isDriver = currentScrollIndex !== lastScrollIndex;
        return Rx.Observable.return({
          updatedScrollIndex: currentScrollIndex,
          driverScrolledUp: driverScrolledUp
        });
      } else {
        return Rx.Observable.empty();
      }
    });

    scrollDriverSource
    .subscribe(function(data) {
      var updatedScrollIndex = data.updatedScrollIndex;
      var driverScrolledUp = data.driverScrolledUp;
      otherContentBoxes
      .forEach(function(follower) {
        var matchingScrollIndex = getMatchingScrollIndex(box, driverScrolledUp);
        follower.scrollTo(matchingScrollIndex);
      });
      lastScrollIndex = updatedScrollIndex;
      screen.render();
    }, function(err) {
      throw err;
    });

    box.on('click', function(data) {
      top.content = 'box "' + box + '"';
      box.focus();
      screen.render();
    });
  });

  var quitSource = Rx.Observable.fromNodeCallback(function(keysToWatch, cb) {
    screen.key(keysToWatch, function(data) {
      console.log('data205');
      console.log(data);
      top.content += '\nTrying to quit...\n';
      screen.render();
      return cb(null, data);
    });
  })(['escape', 'q', 'C-c'])
  .first()
  .doOnNext(function() {
    top.content += '\nQuitting...\n';
    screen.render();
    return screen.destroy();
  });

  // Focus left box.
  left.focus();

  // TODO trying to better handle showing any errors and yet
  // having the diff at the bottom. But the error(s) may take up
  // a varying amount of space. Fix this.
  setTimeout(function() {
    left.focus();
    screen.render();
  }, 1100);

  return quitSource;
};
