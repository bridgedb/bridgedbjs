TESTING
=======

The watch is done differently for the API client and for the UI components. The API client uses the `npm-watch` library, which is set up to run `npm run dev` and `npm run test` when relevant files change. The UI components use `webpack-dev-server`, which builds the UI demo, serves it and refreshes the browser when relevant files change. There are no tests for UI yet.

Both watches depend on `mockserver` to mock selected webservice.bridgedb.org API endpoints.

## While Developing
To automatically build and run tests whenever code changes while developing:

```bash
npm run watch
```

### Manually run all tests locally:

```bash
npm test
```

### Manually run all the tests for just `BridgeDb.EntityReference` (does this still work?):

```bash
npm run test:EntityReference
```

Do likewise for the others.
