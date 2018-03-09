#! /bin/bash

# Note: if you use this with the -i option, the output will be
# the input plus a new column with the alternate mapped xrefs.
# Warning: the -i option is currently unable to retain headers
# and comments from the input.

# Inputs with a single column:

echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0 \
	uniprot

echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0 \
	ensembl uniprot

./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n'

echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0

echo $'1234\n1235\n' | \
	./bin/bridgedb xrefs -f "tsv" -i 1 \
	"Homo sapiens" "Entrez Gene" 0 \
	ensembl

echo $'1234\n1235\n' | \
	./bin/bridgedb xrefs -f "tsv" -i 0 \
	"Homo sapiens" "Entrez Gene" 0 \
	ensembl

./bin/bridgedb xrefs -f "csv" \
	"Homo sapiens" "Entrez Gene" 0 \
	< test/xrefIdentifiers.csv

# Inputs with multiple columns:

echo $'Entrez Gene\t1234\nEntrez Gene\t1235\n' | \
	./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" 0 1 \
	ensembl

echo $'Entrez Gene\t1234\nEntrez Gene\t1235\n' | \
	./bin/bridgedb xrefs -f "tsv" -i 2 \
	"Homo sapiens" 0 1

echo $'Entrez Gene\t1234\nEntrez Gene\t1235\n' | \
	./bin/bridgedb xrefs -f "tsv" -i 2 \
	"Homo sapiens" 0 1 \
	ensembl uniprot

echo $'Entrez Gene\t1234\nEntrez Gene\t1235\n' | \
	./bin/bridgedb xrefs -f "tsv" -i 1 \
	"Homo sapiens" 0 1 \
	ensembl

./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n'

echo $'gene\n1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" \
	--headers=true \
	"Homo sapiens" "Entrez Gene" "gene"

./bin/bridgedb xrefs -f "tsv" \
	"Homo sapiens" "Entrez Gene" 0 \
	< test/xrefIdentifiers.csv

./bin/bridgedb xrefs -f "csv" \
	"Homo sapiens" 0 1 \
	< test/xrefDataSourcesAndIdentifiers.csv

./bin/bridgedb xrefs -f "csv" \
	"Homo sapiens" "Entrez Gene" 1 \
	< test/xrefIdentifiersInSecondColumn.csv

./bin/bridgedb xrefs -f "tsv" --headers=true -i 3 \
	"Homo sapiens" "Entrez Gene" "Gene" \
	ensembl \
	< test/RefSeqSample.tsv
