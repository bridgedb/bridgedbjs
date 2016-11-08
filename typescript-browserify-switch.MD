# Progress

Sucessfully compiling from ts to js. Now need to fix bugs with the actual code.

# Switch Browserify-based project to TypeScript

## Directory Structure

Use `src/` directory for the files we edit when developing:

```
mv lib/ src # update or ignore as per your current dir structure
cd src/
```

## File Extensions

For each directory of JS files, rename from `.js` to `.ts` and from `.jsx` to `.tsx`:

```
for f in *.js; do 
mv -- "$f" "${f%.js}.ts"
done
```

## Installation

Install typescript and other dependencies. Include tsify if you'll be using browserify:

```
npm install --save-dev typescript mkdirp tsify
```

Create an empty `index.d.ts` file at the top level of your project.

For each dependency of your library, check whether TypeScript definitions are available as a package named `@types/<module-name>` (module name might be all lowercase), e.g.:

```
https://www.npmjs.com/package/@types/lodash
```

If yes, install:

```
npm install @types/lodash --save-dev
```

If TypeScript definitions are not available, add something like this (at a minimum) to your `index.d.ts` file:

```
declare function hyperquest(any): any;

declare module 'hyperquest' {
	export = hyperquest;
}
```

## ES2015 modules

To import, replace `var _ = require('lodash');` with `import * as _ from 'lodash';`, e.g.:

```
<,'>s/^var/import * as /g
<,'>s/= require(/from /g
<,'>s/);/;/g
```

Replace `module.exports` with `export default`, e.g.:

```
module.exports = Dataset;
```

to

```
export default Dataset;
```

Be sure your local imports do NOT specify a file extension.

Add the following line to the top of each of your files:

```
/// <reference path="../index.d.ts" />
```
