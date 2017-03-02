// NOTE: mock-server must be started before running this.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {values} from 'lodash';
import XrefsAnnotationPanel from '../../src/ui/XrefsAnnotationPanel';

// TODO do we need to specify this here? Seems wrong.
process.env.MOCKSERVER_PORT = '4522';

// React says not to render directly into document.body, so here's a container.
var container = document.createElement('div');
document.body.appendChild(container)

declare interface entity {
	id: string;
	organism: string;
	type: string;
	entityType: string;
	database: string;
	identifier: string;
	displayName: string;
	entityReference: {
		name: string;
		displayName: string;
		type: string[];
		isDataItemIn: {
			id: string;
		};
		identifier: string;
	}
}

class Demo extends React.Component<any, any> {
  constructor(props) {
		super(props);
    this.state = {
			entities: props.entities,
			selected: null
		};
  }
	closeActive() {
		this.setState({selected: null})
	}
	handleClick(e) {
		let that = this;
		let el = e.target;
		const id = el.getAttribute('id');
		const entity = that.state.entities[id];
		if (entity && entity.type === 'DataNode' && entity.database && entity.identifier) {
			that.setState({selected: entity});
		}
	}
  render() {
		let that = this;
		let props = that.props;
		let state = that.state;
		const selected = state.selected;

		return <div onClick={that.handleClick.bind(that)}>
			{
				values(that.state.entities)
					.map((entity: entity) => <button key={entity.id} id={entity.id}>{entity.displayName}</button>)
			}
			{
				!selected ? <span/> : <div>
					<XrefsAnnotationPanel
							organism={selected.organism}
							entityType={'Metabolite'}
							displayName={selected.displayName}
							dataSource={selected.database}
							identifier={selected.identifier}
							handleClose={that.closeActive.bind(that)}>
					</XrefsAnnotationPanel>
				</div>
			}
		</div>;
	}
}

let entities = {
	'123': {
		id: '123',
		organism: 'Homo sapiens',
		type: 'DataNode',
		entityType: 'Metabolite',
		database: 'CAS',
		identifier: '50-00-0',
		displayName: 'formaldehyde',
		entityReference: {
			name: 'Formaldehyde',
			displayName: 'formaldehyde',
			type: [
				'Metabolite',
				'biopax:SmallMoleculeReference'
			],
			isDataItemIn: {
				id: 'http://identifiers.org/cas/'
			},
			identifier: '50-00-0',
		},
	},
	'124': {
		id: '124',
		organism: 'Homo sapiens',
		type: 'DataNode',
		entityType: 'GeneProduct',
		database: 'Entrez Gene',
		identifier: '1234',
		displayName: 'CCR5',
		entityReference: {
			name: 'C-C motif chemokine receptor 5',
			displayName: 'CCR5',
			type: [
				'GeneProduct',
				'biopax:DnaReference'
			],
			isDataItemIn: {
				id: 'http://identifiers.org/ncbigene/'
			},
			identifier: '1234',
		},
	},
};

ReactDOM.render(
	<Demo entities={entities}/>,
  container
);
