bridgedbjs (v4.1.0)
===================

JS client for the [BridgeDb](http://bridgedb.org) ID mapping framework [webservice](http://bridgedb.org/wiki/BridgeWebservice/).
Not all the functionality of the BridgeDb webservice are exposed by this library yet. Pull requests are welcome!

##[API Documentation](https://bridgedb.github.io/bridgedbjs/docs/)

## Installation

**Browser**
```html
<script src="https://bridgedb.github.io/bridgedbjs/dist/bridgedb-4.1.0.min.js"></script>
```

**Node.js**
```
npm install bridgedb
```

**Java/JVM**

Use BridgeDb-Java instead. If you really want to use this, you can try [Nashorn (Java 8+)](http://openjdk.java.net/projects/nashorn/), [Rhino (Java <8)](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino) or [DynJS](http://dynjs.org/).

Nashorn tutorials:
* [Oracle introduction](http://www.oracle.com/technetwork/articles/java/jf14-nashorn-2126515.html)
* [Winterbe tutorial](http://winterbe.com/posts/2014/04/05/java8-nashorn-tutorial/)
* [Video](https://www.youtube.com/watch?v=Cxyg22C5gcw)

## Example
```js
BridgeDb = require('bridgedb'); // Omit this line unless you're using Node.js

var myBridgeDbInstance = BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
myBridgeDbInstance.entityReference.freeSearch({
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

## How To Get Involved

To run tests during development, check out the [test documentation](./test/README.md).

To build bridgedbjs and update github repo:

1) Commit changes to the master branch of your local repo.

2) Build:

```
gulp build
```

3) Create new release and update pages at github:

```
gulp publish
```

4) Send us a pull request.
