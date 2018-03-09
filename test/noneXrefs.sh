#! /bin/bash

./bin/bridgedb xrefs "Homo sapiens" "Entrez Gene" "1234" |\
	grep -c "UCSC Genome Browser	uc062izs.1" |\
	sed 's/1/pass/'

./bin/bridgedb xrefs "Homo sapiens" "Entrez Gene" "1235" ensembl hgnc.symbol |\
	grep -c "hgnc.symbol	CCR6" |\
	sed 's/1/pass/'
