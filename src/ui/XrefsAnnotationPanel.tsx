// TODO when we add the editor back, make sure this does what it's supposed to when the editor is open
// TODO what happens when the user selects another node without closing the panel?

import {concat, compact, groupBy, pick, remove, toPairs} from 'lodash';
import Bridgedb from '../main';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from 'rxjs';

// TODO we don't need everything from these files,
// so remove the unused parts. I'm just using the
// files in their entirety now to save time.
import './kaavio.css';
import './stripped-bootstrap.css';
import './annotation-panel.css';

let bridgedb = new Bridgedb();

declare interface ListItemValueRaw {
	key: string;
	primary: boolean;
	text: string;
	uri?: string;
}

declare interface ListItemRaw {
	key: string;
	values: ListItemValueRaw[];
}

/**
 * @private
 * Used to create an HTML string for one or more identifiers/links.
 * @typedef {Object} ListItemValue Set of identifiers,
 *                      each with a linkout when available, such as for a specific Xref.
 * @property {String} text Displayed value, e.g., "WP1"
 * @property {String} [uri] (when available) Link to the main human-readable description/page
 *                          about that identifier.
 *                          Sometimes called a "linkout.". See
 *                          {@link http://www.w3.org/2001/XMLSchema#anyURI|xsd:anyURI}.
 *                          Example: {@link http://wikipathways.org/index.php/Pathway:WP1}
*/

declare interface ListItemValue {
	text: string;
	uri?: string;
}

/**
 * @private
 * List element with one or more subelements, e.g., Xrefs for one dataset.
 * @typedef {Object} ListItem
 * @property {String} key Title of the list element, e.g., "WikiPathways"
 * @property {ListItemValue[]} values
*/

declare interface ListItem {
	key: string;
	values: ListItemValue[];
}

function getLinkout(entityReference) {
	const urlPattern = entityReference.isDataItemIn.hasPrimaryUriPattern;
	if (urlPattern) {
		return urlPattern.replace('$id', entityReference.identifier);
	} else {
		return compact(concat([entityReference.about], entityReference.sameAs))
			.filter(function(uri) {
				return uri.indexOf('http') > -1;
			})[0];
	}
}

function convertEntityReferenceToListItems(entityReference): [ListItem] {
	let listItemValue: ListItemValue = {
		text: entityReference.identifier,
	};

	const uri = getLinkout(entityReference);
	if (uri) {
		listItemValue.uri = uri;
	}

	return [{
		key: entityReference.isDataItemIn.conventionalName,
		values: [listItemValue]
	}];
}

function addWikiPathwaysSearch(entityReference, listItems: ListItem[]): ListItem[] {
	const displayName = entityReference.displayName;
	listItems.push({
		key: 'Find other pathways containing',
		values: [{
			text: displayName,
			uri: 'http://www.wikipathways.org/index.php?title=Special:SearchPathways&doSearch=1&query=' + displayName
		}]
	});
	return listItems;
}

class XrefsAnnotationPanel extends React.Component<any, any> {
	xrefsRequest: Rx.Observable<any>;
  constructor(props) {
		super(props);
		this.state = {
			xrefs: []
		};
  }

