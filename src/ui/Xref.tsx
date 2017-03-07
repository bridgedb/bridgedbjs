// this is still in progress; not done yet.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {DataSourceSelect} from './DataSourceSelect';
import {WPEntityTypeSelect} from './EntityTypeSelect';

export class Xref extends React.Component<any, any> {
	handleEntityTypeUpdate: Function;
	handleDataSourceUpdate: Function;
  constructor(props) {
		super(props);
    this.state = {
			organism: props.organism,
			entityType: props.entityType,
			dataSource: props.dataSource,
			identifier: props.identifier,
		};
  }
  render() {
		let that = this;
		that.handleEntityTypeUpdate = function(entityType) {
			that.setState({entityType: entityType});
		};
		that.handleDataSourceUpdate = function(dataSource) {
			that.setState({dataSource: dataSource});
		};
		let entityTypeSelectStyle = {
			float: 'left'
		};
		let dataSourceSelectStyle = {
			float: 'left'
		};
		let identifierStyle = {
			float: 'left'
		};
		return <div>
			<WPEntityTypeSelect
				style={entityTypeSelectStyle}
				entityType={that.state.entityType}
				updateHandler={that.handleEntityTypeUpdate}></WPEntityTypeSelect>
			<DataSourceSelect
				style={dataSourceSelectStyle}
				organism={that.state.organism}
				entityType={that.state.entityType}
				dataSource={that.state.dataSource}
				updateHandler={that.handleDataSourceUpdate}></DataSourceSelect>
			<span style={identifierStyle}>
				<input value={that.state.identifier}
					onChange={function(e) {
						that.setState({identifier: e.currentTarget.value});
					}}></input>
			</span>
			<br/>
			<br/>
			<br/>
			<div>props: {JSON.stringify(that.props)}</div>
			<br/>
			<div>state: {JSON.stringify(that.state)}</div>
		</div>;
	}
}
