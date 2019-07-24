var _ = require("lodash");
var BridgeDb = require("../../index.js");
var highland = require("highland");
var httpErrors = require("../../lib/http-errors.js");
var hyperquest = require("hyperquest");
var Rx = require("rx");
var RxNode = require("rx-node");

var bridgeDb = BridgeDb();
function hyperquestWithoutCredentials(iri) {
  return hyperquest(iri, {
    withCredentials: false
  });
}

function rxquest(uri, opts, cb, extra) {
  if (typeof uri === "object") {
    cb = opts;
    opts = uri;
    uri = undefined;
  }
  if (typeof opts === "function") {
    cb = opts;
    opts = undefined;
  }
  if (!opts) {
    opts = {};
  }
  if (uri !== undefined) {
    opts.uri = uri;
  }
  if (extra) {
    opts.method = extra.method;
  }

  var withCredentials = opts.withCredentials;
  if (typeof withCredentials === "undefined" || withCredentials === null) {
    opts.withCredentials = false;
  }

  return RxNode.fromReadableStream(hyperquest(uri, opts, cb, extra));
}

var datasetSource = RxNode.fromReadableStream(bridgeDb.dataset.query());

var exampleDirectLinkoutAndMissingSource = datasetSource.partition(function(
  dataset
) {
  return dataset._iriPattern && dataset.exampleIdentifier;
});

var exampleDirectLinkoutSource = exampleDirectLinkoutAndMissingSource[0]
  .map(function(dataset) {
    var exampleDirectLinkout = dataset._iriPattern.replace(
      "$id",
      dataset.exampleIdentifier
    );
    return {
      name: dataset.name,
      request: rxquest(exampleDirectLinkout),
      exampleDirectLinkout: exampleDirectLinkout
    };
  })
  .flatMap(function(namedRequest) {
    var response = new Rx.Subject();
    var name = namedRequest.name;
    var exampleDirectLinkout = namedRequest.exampleDirectLinkout;
    Rx.Observable.catch(namedRequest.request)
      .reduce(function(accumulator, buffer) {
        return accumulator + buffer.toString();
      }, "")
      .subscribe(
        function(responseValue) {
          response.onNext({
            success: true,
            name: name,
            exampleDirectLinkout: exampleDirectLinkout,
            value: responseValue
          });
        },
        function(err) {
          response.onNext({
            success: false,
            name: name,
            exampleDirectLinkout: exampleDirectLinkout
          });
        },
        function() {}
      );
    return response;
  });
//.flatMap(rxquest);

exampleDirectLinkoutSource.subscribe(
  function(result) {
    if (result.success) {
      console.log(
        "*********************************************************************"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log("                    Success for " + result.name);
      console.log(
        "*********************************************************************"
      );
      console.log(result.exampleDirectLinkout);
      console.log(result.value);
      console.log(
        "*********************************************************************"
      );
    } else {
      console.log(
        "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log(
        "|                |                |                |                |"
      );
      console.log("                    Handled Error for " + result.name);
      console.log(
        "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
      );
      console.log(result.exampleDirectLinkout);
      console.log(result.value);
      console.log(
        "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
      );
    }
  },
  function(err) {
    console.log(
      "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log(
      "|                |                |                |                |"
    );
    console.log("                          Unhandled Error");
    console.log(
      "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
    );
    console.log(err);
    console.log(
      "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
    );
  },
  function() {
    console.log("completed");
  }
);
//var exampleDirectLinkoutStream = highland();
//RxNode.writeToStream(exampleDirectLinkoutSource, exampleDirectLinkoutStream, 'utf8');
//exampleDirectLinkoutStream.pipe(process.stdout);
//exampleDirectLinkoutStream.through(hyperquest).pipe(process.stdout);

/*
exampleDirectLinkoutSource.subscribe(function(dataset) {
  console.log('***************************************************************');
  console.log('Missing example direct linkout');
  console.log(dataset.name);
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/
/*
var missingExampleDirectLinkoutSource = exampleDirectLinkoutAndMissingSource[1];
missingExampleDirectLinkoutSource.subscribe(function(dataset) {
  console.log('***************************************************************');
  console.log('Missing example direct linkout');
  console.log(dataset.name);
});

/*
var exampleIdentifiersOrgAndMissingSource = datasetSource
.partition(function(dataset) {
  return dataset['owl:sameAs'] && _.find(dataset['owl:sameAs'], function(iri) {
    return iri.indexOf('urn:miriam:') === 0;
  });
});
var exampleIdentifiersOrgSource = exampleIdentifiersOrgAndMissingSource[0];
var missingExampleIdentifiersOrgSource = exampleIdentifiersOrgAndMissingSource[1];
missingExampleIdentifiersOrgSource.subscribe(function(dataset) {
  console.log('***************************************************************');
  console.log('Missing Miriam IRI');
  console.log(dataset.name);
});

/*
var directLinkoutSource = datasetSource
.map(function(dataset) {
  return data.

})
//*/

/*
datasetSource.subscribe(function(dataset) {
  console.log('Data set');
  console.log(JSON.stringify(dataset, null, '\t'));
});
//*/
