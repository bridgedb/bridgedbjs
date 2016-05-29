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

### Manually run all the tests for just `BridgeDb.EntityReference`:

```bash
npm run test:EntityReference
```

Do likewise for the others.
