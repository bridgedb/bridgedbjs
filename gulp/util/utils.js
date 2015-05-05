var exec = require('child_process').exec;
var highland = require('highland');
var inquirer = require('inquirer');

var createExecStream = highland.wrapCallback(exec);

module.exports = {
  createPromptStream: highland.wrapCallback(inquirer.prompt),
  createExecStream: createExecStream
};
