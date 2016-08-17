# Switch Browserify-based project to TypeScript

For each directory of JS files, rename from `.js` to `.ts`:

```
for f in *.js; do 
mv -- "$f" "${f%.js}.ts"
done
```

Put TS code in `src/` directory.

Install typescript and tsify:

Needs TypeScript version 2. At time of writing, `typescript` is version 1.8.10, so I used `typescript@next` to get version 2.

```
npm install --save-dev typescript@next tsify
```

Create an empty `index.d.ts` file at the top level of your project.

For each dependency, first check whether TypeScript definitions are available as package `@types/<module-name>` (module name might be all lowercase), e.g.:

```
https://www.npmjs.com/package/@types/lodash
```

If yes, install:

```
npm install @types/lodash --save-dev
```

and import it in your `.ts` files:

```
import * as _ from 'lodash';
```

If TypeScript definitions are not available, add something like this (at a minimum) to your `index.d.ts` file:

```
declare function hyperquest(any): any;

declare module 'hyperquest' {
	export = hyperquest;
}
```

and import it in your `.ts` files:

```
import hyperquest = require('hyperquest');
```

Change your files to use ES2015 modules by replacing `module.exports` with `export default`, e.g.:

```
module.exports = Dataset;
```

to

```
export default Dataset;
```

Add the following line to the top of each of your files:

```
/// <reference path="../index.d.ts" />
```
