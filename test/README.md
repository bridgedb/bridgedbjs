TESTING
=======

Most of the tests require a mock server to test against. This mock server is automatically started by the respective gulp tasks.

## While Developing
To automatically run tests whenever code changes while developing:

```bash
gulp
```

## Example 1
Manually run the tests for BridgeDb.EntityReference:

```bash
gulp testEntityReference
```

## Example 2
Manually run all tests locally:

```bash
gulp testLocalhost
```

## Update Expected Data
To update the expected data for a given method, use the "update" flag:

```bash
gulp testDataset --update=BridgeDb.Dataset.query
```
