import { BridgeDb } from "../BridgeDb";
import * as React from "react";
import * as ReactDOM from "react-dom";

import Select from "react-select";
//require('react-select/dist/react-select.css');
// TODO we should be able to use the line above, but it cssify doesn't handle it,
// so we need to use the line below.
// Issue: https://github.com/davidguttman/cssify/issues/23
// Possibly related issue: https://github.com/davidguttman/cssify/issues/46
// browserify-css has the same problem:
// https://github.com/cheton/browserify-css/issues/4
require("./react-select.css");

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
    const { options, selected } = this.state;
    const selectOptions = options.map(singleOption => {
      return {
        value: singleOption.value,
        label: singleOption.label
      };
    });

    return (
      <Select
        ref="select"
        name="select"
        value={selected}
        onChange={selected => {
          if (!!selected && selected.hasOwnProperty("value")) {
            this.setState({ selected: selected });
            this.props.updateHandler(selected.value);
          } else {
            this.setState({ selected: undefined });
            this.props.updateHandler(undefined);
          }
        }}
        placeholder="Select datasource"
        options={selectOptions}
      />
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
    const { options, selected } = this.state;
    const selectOptions = options.map(singleOption => {
      return {
        value: singleOption.value,
        label: singleOption.label
      };
    });

    return (
      <Select
        ref="select"
        name="select"
        value={selected}
        onChange={selected => {
          if (!!selected && selected.hasOwnProperty("value")) {
            this.setState({ selected: selected });
            this.props.updateHandler(selected.value);
          } else {
            this.setState({ selected: undefined });
            this.props.updateHandler(undefined);
          }
        }}
        placeholder="Select datasource"
        options={selectOptions}
      />
    );
  }
}
