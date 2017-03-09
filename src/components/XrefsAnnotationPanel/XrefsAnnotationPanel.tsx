// TODO when we add the editor back, make sure this does what it's supposed to when the editor is open
// TODO what happens when the user selects another node without closing the panel?

import {concat, compact, forOwn, fromPairs, groupBy, isPlainObject, isBoolean, isString, isNumber, isArray, pick, remove, toPairs} from 'lodash';
import {BridgeDb} from '../../BridgeDb';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from 'rxjs';
import {normalize, setupPage, fillParent, vertical, horizontal, flex, content, width} from 'csstips';
import {style} from 'typestyle';
import * as styles from './styles.style';

import Icon from 'react-icons-kit';
import {remove as iconRemove} from 'react-icons-kit/fa/remove';
//import {ic_clear as iconRemove} from 'react-icons-kit/md/ic_clear';

let bridgeDb = new BridgeDb();

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

function isEqual(prev, current) {
	return prev === current ||
		(isPlainObject(prev) && isPlainObject(current) && JSON.stringify(prev) !== JSON.stringify(current)) ||
		(isArray(prev) && isArray(current) && prev.reduce(function(acc, x, i) {
			return acc && isEqual(x, current[i]);
		}, true));
}

export class XrefsAnnotationPanel extends React.Component<any, any> {
	xrefsRequest: Rx.Observable<any>;
  constructor(props) {
		super(props);
		this.state = {
			xrefs: [],
			...props
		};
		normalize();
		// TODO doublecheck whether we should use setupPage for this
		//setupPage('body');
  }

	updateXrefs() {
		let that = this;
		let state = that.state;

		const primaryDataSource = state.dataSource;
		const primaryIdentifier = state.identifier;
		let primaryEntityReference = {
			displayName: state.displayName,
			identifier: primaryIdentifier,
			isDataItemIn: {
				conventionalName: primaryDataSource
			}
		};

		let xrefsRequest = that.xrefsRequest = bridgeDb.xrefs(state.organism, state.dataSource, state.identifier);

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

				// TODO use the info the user provided to show a minimal result
				that.setState({xrefs: null});
			})
			.subscribe(null, console.error);
	}

	componentDidMount() {
		let that = this;
		that.updateXrefs();
	}

	componentWillReceiveProps(nextProps) {
		let that = this;
		const state = that.state;
		const prevProps = that.props;

		/* TODO see note at componentDidUpdate
		const xrefsUpdateNeeded = nextProps.dataSource !== state.dataSource ||
			nextProps.identifier !== state.identifier;
		//*/

	 	/*
		const changedStatePairs = [];
		// TODO this is kludgy
		forOwn(nextProps, function(nextProp, key) {
			const prevPropValue = prevProps[key];
			if (isEqual(prevPropValue, nextProp)) {
				changedStatePairs.push([key, nextProp]);
			}
		});
	 	//*/
	 	const changedStatePairs = [
			'organism',
			'dataSource',
			'identifier',
			'xrefs',
			'entityType',
			'displayName',
		].filter(k => prevProps[k] !== nextProps[k])
		.reduce(function(acc, k) {
			acc.push([k, nextProps[k]]);
			return acc;
		}, []);

		if (changedStatePairs.length > 0) {
			that.setState(fromPairs(changedStatePairs));
		}

		/* TODO see note at componentDidUpdate
		if (xrefsUpdateNeeded) {
			console.log('xrefs need to be updated');
			that.updateXrefs();
		}
	 	//*/
	}

	//*
	// TODO is this correct? Or should we use componentWillUpdate?
	// componentWillReceiveProps doesn't update when I click one node and then click another node without closing.
	componentDidUpdate(prevProps, prevState) {
		let that = this;
		let props = that.props;
		if (prevProps.dataSource !== props.dataSource || prevProps.identifier !== props.identifier) {
			that.updateXrefs();
		}
	}
 	//*/

	componentWillUnmount() {
		let that = this;
		// TODO cancel any pending network requests, possibly something like this:
		//that.xrefsRequest.dispose();
	}	

  render() {
		let that = this;
		let state = that.state;
		const {displayName, entityType, handleClose, xrefs} = state;
		return <div className={`${styles.Annotation} ui-draggable`}>
			<header>
				{/* TODO do we need so many divs here? */}
				<div className={style(fillParent, vertical)}>
					<div className={style(flex, horizontal)}>
						<div className={style(flex)}>
							<div className={styles.HeaderText}>{displayName}</div>
							<div className={styles.Description}>
								<h2>{entityType}</h2>
							</div>
						</div>
						<div onClick={handleClose} className={style(content, width(20))}>
							<Icon className={styles.Close} icon={iconRemove} />
						</div>
					</div>
				</div>
			</header>
			<div className={styles.AnnotationItemsContainer}>
				{
					<ul>
						{
							xrefs.map(function(xref) {
								let values = xref.values
								const valueCount = values.length;
								return <li key={xref.key} className={styles.AnnotationItem}>
									<span className={styles.AnnotationItemTitle}>{xref.key + ': '}</span>
									{
										values.map(function(v, i) {
											const text = v.text;
											const uri = v.uri;
											const separator = i <= valueCount ? ' ' : '';

											return <span key={i}>
												{
													uri ?
														<a className={styles.AnnotationItemLinkText} href={uri} target="_blank">{text}</a>
													:
														<span className={styles.AnnotationItemText}>{text}</span>
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
