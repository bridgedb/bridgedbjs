bridgedbjs (v2.0.2)
===================

JS client for the [BridgeDb](http://bridgedb.org) ID mapping framework [webservices](http://bridgedb.org/wiki/BridgeWebservice/).
Not all the functionality of the BridgeDb webservices are exposed by this library yet, but pull requests are welcomed.

##[API Documentation](https://bridgedb.github.io/bridgedbjs/docs/)

## Installation

**Browser**
```html
<script src="https://bridgedb.github.io/bridgedbjs/dist/bridgedb-2.0.2.min.js"></script>
```

**Node.js**
```
npm install bridgedb
```

**Java/JVM**

To use with Java/JVM, try [Nashorn (Java 8+)](http://openjdk.java.net/projects/nashorn/), [Rhino (Java <8)](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino) or [DynJS](http://dynjs.org/).

Nashorn tutorials:
* http://www.oracle.com/technetwork/articles/java/jf14-nashorn-2126515.html
* http://winterbe.com/posts/2014/04/05/java8-nashorn-tutorial/
* https://www.youtube.com/watch?v=Cxyg22C5gcw

## Example
```js
BridgeDb = require('bridgedb'); // Omit this line if using in browser

var myBridgeDbInstance = BridgeDb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
myBridgeDbInstance.entityReferenceService.searchByAttribute({
  attribute: 'Nfkb1',
  organism: 'Mouse'
}).each(function(searchResult) {
  console.log('Result for Nfkb1');
  console.log(searchResult);
});
```

Most methods return [Node.js streams](http://nodejs.org/api/stream.html). Anywhere the return type is listed as a Stream, you can use ```each``` as shown above.
You can also ```pipe``` the stream through another stream or use any of the other functionality from the [Highland stream library](http://highlandjs.org/).

For more examples, see the [test directory](https://github.com/bridgedb/bridgedbjs/tree/master/test).
