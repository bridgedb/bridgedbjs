/// <reference path="../../typings/index.d.ts" />

declare global {
  // Augment Node.js `global`
  namespace NodeJS {
    interface Global {
      XMLHttpRequest: XMLHttpRequest;
    }
  }
  // Augment Browser `window`
  //interface Window extends NodeJS.Global { }
  // Augment Web Worker `self`
  //interface WorkerGlobalScope extends NodeJS.Global { }
}

if (!global.hasOwnProperty("XMLHttpRequest")) {
  global.XMLHttpRequest = require("xhr2");
}

import { defaultsDeep } from "lodash";

const csv = require("csv-streamify");

import { Observable } from "rxjs/Observable";

// TODO should I need to import the interface type definition like this?
import { AjaxRequest } from "rxjs/observable/dom/AjaxObservable";

import "rxjs/add/observable/dom/ajax";

import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import "rx-extra/add/operator/throughNodeStream";

export const CONFIG_DEFAULT = {
  timeout: 3 * 1000,
  retryLimit: 2,
  retryDelay: 3 * 1000
};

const CSV_OPTIONS = { objectMode: true, delimiter: "\t" };

export class TSVGetter {
  config;
  constructor(config: Partial<typeof CONFIG_DEFAULT> = CONFIG_DEFAULT) {
    this.config = defaultsDeep(config, CONFIG_DEFAULT);
  }

  get = (
    url: string,
    method: string = "GET",
    body?: string
  ): Observable<string[]> => {
    const { config } = this;
    const ajaxRequest: AjaxRequest = {
      url: url,
      method: method,
      responseType: "text",
      timeout: config.timeout,
      crossDomain: true
    };
    if (body) {
      ajaxRequest.body = body;
      ajaxRequest.headers = ajaxRequest.headers || {};
      ajaxRequest.headers["Content-Type"] = "text/plain";
    }
    return (
      Observable.ajax(ajaxRequest)
        .map((ajaxResponse): string => ajaxResponse.xhr.response)
        .throughNodeStream(csv(CSV_OPTIONS))
        // each row is an array of fields
        .filter(function(fields) {
          // Remove commented out rows
          return fields[0].indexOf("#") !== 0;
        })
    );
  };
}
