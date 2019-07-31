#! /bin/bash

trap 'previous_command=$this_command; this_command=$BASH_COMMAND' DEBUG

# These are in their own file, because I haven't had the chance to add
# them to the mockserver. So they will change if bridgedb changes.

expect="Result to have 15 ensembl:ENSG00000141510."
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	ensembl \
	< test/RefSeqSample.tsv |\
	grep -c "Entrez Gene	7157	ensembl	ENSG00000141510" |\
	grep -E '^15$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="Result to have 15 ensembl:ENSG00000141510, despite timeout."
result=$(./bin/bridgedb xrefs -t 2 -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	ensembl \
	< test/RefSeqSample.tsv |\
	grep -c "Entrez Gene	7157	ensembl	ENSG00000141510" |\
	grep -E '^15$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################


expect="to handle large dataset."
TEST_FILE="dsvTest.txt";
touch "$TEST_FILE";
rm "$TEST_FILE";

result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" 1 0 \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< test/inputs/large.tsv > "$TEST_FILE" && \
       	grep -Ec 'Entrez Gene\s+6352' "$TEST_FILE" && \
	grep -Ec 'ChEBI\s+29073' "$TEST_FILE")

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

rm "$TEST_FILE";
