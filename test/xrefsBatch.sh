#! /bin/bash

# TODO: use this instance for testing:
#    var bridgeDb = new BridgeDb({
#      baseIri: "http://localhost:4522/",
#      dataSourcesHeadersIri: "http://localhost:4522/datasources_headers.txt",
#      dataSourcesMetadataIri: "http://localhost:4522/datasources.txt"
#    });

echo $'1234\n1235\n' |\
./bin/bridgedb xrefsBatch --organism 'Homo sapiens' --xrefDataSource 'Entrez Gene'

./bin/bridgedb xrefsBatch --organism 'Homo sapiens' --xrefDataSource 'Entrez Gene' \
<<< $'1234\n1235\n'

echo $'xrefIdentifier\n1234\n1235\n' |\
./bin/bridgedb xrefsBatch --organism 'Homo sapiens' --xrefDataSource 'Entrez Gene' \
--headers=true

./bin/bridgedb xrefsBatch --organism="Homo sapiens" --xrefDataSource="Entrez Gene" \
< test/xrefIdentifiers.csv

./bin/bridgedb xrefsBatch -d "," --organism="Homo sapiens" \
< test/xrefDataSourcesAndIdentifiers.csv

./bin/bridgedb xrefsBatch -d "," --organism="Homo sapiens" \
< test/xrefDataSourcesAndIdentifiers.csv

./bin/bridgedb xrefsBatch --organism="Homo sapiens" --xrefDataSource="Entrez Gene" \
	--desiredXrefDataSources ensembl \
< ./test/RefSeqSample.tsv
