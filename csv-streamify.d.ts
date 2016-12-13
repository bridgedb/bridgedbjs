declare interface CsvOptions {
	objectMode: boolean,
	delimiter: string
}

declare function csv(csvOptions: CsvOptions): NodeJS.ReadWriteStream;
declare module 'csv-streamify' {
	export = csv;
}
