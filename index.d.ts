///<reference path="./node_modules/@types/rx/index.d.ts" />
///<reference path="./node_modules/@types/rx-node/rx-node.d.ts" />

declare function csv(any): any;
declare module 'csv-streamify' {
	export = csv;
}

interface RxNode {any}
declare namespace Rx {
	export const RxNode: RxNode
}
declare module 'rx-extra' {
	export = Rx;
}

declare function hyperquest(any): any;
declare module 'hyperquest' {
	export = hyperquest;
}
