import { isString } from "lodash";

export const dataTypeParsers = {
  "http://www.w3.org/2001/XMLSchema#string": String,
  "http://www.w3.org/2001/XMLSchema#anyURI": String,
  // parseFloat when isString in order to handle cases like '0', which should be parsed as false
  "http://www.w3.org/2001/XMLSchema#boolean": function(x) {
    return Boolean(isString(x) ? parseFloat(x) : x);
  },
  "http://www.w3.org/2001/XMLSchema#integer": parseInt,
  "http://www.w3.org/2001/XMLSchema#float": parseFloat
};
