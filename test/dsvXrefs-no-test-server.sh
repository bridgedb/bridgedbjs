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

##################################

expect="to get outputs in multiple datasource formats."
OUTPUT_FILE_SHASUM="test-output.sha1sum";
echo 'b29638efb0aa2a02cafe51845bf4adacc1491a7b ?-' > "$OUTPUT_FILE_SHASUM"
result=$(./bin/bridgedb xrefs "Homo sapiens" CAS "50-00-0" \
	CAS cas chebi P2057 P683 |\
	bin/sha1sumup -c "$OUTPUT_FILE_SHASUM")

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

rm "$OUTPUT_FILE_SHASUM";

#for f in ./test/inputs/*.json; do base_path=`echo \"$f\" | sed s/.json//`; cat \"$f\" | node test/dummy-cli.js | bin/sha1sumup -c \"$base_path.svg.sha1sum\" || (echo '' && echo \"Checksum failed for $base_path.svg. Can kaavio convert it without throwing an error?\" && cat \"$f\" | node test/dummy-cli.js > /dev/null && echo '' && echo \"  Kaavio converts $base_path.svg without throwing an error, but we still need to find out why the checksums do not match.\" && echo '') || (echo '' && echo \"  Kaavio throws an error when converting $base_path.svg.\" && exit 1) || break; done

