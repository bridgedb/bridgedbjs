/// <reference path="../../../typings/augmentedTypes.d.ts" />

// TODO should we use Autoprefixer?
// https://github.com/postcss/autoprefixer
//
// basarat doesn't like automatically adding vendor prefixes:
// https://github.com/typestyle/typestyle/issues/73#issuecomment-267715985
//
// Radium does do vendor prefixes:
// https://github.com/FormidableLabs/radium/blob/master/docs/comparison/README.md

import { style } from "typestyle";

export const Annotation = style({
  fontFamily: "Helvetica Neue, Helvetica, sans-serif",
  display: "inline-block",
  position: "absolute",
  right: "75px",
  top: "100px",
  verticalAlign: "text-top",
  textAlign: "center",
  margin: 0,
  zoom: 1,
  // TODO what about other browsers?
  "-webkit-font-smoothing": "antialiased",
  background: "#F9F9F9",
  width: "260px",
  borderRadius: "10px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.3),inset 0 1px 1px rgba(255,255,255,0.8)",
  // TODO are these prefixes still needed?
  "-webkit-box-shadow":
    "0 1px 3px rgba(0,0,0,0.3),inset 0 1px 1px rgba(255,255,255,0.8)",
  "-moz-box-shadow":
    "0 1px 3px rgba(0,0,0,0.3),inset 0 1px 1px rgba(255,255,255,0.8)",
  padding: "10px 5px 0 5px",
  zIndex: 999999
});

export const HeaderText = style({
  fontSize: "22px",
  fontWeight: "bold",
  fontStyle: "normal",
  color: "#333",
  letterSpacing: ".8px",
  textAlign: "center"
});

export const Close = style({
  float: "right",
  padding: "0 5px 0 0",
  color: "#aaa",
  $nest: {
    "&:hover": {
      cursor: "pointer"
    }
  }
});

export const Description = style({
  textAlign: "center",
  margin: "0 0 0 auto",
  fontSize: "14px",
  fontStyle: "italic"
  /*
	[`h2`]: {
		fontWeight: 'normal',
		fontVariant: 'normal',
		fontStyle: 'italic',
		lineHeight: '1.5',
		fontSize: '14px',
		color: '#696969',
		display: 'inline-block',
		padding: '0',
		margin: '0',
		border: '0',
		zoom: 1,
	},
	//*/
});

export const AnnotationItemsContainer = style({
  $nest: {
    "& ::-webkit-scrollbar-track": {
      "-webkit-box-shadow": "inset 0 0 6px rgba(0,0,0,0.3)",
      borderRadius: "10px"
    },
    "& ::-webkit-scrollbar-thumb": {
      borderRadius: "10px",
      "-webkit-box-shadow": "inset 0 0 6px rgba(0,0,0,0.5)"
    },
    "& ::-webkit-scrollbar": {
      width: "12px"
    }
  } /*,
	[`ul`]: {
		lineHeight: '120%',
		listStyle: 'none',
		textAlign: 'left',
		padding: '0 0 0 10px',
		margin: '5px -5px 10px -5px',
		maxHeight: '300px',
		minHeight: '30px',
		overflowY: 'auto',
		overflowX: 'hidden',
	}
	//*/
});

export const AnnotationItem = style({
  /*
	[`li`]: {
		padding: '0px',
		display: 'block',
		margin: '0 auto 0 auto',
	}
	//*/
});

export const AnnotationItemTitle = style({
  color: "#696969",
  display: "inline",
  fontSize: "10pt",
  fontWeight: "bold",
  margin: "0 auto 0 auto",
  padding: "0px"
});

export const AnnotationItemText = style({
  padding: "0px",
  display: "inline",
  margin: "0 5px 0 auto",
  fontSize: "9pt",
  textDecoration: "none"
});

export const AnnotationItemLinkText = style({
  color: "blue",
  display: "inline",
  fontSize: "9pt",
  margin: "0 5px 0 auto",
  padding: "0px",
  textDecoration: "none",
  $nest: {
    "&:hover": {
      textDecoration: "underline",
      cursor: "pointer"
    }
  }
});

/* I don't think these are being used: 
export const Move = style({
	float: 'left',
	padding: '0',
	color: '#aaa',
	fontSize: '80%',
	$nest: {
		'&:hover': {
			cursor: 'move',
		}
	}
});

export const Search = style({
	verticalAlign: '10%',
	textDecoration: 'none', // tweak needed for wp
	//font-size: 60%, // tweak that was maybe needed for wp?
	$nest: {
		'&:hover': {
			cursor: 'pointer',
		}
	}
});

export const Tooltip = style({
  fontSize: '8pt',
});
//*/
