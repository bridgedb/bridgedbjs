#! /bin/bash

echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" -i 1 "Homo sapiens" "Entrez Gene" 0 |\
	wc -l |\
	sed 's/^\ *2/pass/'

echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 |\
	grep -c "Entrez Gene	1234	PDB	1ND8" |\
	sed 's/1/pass/'

./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n' |\
	grep -c "Entrez Gene	1235	HGNC	CCR6" |\
	sed 's/1/pass/'

echo $'gene\n1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" --headers=true \
	"Homo sapiens" "Entrez Gene" "gene" |\
	grep -c "Entrez Gene	1234	Uniprot-TrEMBL	Q38L21" |\
	sed 's/1/pass/'

./bin/bridgedb xrefs -f "csv" "Homo sapiens" "Entrez Gene" 0 \
	< test/xrefIdentifiers.csv |\
	grep -c "Entrez Gene,1236,OMIM,600242" |\
	sed 's/1/pass/'

./bin/bridgedb xrefs -f "csv" "Homo sapiens" 0 1 \
	< test/xrefDataSourcesAndIdentifiers.csv |\
	wc -l |\
	sed 's/^\ *248/pass/'

./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	ensembl \
	< test/RefSeqSample.tsv |\
	grep -c "Entrez Gene	7157	ensembl	ENSG00000141510" |\
	sed 's/15/pass/'
