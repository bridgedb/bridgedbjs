process.title = 'multiplex.js';
var _ = require('lodash');
var fs = require('fs');
var Rx = require('rx');

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
  function getLineNumber(el) {
    var bottomIndex;
    var topIndex;
    var gScroll;
    var lineNr;
    var scroll;
    var str;

    // Scroll index of either top or bottom visible line
    gScroll = el.getScroll();

    if (scrolledUp) {
      topIndex = gScroll;
      bottomIndex = topIndex + el.height - 1;
    } else {
      bottomIndex = gScroll;
      topIndex = bottomIndex - el.height + 1;
    }

    return data.y - el.top + topIndex;
  }

  top.content += 'initial_left_gScroll:' + left.getScroll() + ',';

  var dummyScroll = 10;
  // see https://github.com/chjj/blessed/issues/76
  function getMatchingScrollIndex(driver, driverScrolledUp, follower, lastScrollIndex) {
    var driverBottomIndex;
    var driverTopIndex;

    var followerBottomIndex;
    var followerTopIndex;

    // Scroll index of either top or bottom visible line
    var driverScrollIndex = driver.getScroll();
    var followerScrollIndex = follower.getScroll();

    if (driverScrolledUp) {
      driverTopIndex = driverScrollIndex;
      driverBottomIndex = driverTopIndex + driver.height - 1;
    } else {
      driverBottomIndex = driverScrollIndex;
      driverTopIndex = driverBottomIndex - driver.height + 1;
    }

    var followerScrolledUp = lastScrollIndex > followerScrollIndex;
    if (followerScrolledUp) {
      followerTopIndex = followerScrollIndex;
      followerBottomIndex = followerTopIndex + follower.height - 1;
    } else {
      followerBottomIndex = followerScrollIndex;
      followerTopIndex = followerBottomIndex - follower.height + 1;
    }

    var updatedFollowerScrollIndex;
    if (driverScrolledUp) {
      updatedFollowerScrollIndex = driverTopIndex;
    } else {
      updatedFollowerScrollIndex = driverTopIndex + 2;
    }
    top.content += 'driverScrollIndex:' + driverScrollIndex + ',';
    top.content += 'followerScrollIndex:' + followerScrollIndex + ',';
    top.content += 'driverTopIndex:' + driverTopIndex + ',';
    top.content += 'followerTopIndex:' + followerTopIndex + ',';
    top.content += 'driverBottomIndex:' + driverBottomIndex + ',';
    top.content += 'followerBottomIndex:' + followerBottomIndex + ',';
    top.content += 'updatedFollowerScrollIndex:' + updatedFollowerScrollIndex + ',';
    top.content += 'passes:' + (updatedFollowerScrollIndex === dummyScroll) + ',';
    //return dummyScroll;
    return updatedFollowerScrollIndex;
  }

  setTimeout(function() {
    dummyScroll = 15;
    left.scrollTo(dummyScroll);
  }, 1000);

  setTimeout(function() {
    dummyScroll = 6;
    left.scrollTo(dummyScroll);
  }, 2000);

  setTimeout(function() {
    dummyScroll = 3;
    left.scrollTo(dummyScroll);
  }, 3000);

  top.content += 'height:' + left.height + ',';
  var lastScrollIndex = 0;
  var contentBoxes = [left, right];
  contentBoxes.forEach(function(box) {
    var otherContentBoxes = contentBoxes.filter(function(filterBox) {
      return filterBox !== box;
    });

    top.content += '**START**' + ',';
    top.content += 'driver_scrollIndex:' + box.getScroll() + ',';

    var scrollDriverSource = Rx.Observable.fromEvent(box, 'scroll', function(data) {
      //top.content += 'data: ' + data + '\n';
      return data;
    })
    .debounce(500 /* ms */)
    .concatMap(function(data) {
      // if not equal, current box was scrolled, so its
      // scroll index is the desired scroll index for all
      // any other content box(es).
      var currentScrollIndex = box.getScroll();
      if (currentScrollIndex !== lastScrollIndex) {
        var driverScrolledUp = currentScrollIndex < lastScrollIndex;

        var isDriver = currentScrollIndex !== lastScrollIndex;
        top.content += 'follower_scrollIndex:' + otherContentBoxes[0].getScroll() + ',';
        top.content += 'lastScrollIndex:' + lastScrollIndex + ',';
        top.content += 'updatedScrollIndex:' + currentScrollIndex + ',';
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
        //top.content += 'follower:';
        //var matchingScrollIndex = getMatchingScrollIndex(follower, driverScrolledUp);
        var matchingScrollIndex = getMatchingScrollIndex(
            box, driverScrolledUp, follower, lastScrollIndex);
        //top.content += 'driver:';
        //var matchingScrollIndex2 = getMatchingScrollIndex(box, driverScrolledUp);
        //top.content += 'driverScrolledUp: ' + driverScrolledUp + '\n';
        //top.content += 'matchingScrollIndex: ' + matchingScrollIndex + '\n';
        //top.content += 'updatedScrollIndex(2): ' + updatedScrollIndex + '\n';
        /*
        if (driverScrolledUp) {
          follower.scroll(-1);
        } else {
          follower.scroll(1);
        }
        //*/
        follower.scrollTo(matchingScrollIndex);
        //follower.scrollTo(updatedScrollIndex);
        top.content += 'driver_scrollIndex:' + box.getScroll() + ',';
        top.content += 'follower_scrollIndex:' + follower.getScroll() + ',';
        top.content += 'getMatchingScrollIndex(2):';
        getMatchingScrollIndex(box, driverScrolledUp, follower, lastScrollIndex);
      });
      lastScrollIndex = updatedScrollIndex;
      followerScrolledUp = driverScrolledUp;
      screen.render();
    }, function(err) {
      throw err;
    });

    /*
    box.on('scroll', function(data) {
      var currentScrollIndex = box.getScroll();
      // if not equal, current box was scrolled, so its
      // scroll index is the desired scroll index for all
      // any other content box(es).
      var isDriver = currentScrollIndex !== lastScrollIndex;
      top.content += '******************' + '\n';
      top.content += '******************' + '\n';
      top.content += 'otherContentBoxes count: ' + otherContentBoxes.length + '\n';
      top.content += 'lastScrollIndex: ' + lastScrollIndex + '\n';
      top.content += 'currentScrollIndex: ' + currentScrollIndex + '\n';
      top.content += 'isDriver: ' + isDriver + '\n';
      if (currentScrollIndex !== lastScrollIndex) {
        top.content += 'Desired new scroll index is ' + currentScrollIndex + '\n';
        // TODO is there a way to identify which box (left or right) is the
        // current one and to then get the "other" box,
        // e.g., the right one if the left one was scrolled?
        contentBoxes
        .filter(function(oneBox) {
          var isFollower = oneBox.getScroll() !== currentScrollIndex;
          top.content += 'isFollower: ' + isFollower + '\n';
          return oneBox.getScroll() !== currentScrollIndex;
        })
        .forEach(function(follower) {
          top.content += 'follower.getScroll() "' + follower.getScroll() + '"\n';
          top.content += 'currentScrollIndex(2): ' + currentScrollIndex + '\n';
          top.content += 'lastScrollIndex(2): ' + lastScrollIndex + '\n';
          top.content += 'makes sense: ' + (currentScrollIndex !== follower.getScroll()) + '\n';
          follower.scrollTo(currentScrollIndex);
        });
        lastScrollIndex = currentScrollIndex;
        screen.render();
      }
    });
    //*/

    box.key('s', function(data) {
      var currentScrollIndex = box.getScroll();
      top.content += 'currentScrollIndex "' + currentScrollIndex + '"\n';
      box.scrollTo(currentScrollIndex);
      currentScrollIndex2 = box.getScroll();
      top.content += 'currentScrollIndex2 "' + currentScrollIndex2 + '"\n';
      screen.render();
    });

    box.on('click', function(data) {
      top.content = 'box "' + box + '"';
      box.focus();
      screen.render();
    });

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
    left.focus();
    screen.render();
  }, 1500);
};
