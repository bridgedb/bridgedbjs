

  /**
   * @private
   *
   * Normalize text for comparison purposes.
   *
   * @param {string} inputText
   * @return {string} normalizedText
   */
  function _normalizeText(inputText) {
    // not using \w because we don't want to include the underscore
    var identifierPattern = /[^A-Za-z0-9]/gi;
    var alphanumericText = inputText.replace(identifierPattern, '');
    var normalizedText = alphanumericText;
    if (!_.isNull(alphanumericText)) {
      normalizedText = alphanumericText.toUpperCase();
    }
    return normalizedText;
  }

  /**
   * @private
   *
   * Normalize almost any input for comparison purposes.
   *
   * @param {string|number|object|boolean|date|regexp|string[]|number[]|object[]|boolean[]|date[]|regexp[]} input
   * @return {string[]} normalizedText
   */
  function _normalizeInput(input) {
    var normalizedInputArray;
    // First convert input to an array of strings.
    if (!_.isArray(input)) {
      if (_.isString(input)) {
        normalizedInputArray = [input];
      } else if (_.isNumber(input) || _.isRegExp(input) ||
          _.isDate(input) || _.isBoolean(input)) {
        normalizedInputArray = [input.toString()];
      } else if (_.isPlainObject(input)) {
        normalizedInputArray = _(input).pairs(function(pair) {
          return JSON.stringify(pair);
        });
      } else {
        console.warn('Cannot normalize provided input "' +
          input + '". Using input.toString().');
        normalizedInputArray = [input.toString()];
      }
    } else {
      normalizedInputArray = input.map(function(element) {
        return element.toString();
      });
    }
    // Then normalize the strings.
    return normalizedInputArray.map(function(element) {
      return Utils._normalizeText(element);
    });
  }
