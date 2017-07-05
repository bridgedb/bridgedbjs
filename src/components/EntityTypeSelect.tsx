import {BridgeDb} from '../BridgeDb';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Select from 'react-select';
import 'react-select/dist/react-select.css';

export class WPEntityTypeSelect extends React.Component<any, any> {
	constructor(props) {
		super(props);

		const entityTypes = [
			'GeneProduct',
			'Metabolite',
			'Pathway',
			'Protein',
			'Complex',
			'RNA',
			'Unknown',
		];

		this.state = {
			options: entityTypes.map(function(entityType) {
				return {
					label: entityType,
					value: entityType
				};
			}),
			selected: {
				label: props.entityType,
				value: props.entityType
			}
		};
	}
  render() {
		let that = this;
		let state = that.state;

		return <Select
			ref = "select"
			name="select"
			value={state.selected}
			onChange={function(selected){
				if (!!selected && selected.hasOwnProperty('value')) {
					that.setState({selected: selected});
					that.props.updateHandler(selected.value);
				} else {
					that.setState({selected: undefined});
					that.props.updateHandler(undefined);
				}
			}}
			placeholder="Select datasource"
			theme="default">
				{state.options.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
			</Select>
	}
}

// TODO this BioPAX example is just a proof of concept. It has not been tested and is not ready for production.
// also, the code between this and the one above should be DRYed up.
export class BioPAXEntityTypeSelect extends React.Component<any, any> {
	constructor(props) {
		super(props);

		// TODO check these
		const entityTypes = [
			'GeneReference',
			'DnaReference',
			'SmallMoleculeReference',
			'Pathway',
			'ProteinReference',
			'RnaReference'
		];

		this.state = {
			options: entityTypes.map(function(entityType) {
				return {
					label: entityType,
					value: entityType
				};
			}),
			selected: {
				label: props.entityType,
				value: props.entityType
			}
		};
	}
  render() {
		let that = this;
		let state = that.state;
		return <Select
			ref = "select"
			name="select"
			value={state.selected}
			onChange={function(selected){
				if (!!selected && selected.hasOwnProperty('value')) {
					that.setState({selected: selected});
					that.props.updateHandler(selected.value);
				} else {
					that.setState({selected: undefined});
					that.props.updateHandler(undefined);
				}
			}}
			placeholder="Select datasource"
			theme="default">
				{state.options.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
			</Select>
	}
}
