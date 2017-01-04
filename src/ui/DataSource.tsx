import Bridgedb from '../main';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

let bridgedb = new Bridgedb({
  baseIri: 'http://localhost:4522/',
	dataSourcesHeadersIri: 'http://localhost:4522/datasources_headers.txt',
	dataSourcesMetadataIri: 'http://localhost:4522/datasources.txt',
});

class DataSource extends React.Component<any, any> {
	constructor(props) {
		super(props);
		this.state = {
			names: [props.value],
			values: [props.value],
			selected: props.value
		};
	}
  render() {
		let that = this;
		return <span> DataSource:
			<select name="select" value={that.state.selected}>
				{that.state.values.map((value) => <option key={value} value={value}>{value}</option>)}
			</select>
		</span> ;
	}
	componentDidMount() {
		let that = this;
		bridgedb.sourceDataSources('Human')
			.reduce(function(acc, ds) {
				acc.names.push(ds.conventionalName);
				acc.values.push(ds.conventionalName);
				return acc;
			}, {
				names: [],
				values: [],
				selected: that.props.value
			})
			.do(function(state) {
				state.selected = that.state.selected;
				that.setState(state);
			})
			.subscribe(console.log, console.log);
	}
}

export default DataSource;
