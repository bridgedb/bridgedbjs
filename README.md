bridgedb-5.0.13
===================

JS client for the [BridgeDb](http://bridgedb.org) ID mapping framework [webservice](http://webservice.bridgedb.org/).

##[API Documentation](https://bridgedb.github.io/bridgedbjs/docs/)

## Installation

**Browser**
```html
<script src="https://bridgedb.github.io/bridgedbjs/dist/bridgedb-5.0.13.min.js"></script>
```

**Node.js**
```
npm install --save bridgedb
```

## Simple Example
```js
var BridgeDb = require('bridgedb').default; // Omit this line unless you're using Node.js

var bridgeDbInstance = new BridgeDb();
bridgeDbInstance.search('Mouse', 'Nfkb1')
  .subscribe(function(searchResult) {
    console.log('Result for Nfkb1');
    console.log(searchResult);
  });
```

## More Complex Example
Use ES2015, options and error catching.
```js
import BridgeDb from 'bridgedb';

const bridgeDbInstance = new BridgeDb({
  baseIri: 'http://example.org/',
  dataSourcesHeadersIri: 'http://example.org/data-sources-headers.txt'
  dataSourcesMetadataIri 'http://example.org/data-sources.txt',
});
bridgeDbInstance.search('Mouse', 'Nfkb1')
  .subscribe(function(searchResult) {
    console.log('Result for Nfkb1');
    console.log(searchResult);
  }, function(err) {
    throw err;
  }, function() {
    console.log('complete');
  });
```

The methods return [RxJS Observables](https://github.com/ReactiveX/rxjs), meaning can use `subscribe` as shown above to get the next values, catch errors and be notified when the observable is complete.

For more examples, see the [test directory](https://github.com/bridgedb/bridgedbjs/tree/master/test).

## For Developers

1. Install [Node.js](https://nodejs.org/)
2. Fork this repo (if you don't have commit rights to it)
3. `git clone https://github.com/bridgedb/bridgedbjs.git` (or use your fork's URL)
4. `cd bridgedbjs`
5. `npm install`
6. Make sure the tests pass: [test documentation](./test/README.md).
7. Refactor the code. Add new tests for your changes if not already covered by the existing tests.
8. Make sure the tests all pass.
9. Send a pull request from your local repo to the master branch of this repo.


## Dependencies

Each time this library is instantiated, it downloads the following files:

* [datasources_headers.txt](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources_headers.txt)
* [datasources.txt](https://github.com/bridgedb/BridgeDb/blob/master/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt)

These files are accessed via the [RawGit CDN](http://rawgit.com/). The desired version of the files to download is specified in `src/main.ts` as the commit hash of the latest release of `bridgedbjs`, e.g/, `24186142d05b5f811893970b9a5d61a06f241f68` to produce a URL like https://cdn.rawgit.com/bridgedb/BridgeDb/24186142d05b5f811893970b9a5d61a06f241f68/org.bridgedb.bio/resources/org/bridgedb/bio/datasources.txt

## TODOs
* [ ] Set up mockserver so it "caches" the API response from an endpoint the first time it's called. Right now, we need to create new mocks for API endpoints manually. (I have the code for doing this already working somewhere.)
* [ ] UI components
  * [ ] Use React without Redux.
  * [ ] Make it possible to use the UI components individually and in any combination.
  * [ ] Build tests. Current tests are not working.
* [ ] Check handling of no results returned for `attributeSearch` for both the API client and the UI component.
* [ ] Possibly require that inputs to `attributeSearch` be at least three characters in length.

## Troubleshooting
`npm install` throws an error like `library not found for -lgcc_s.10.5`
* This appears to be particular to certain Node and OS X versions and can be [fixed with a symlink](http://stackoverflow.com/questions/31936170/npm-the-ld-library-not-found-for-lgcc-s-10-5-on-on-os-x-el-capitain): >`cd /usr/local/lib` >`sudo ln -s ../../lib/libSystem.B.dylib libgcc_s.10.5.dylib`
