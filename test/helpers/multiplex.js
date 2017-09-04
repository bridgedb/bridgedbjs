process.title = 'multiplex.js';
var _ = require('lodash');
var fs = require('fs');
var Rx = require('rx');

var blessed = require('blessed');

module.exports = function(options) {

  var delayedRender = options.delayedRender;
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
  var headerHeight = 10;
  var top = blessed.box({
    label: headerLabel,
    top: 0,
    left: 0,
    width: '100%',
    height: headerHeight,
    content: '"q" to quit w/out saving. Up/Down keys to scroll.' + headerContent,
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
      fg: 'black',
      bg: 'black',
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
      fg: 'black',
      bg: 'black',
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
    .debounce(16 /* ms */)
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

  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    console.log('Force quit.');
    return process.exit(0);
  });

  var saveSource = Rx.Observable.fromNodeCallback(function(keysToWatch, cb) {
    screen.key(keysToWatch, function(data) {
      return cb(null, 'save');
    });
  })(['enter'])
  .first()
  .doOnNext(function() {
    console.log('Saving and moving to next...');
  });

  var nextSource = Rx.Observable.fromNodeCallback(function(keysToWatch, cb) {
    screen.key(keysToWatch, function(data) {
      return cb(null, 'next');
    });
  })(['n'])
  .first()
  .doOnNext(function() {
    console.log('Moving to next w/out saving...');
  });

  // Focus left box.
  left.focus();

  if (delayedRender) {
    delayedRender(function() {
      screen.render();
    });
  } else {
    screen.render();
  }

  return Rx.Observable.amb(saveSource, nextSource)
  .doOnNext(function(userResponseOnFailure) {
    return screen.destroy();
  });
};
