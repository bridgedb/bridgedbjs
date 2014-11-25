bridgedbjs (v1.0.10)
===================

JS client for the [BridgeDB](http://bridgedb.org) id mapping framework [webservices](http://bridgedb.org/wiki/BridgeWebservice/).
Not all the functionality of the BridgeDB webservices are exposed by this library yet, but pull requests are welcomed.

##[API Documentation](https://bridgedb.github.io/bridgedbjs/docs/)

## Installation
Browser
```html
<script src="https://bridgedb.github.io/bridgedbjs/dist/bridgedb-1.0.10.min.js"></script>
```

Node.js
```
npm install bridgedb
```

## Example
```js
Bridgedb = require('bridgedb'); // Omit this line if using in browser

var myBridgedbInstance = Bridgedb({
  apiUrlStub: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php',
  datasourcesUrl: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
myBridgedbInstance.entityReferenceService.searchByAttribute({
  attribute: 'Nfkb1',
  organism: 'Mouse'
}).each(function(searchResults) {
  console.log('Result for Nfkb1');
  console.log(searchResults);
});
```

Most methods return [Node.js streams](http://nodejs.org/api/stream.html). Anywhere the return type is listed as a Stream, you can use ```each``` as shown above.
You can also ```pipe``` the stream through another stream or use any of the other functionality from the [Highland stream library](http://highlandjs.org/).

For more examples, see the [test directory](https://github.com/bridgedb/bridgedbjs/tree/master/test).

## Using with Java
To use with Java, you can use [Nashorn](http://openjdk.java.net/projects/nashorn/), [Rhino](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino) or [DynJS](http://dynjs.org/).

Nashorn tutorials:
* http://www.oracle.com/technetwork/articles/java/jf14-nashorn-2126515.html
* http://winterbe.com/posts/2014/04/05/java8-nashorn-tutorial/
* https://www.youtube.com/watch?v=Cxyg22C5gcw
