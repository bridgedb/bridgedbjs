// TODO use lodash/fp instead
import { flatten, intersection, isArray, isEmpty, union } from "lodash";

// TODO how do I specify this? see http://json-ld.org/spec/latest/json-ld/#dfn-node-object
// any JSON object that is not in the JSON-LD context and that meets one of these criteria:
// * does not contain the @value, @list, or @set keywords, or
// * not the top-most JSON object in the JSON-LD document consisting of no other members than @graph and @context.
//
// Since I don't know how to do this for now, I'll just use a modification of Map.
// Maybe one of the commented out options is more appropriate?
export type JsonldNodeObject = {
  //[key: string]: JsonPrimitive | JsonPrimitive[];
  //[key: string]: JsonldNodeObject;
  [key: string]: JsonldListSetPrimitive;
};
export type JsonPrimitive = string | number | boolean | null | JsonldNodeObject;
export interface JsonldValueObjectWithType {
  "@value": string | number | boolean | null;
  "@type"?: string | null;
  "@index"?: string;
  "@context"?: any;
}
export interface JsonldValueObjectWithLanguage {
  "@value": string | number | boolean | null;
  // TODO use an enum
  "@language"?: string | null;
  "@index"?: string;
  "@context"?: any;
}

export type JsonldValueObject =
  | JsonldValueObjectWithType
  | JsonldValueObjectWithLanguage;
export type JsonldListSetPrimitive =
  | string
  | number
  | boolean
  | null
  | JsonldNodeObject
  | JsonldValueObject;
export type JsonldListSetValue =
  | JsonldListSetPrimitive
  | JsonldListSetPrimitive[];

/* LSV means JSON-LD @list or @set values
 */
export function arrayify<T>(
  input: (T & JsonldListSetPrimitive) | (T[] & JsonldListSetPrimitive[])
) {
  if (typeof input === "undefined") {
    return [];
  }
  return isArray(input) ? input : [input];
}

export function isJsonldListSetPrimitive(x): boolean {
  const TYPE = typeof x;
  return (
    ["string", "number", "boolean"].indexOf(TYPE) > -1 ||
    x === null ||
    (TYPE !== "undefined" && x.hasOwnProperty("@value"))
  );
}

export function getValuesLSV(
  input: JsonldListSetValue
): JsonldListSetPrimitive[] {
  if (typeof input === "undefined") {
    return [];
  }
  return arrayify(input)
    .map(function(x) {
      return x && x.hasOwnProperty("@value") ? x["@value"] : x;
    })
    .filter(isJsonldListSetPrimitive);
}

export function intersectsLSV(
  x: JsonldListSetValue,
  y: JsonldListSetValue
): boolean {
  return !isEmpty(intersection(getValuesLSV(x), getValuesLSV(y)));
}

export function unionLSV(
  ...inputs: JsonldListSetValue[]
): JsonldListSetPrimitive[] {
  return union(flatten(inputs.map(getValuesLSV)));
}
