import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DataSource from './DataSource';

class Xref extends React.Component<any, any> {
  render() {
		return <div>
			<span>Type: {this.props.type}, </span>
			<DataSource value={this.props.dataSource}></DataSource>
			<span>Identifier: {this.props.identifier}</span>
		</div>;
	}
}

export default Xref;