	updateXrefs() {
		let that = this;
		let props = that.props;

		const primaryDataSource = props.dataSource;
		const primaryIdentifier = props.identifier;
		let primaryEntityReference = {
			displayName: props.displayName,
			identifier: primaryIdentifier,
			isDataItemIn: {
				conventionalName: primaryDataSource
			}
		};

		let xrefsRequest = that.xrefsRequest = bridgedb.xrefs(props.organism, props.dataSource, props.identifier);

		xrefsRequest
			.map(function(entityReference): ListItemValueRaw {
				const identifier = entityReference.identifier;
				let listItem: ListItemValueRaw = {
					key: entityReference.isDataItemIn.conventionalName,
					text: identifier,
					primary: entityReference.isDataItemIn.primary,
				};

				const uri = getLinkout(entityReference);
				if (uri) {
					listItem.uri = uri;
				}

				return listItem;
			})
			.toArray()
			.map(function(listItems): ListItem[] {
				// Here we handle case where BridgeDb webservice returns no reults or just one result.
				// Getting this number of results might mean the webservice is down.
				const listItemsCount = listItems.length;
				if (listItemsCount <= 1) {
					console.warn('Received ' + String(listItemsCount) + ' results. Is webservice.bridgedb.org down?');
					return convertEntityReferenceToListItems(primaryEntityReference);
				}

				// two-factor sort:
				//   1) by whether primary
				//   2) by key (e.g., the data source conventional name)
				listItems.sort(function(a, b) {
					// by primary
					if (a.primary === b.primary) {
						var x = a.key.toLowerCase();
						var y = b.key.toLowerCase();
						// by key 
						return x < y ? -1 : x > y ? 1 : 0;
					} else if (b.primary) {
						return 1;
					} else {
						return -1;
					}
				});

				let sortedListItems: ListItemRaw[] = toPairs(groupBy(listItems, 'key'))
					.reduce(function(acc, pair) {
						acc.push({
							key: pair[0],
							values: pair[1]
						});
						return acc;
					}, []);

				// Set the first item in the list to be the one with the dataSource/identifier
				// that was specified for this data node by the pathway author.
				var primaryListItem = remove(sortedListItems, function(element) {
					return (element.key === primaryDataSource);
				})[0];
				var primaryXRefId = remove(primaryListItem.values, function(element) {
					return (element.text === primaryIdentifier);
				})[0];
				primaryListItem.values.unshift(primaryXRefId);
				sortedListItems.unshift(primaryListItem);

				return sortedListItems
					.map(function(formattedListItem) {
						return {
							key: formattedListItem.key,
							values: formattedListItem.values.map((v) => pick(v, ['text', 'uri']) as ListItemValue)
						};
					});
			})
			.do(function(xrefs) {
				that.setState({xrefs: addWikiPathwaysSearch(primaryEntityReference, xrefs)});
			}, function(err) {
				err.message = err.message || '';
				err.message += ' Error getting or formatting xrefs (is webservice.bridgedb.org down?)'
				console.error(err);

				const xrefs = convertEntityReferenceToListItems(primaryEntityReference);
				that.setState({xrefs: addWikiPathwaysSearch(primaryEntityReference, xrefs)});
			})
			.subscribe(null, console.error);
	}

	componentDidMount() {
		let that = this;
		that.updateXrefs();
	}

	// TODO is this correct? Or should we use componentWillUpdate?
	componentDidUpdate(prevProps, prevState) {
		let that = this;
		let props = that.props;
		let state = that.state;
		if (prevProps.dataSource !== props.dataSource || prevProps.identifier !== props.identifier) {
			that.updateXrefs();
		}
	}

	componentWillUnmount() {
		let that = this;
		// TODO cancel any pending network requests, possibly something like this:
		//that.xrefsRequest.dispose();
	}	

  render() {
		let that = this;
		let props = that.props;
		let state = that.state;
		let xrefs = state.xrefs;

		// NOTE: the non-breaking spaces, " &nbsp;", are needed to keep the entityType aligned
		// with the displayName, because the displayName has the X (close icon) on its line,
		// which pushes the displayName to the left.
		return <div style={props.style} className="annotation ui-draggable">
			<header>
				<span className="annotation-header-close" onClick={props.handleClose}><i className="icon-remove"/></span>
				<span className="annotation-header-text">{props.displayName}</span>
				<div className="annotation-description">
					<h2>{props.entityType}</h2> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
				</div>
			</header>
			<div className="annotation-items-container">
				{
					<ul className="annotation-items-container-list">
						{
							xrefs.map(function(xref) {
								let values = xref.values
								const valueCount = values.length;
								return <li key={xref.key}>
									<span className="annotation-item-title">{xref.key + ': '}</span>
									{
										values.map(function(v, i) {
											const text = v.text;
											const uri = v.uri;
											const separator = i <= valueCount ? ' ' : '';
											return <span key={text} className="annotation-item-text">
												{
													uri ? <a href={uri} target="_blank">{text}</a> : text
												}
												{separator}
											</span>
										})
									}
								</li>
							})
						}
					</ul>
				}
			</div>
		</div>;
	}
}

export default XrefsAnnotationPanel;
