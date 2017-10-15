import { BridgeDb } from "../BridgeDb";
import * as React from "react";
import * as ReactDOM from "react-dom";

//require('react-selectize/themes/default.css');
// TODO we should be able to use the line above, but it cssify doesn't handle it,
// so we need to use the line below.
// Issue: https://github.com/davidguttman/cssify/issues/23
// Possibly related issue: https://github.com/davidguttman/cssify/issues/46
// browserify-css has the same problem:
// https://github.com/cheton/browserify-css/issues/46
// NOTE: requires copying the files
//require('./react-selectize-theme-default.css');
const reactSelectizeThemeDefault = require("../placeholder");

// this doesn't work when bridgedb is a dependency:
//require('../../node_modules/react-selectize/themes/default.css');

const SimpleSelect = require("react-selectize").SimpleSelect;

export class WPEntityTypeSelect extends React.Component<any, any> {
  constructor(props) {
    super(props);

    const entityTypes = [
      "GeneProduct",
      "Metabolite",
      "Pathway",
      "Protein",
      "Complex",
      "RNA",
      "Unknown"
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

    return (
      <SimpleSelect
        ref="select"
        value={state.selected}
        onValueChange={function(selected) {
          if (!!selected && selected.hasOwnProperty("value")) {
            that.setState({ selected: selected });
            that.props.updateHandler(selected.value);
          } else {
            that.setState({ selected: undefined });
            that.props.updateHandler(undefined);
          }
        }}
        placeholder="Select datasource"
        theme="default"
      >
        {state.options.map(o =>
          <option key={o.label} value={o.value}>{o.label}</option>
        )}
      </SimpleSelect>
    );
  }
}

// TODO this BioPAX example is just a proof of concept. It has not been tested and is not ready for production.
// also, the code between this and the one above should be DRYed up.
export class BioPAXEntityTypeSelect extends React.Component<any, any> {
  constructor(props) {
    super(props);

    // TODO check these
    const entityTypes = [
      "GeneReference",
      "DnaReference",
      "SmallMoleculeReference",
      "Pathway",
      "ProteinReference",
      "RnaReference"
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
    return (
      <SimpleSelect
        ref="select"
        value={state.selected}
        onValueChange={function(selected) {
          if (!!selected && selected.hasOwnProperty("value")) {
            that.setState({ selected: selected });
            that.props.updateHandler(selected.value);
          } else {
            that.setState({ selected: undefined });
            that.props.updateHandler(undefined);
          }
        }}
        placeholder="Select datasource"
        theme="default"
      >
        {state.options.map(o =>
          <option key={o.label} value={o.value}>{o.label}</option>
        )}
      </SimpleSelect>
    );
  }
}
