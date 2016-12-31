import Bridgedb from '../main';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

let bridgedb = new Bridgedb({
  baseIri: 'http://localhost:4522/',
	dataSourcesHeadersIri: 'http://localhost:4522/datasources_headers.txt',
	dataSourcesMetadataIri: 'http://localhost:4522/datasources.txt',
});

class DataSource extends React.Component<any, any> {
  render() {
		return <span>DataSource: {this.props.value}, </span>;
	}
	componentDidMount() {
		let that = this;
		//*
		bridgedb.sourceDataSources('Human')
			.subscribe(console.log, console.log);
		//*/
	}
}

export default DataSource;
