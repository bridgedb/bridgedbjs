TESTING
=======

Most of the tests require a mock server to test against. This mock server is automatically started and stopped when you run the tests, but it sometimes fails. If it fails, try the test again, and it usually works.

## While Developing
~~To automatically run tests whenever code changes while developing~~ (does this still work?):

```bash
gulp
```

### Manually run all tests locally:

```bash
npm test
```

### Manually run all the tests for `BridgeDb.EntityReference`:

```bash
npm run test:EntityReference
```

Do likewise for the others.

### Add/Update Expected Test Data
To update the expected data for a given test, you can run the tests as specified above, preview the diff for the test of interest and hit `Enter` if the diff looks OK. If you hit `n` for next, the expected data will not be updated, but the actual data will be saved in the same directory as the test, e.g., `./bridgedbjs/test/unit/xref/ncbigene-4292-xrefs.jsonld.FAILED-2016-05-20.jsonld`.

This way of updating the data is not yet working for adding data for a new test. To do this, run the test with the `update` flag and a method name in order to add/update all the data for that method:

```bash
gulp testDataset --update=BridgeDb.Dataset.query
```
