/******************************
  * identifier control
  *****************************/

var Rx = require('rx-extra');
var yolk = require('yolk');

var h = yolk.h;

function IdentifierControl(args) {
  var createEventHandler = args.createEventHandler;
  var props = args.props;

  var disabled$ = (props.disabled || Rx.Observable.return(false));
  var required$ = (props.required || Rx.Observable.return(false));

  var identifier$ = (props.identifier || Rx.Observable.return(''));

  return h('input', {
    'class': 'pvjs-editor-identifier form-control input input-sm',
    placeholder: 'Identifier',
    disabled: disabled$,
    required: required$,
    type: 'text',
    value: identifier$
  });
}

module.exports = IdentifierControl;
