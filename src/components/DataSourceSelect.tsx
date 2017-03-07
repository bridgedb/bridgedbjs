/// <reference path="../../typings/index.d.ts" />

import {BridgeDb} from '../BridgeDb';
import {intersection, isArray, union} from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// TODO investigate these options for future CSS work:
// http://typestyle.io/
// https://github.com/Quramy/typed-css-modules (in conjunction with css-modules)

require('react-selectize/themes/default.css');

const BDB = 'http://vocabularies.bridgedb.org/ops#';

var SimpleSelect = require('react-selectize').SimpleSelect;

let bridgedb = new BridgeDb({
  baseIri: 'http://localhost:4522/',
	dataSourcesHeadersIri: 'http://localhost:4522/datasources_headers.txt',
	dataSourcesMetadataIri: 'http://localhost:4522/datasources.txt',
});

function arrayifyClean(input: any|any[]): any[] {
	if (isArray(input)) {
		return input;
	}

	if (input) {
		return [input];
	}

	return [];
}

export class DataSourceSelect extends React.Component<any, any> {
	constructor(props) {
		super(props);
		this.state = {
			dataSources: [],
			selected: {
				label: props.dataSource,
				value: props.dataSource
			}
		};
	}
	getOptionsByEntityType(entityType) {
		let that = this;
		const dataSources = that.state.dataSources;

		// if dataSources not yet loaded, just return selected item
		const selected = that.state.selected;
		if (dataSources.length === 0) {
			return [selected];
		}

		// return all if no entityReference type specified
		if (!entityType) {
			return dataSources
				.map(function(ds) {
					return {
						label: ds.conventionalName,
						value: ds.conventionalName
					};
				});
		}

		return dataSources
		.filter(function(candidateDatasource) {
			// Filtering datasources based on the currently
			// selected GPML DataNode Type

			let candidateDatasourceSubjects = arrayifyClean(candidateDatasource.subject);
			
			// We include the currently selected entry
			// regardless of entityReference type
			if (candidateDatasource.about === selected.value) {
				return true;
			}

			// We include all Datasources when GPML DataNode Type is equal to
			// one of these entries (using WP vocab):
			const includeAllForTheseTerms = [
				'Complex',
				'Unknown',
			];
			if (includeAllForTheseTerms.indexOf(entityType) > -1) {
				return true;
			}

			if (candidateDatasourceSubjects.indexOf(entityType) > -1) {
				return true;
			}

			// NOTE: we are intentionally filtering out datasources that lack a subject.
			// That's a BridgeDb curation issue, not an issue for this client.
			return false;
		})
		.map(function(ds) {
			return {
				label: ds.conventionalName,
				value: ds.conventionalName
			};
		});
	}

  render() {
		let that = this;
		let state = that.state;

		const currentOptions = that.getOptionsByEntityType(that.props.entityType);

		return <SimpleSelect
			ref = "select"
			value={state.selected}
			onValueChange={function(selected){
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
				{currentOptions.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
			</SimpleSelect>
	}
	componentDidMount() {
		let that = this;
		let props = that.props;

		// using WP vocab
		const geneProductishTerms = [
			'GeneProduct',
			'Protein',
			'Rna',
		];

		bridgedb.sourceDataSources(props.organism)
			.filter(function(ds: DataSource) {
				// a datasource must have an ID (RDF:about) from identifiers.org to be useful here
				return !!ds.about;
			})
			.filter(function(ds) {
				// we only want primary datasources
				return ds.primary;
			})
			.filter(function(ds) {
				// A datasource having one of the following subjects should NOT be used
				// to identify an Entity Reference for a gpml:DataNode.
				return [
					'interaction',
					'ontology',
					'probe',
					'experiment',
					'publication',
					'model',
					'organism'
				].indexOf(ds[BDB + 'type']) === -1;
			})
			.map(function(ds) {
				const subjects = arrayifyClean(ds.subject);
				// AP requested to interpret broadly for GeneProduct-related items,
				// so if the entityType is GeneProduct-related, we allow the user
				// to specify the DataSource with any GeneProduct-related DataSource,
				// e.g., Ensembl for a Protein or UniProt-Trembl for a GeneProduct.
				if (intersection(subjects, geneProductishTerms).length > 0) {
					ds.subject = union(subjects, geneProductishTerms);
				}
				return ds;
			})
			.toArray()
			.map(function(dataSources) {
				dataSources.sort(function(a, b) {
					const conventionalNameA = a.conventionalName;
					const conventionalNameB = b.conventionalName;
					if (conventionalNameA > conventionalNameB) {
						return 1;
					} else if (conventionalNameA < conventionalNameB) {
						return -1;
					} else {
						return 0;
					}
				});
				return dataSources;
			})
			.do(function(dataSources) {
				that.setState({dataSources: dataSources});
			})
			.subscribe(null, console.error);
	}
}
