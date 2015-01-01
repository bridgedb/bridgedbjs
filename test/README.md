TESTING
=======

Most of the tests require a mock server to test against. This mock server is automatically started by the respective gulp tasks.

Example: run the tests for BridgeDb.EntityReference.

```bash
gulp testEntityReference
```

To update the expected data for a given method, use the "update" flag:

```bash
gulp testDataset --update=BridgeDb.Dataset.query
```
