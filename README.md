bridgedb-5.0.13
===================

JS client for the [BridgeDb](http://bridgedb.org) ID mapping framework [webservice](http://bridgedb.org/wiki/BridgeWebservice/).
Not all the functionality of the BridgeDb webservice are exposed by this library yet. Pull requests are welcome!

##[API Documentation](https://bridgedb.github.io/bridgedbjs/docs/)

## Installation

**Browser**
```html
<script src="https://bridgedb.github.io/bridgedbjs/dist/bridgedb-5.0.13.min.js"></script>
```

**Node.js**
```
npm install bridgedb
```

## Example
```js
var BridgeDb = require('bridgedb'); // Omit this line unless you're using Node.js

var myBridgeDbInstance = new BridgeDb({
  baseIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/',
  datasetsMetadataIri: 'http://pointer.ucsf.edu/d3/r/data-sources/bridgedb-datasources.php'
});
myBridgeDbInstance.entityReference.freeSearch({
  attribute: 'Nfkb1',
  organism: 'Mouse'
})
.subscribe(function(searchResult) {
  console.log('Result for Nfkb1');
  console.log(searchResult);
});
```

Most methods return [RxJS Observablves](https://github.com/Reactive-Extensions/RxJS). Anywhere the return type is listed as an `Observable`, you can use ```subscribe``` as shown above.

For more examples, see the [test directory](https://github.com/bridgedb/bridgedbjs/tree/master/test).

## For Developers

1. Install [Node.js](https://nodejs.org/)
2. Fork this repo (if you don't have commit rights to it)
3. `git clone https://github.com/bridgedb/bridgedbjs.git` (or use your fork's URL)
4. `cd ./bridgedbjs`
5. `npm install`
6. Make sure the tests pass: [test documentation](./test/README.md).
7. Refactor the code. Add new tests for your changes if not already covered by the existing tests.
8. Make sure the tests all pass.
9. ~~To merge your changes into master if you don't have commits rights to this repo:~~ (these steps currently don't work quite right. see [issue](https://github.com/bridgedb/bridgedbjs/issues/3)):

  a) Commit your changes to the master branch of your local repo.

  b) Build:
    ```
    gulp build
    ```

  c) Send us a pull request from your local repo to the master branch of this repo.

  d) Then we can create a new release and update the github pages:
    ```
    gulp publish
    ```

## Dependencies

Currently, this library uses http://pointer.ucsf.edu/d3/r/data-sources/bridgedb.php/ as a proxy to allow for making CORS requests to the BridgeDb webservice.

This library actively relies on the following files (downloads them each time it's loaded):

* [jsonld-context.jsonld](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.rdf/resources/jsonld-context.jsonld)
* [datasources.txt](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt)

These files are accessed via the [RawGit CDN](http://rawgit.com/), frozen to the latest commit as of the time of the latest release of `bridgedbjs`, e.g.:
https://cdn.rawgit.com/bridgedb/BridgeDb/24186142d05b5f811893970b9a5d61a06f241f68/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt

This library also passively relies on these files (does not download, but some code is based on their content):
* [datasources_headers.txt](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt)
* [organisms.txt](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/organisms.txt)

TODO: move the `taxonomy` IRIs from [./lib/organism.js](https://github.com/bridgedb/bridgedbjs/blob/master/lib/organism.js#L35) into the organisms.txt file and then download that file upon loading this library to get the mappings.

TODO: download datasources_headers.txt to get the headers upon loading this library, instead of [hard-coding them here](https://github.com/bridgedb/bridgedbjs/blob/master/lib/dataset.js#L124).

TODO: update npm dependency versions for the libraries we've created. Some of them are just using `npm link` to get the latest on my dev machine.
TODO: update terms like `dataset` vs. `datasource` with AP to be sure we're using the desired consensus terms.
TODO: enable caching of results.
TODO: improve handling of no results returned for entity reference search, including the UI component. Possibly disable searching for strings less than three characters in length.
TODO: make it possible to use the UI components individually and in any combination.
TODO: test UI components. Their tests are not currently working.

## Troubleshooting
```npm install``` throws an error like ```library not found for -lgcc_s.10.5```
* This appears to be particular to certain Node and OS X versions and can be [fixed with a symlink](http://stackoverflow.com/questions/31936170/npm-the-ld-library-not-found-for-lgcc-s-10-5-on-on-os-x-el-capitain): >```cd /usr/local/lib``` >```sudo ln -s ../../lib/libSystem.B.dylib libgcc_s.10.5.dylib```
