/// <reference path="../../typings/index.d.ts" />

declare global {
  // Augment Node.js `global`
  namespace NodeJS {
    interface Global {
      XMLHttpRequest: XMLHttpRequest;
    }
  }
}

if (!global.hasOwnProperty("XMLHttpRequest")) {
  global.XMLHttpRequest = require("xhr2");
}

import { defaultsDeep } from "lodash";

const csv = require("fast-csv");

import { Observable } from "rxjs/Observable";

// TODO should I need to import the interface type definition like this?
import { AjaxRequest } from "rxjs/observable/dom/AjaxObservable";

import "rxjs/add/observable/dom/ajax";

import "rxjs/add/operator/catch";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import "rx-extra/add/operator/throughNodeStream";

const VError = require("verror");

const HTTP_OPTIONS_DEFAULT = {
  timeout: 3 * 1000,
  retryLimit: 2,
  retryDelay: 3 * 1000,
};
export type HTTP_OPTIONS_PARTIAL = Partial<typeof HTTP_OPTIONS_DEFAULT>;
export type HTTP_OPTIONS_FULL = typeof HTTP_OPTIONS_DEFAULT;

const TSV_OPTIONS_DEFAULT = {
  objectMode: true,
  delimiter: "\t",
  comment: "#",
  headers: false,
};
export type TSV_OPTIONS_PARTIAL = Partial<typeof TSV_OPTIONS_DEFAULT>;
export type TSV_OPTIONS_FULL = typeof TSV_OPTIONS_DEFAULT;

export const CONFIG_DEFAULT = {
  http: HTTP_OPTIONS_DEFAULT as HTTP_OPTIONS_PARTIAL,
  tsv: TSV_OPTIONS_DEFAULT as TSV_OPTIONS_PARTIAL,
};
export type CONFIG_DEFAULT_PARTIAL = Partial<typeof CONFIG_DEFAULT>;

export class TSVGetter {
  tsvOptions: TSV_OPTIONS_FULL;
  httpOptions: HTTP_OPTIONS_FULL;
  constructor(config: CONFIG_DEFAULT_PARTIAL = CONFIG_DEFAULT) {
    const configFilled = defaultsDeep(config, CONFIG_DEFAULT);
    this.tsvOptions = configFilled.tsv;
    this.httpOptions = configFilled.http;
  }

  get = (
    url: string,
    method: string = "GET",
    body?: string
  ): Observable<string[] | Map<string, string>> => {
    const { httpOptions, tsvOptions } = this;

    const callString = `in TSVGetter.get(
	url=${url},
	method=${method},
	body=${body}
) with httpOptions=${JSON.stringify(httpOptions, null, "  ")}
       tsvOptions=${JSON.stringify(tsvOptions, null, "  ")}`;

    const ajaxRequest: AjaxRequest = {
      url: encodeURI(url),
      method: method,
      responseType: "text",
      timeout: httpOptions.timeout,
      crossDomain: true,
    };
    if (body) {
      ajaxRequest.body = body;
      ajaxRequest.headers = ajaxRequest.headers || {};
      ajaxRequest.headers["Content-Type"] = "text/plain";
    }
    // TODO I shouldn't need so many catches in here, should I?
    return Observable.ajax(ajaxRequest)
      .map((ajaxResponse): string => ajaxResponse.xhr.response)
      .catch((err) => {
        throw new VError(err, callString);
      })
      .throughNodeStream(csv.parse(tsvOptions))
      .catch((err) => {
        throw new VError(err, callString);
      });
  };
}
