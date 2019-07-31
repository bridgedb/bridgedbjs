#! /bin/bash

trap 'previous_command=$this_command; this_command=$BASH_COMMAND' DEBUG

# Here's the query to get the raw BridgeDb response:
#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d $'1234\n1235\n' \
#	'https://webservice.bridgedb.org/Human/xrefsBatch/Entrez%20Gene'

expect="Result to be 2 lines long."
result=$(echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" -i 1 "Homo sapiens" "Entrez Gene" 0 |\
	wc -l |\
	grep -E '^2$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="Result to have PDB:1ND8."
result=$(echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 |\
	grep -c "Entrez Gene	1234	PDB	1ND8" |\
	grep -E '^1$')
	#sed 's/1/OK/'

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="Result to have HGNC:CCR6."
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n' |\
	grep -c "Entrez Gene	1235	HGNC	CCR6" |\
	grep -E '^1$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="Result to have Uniprot-TrEMBL:Q38L21."
result=$(echo $'gene\n1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" --headers=true \
	"Homo sapiens" "Entrez Gene" "gene" |\
	grep -c "Entrez Gene	1234	Uniprot-TrEMBL	Q38L21" |\
	grep -E '^1$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

# Here's the query to get the raw BridgeDb response:
#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d $'1234\n1235\n1236\n' \
#	'https://webservice.bridgedb.org/Human/xrefsBatch/Entrez%20Gene'

expect="Result to have OMIM:600242."
result=$(./bin/bridgedb xrefs -f "csv" "Homo sapiens" "Entrez Gene" 0 \
	< test/xrefIdentifiers.csv |\
	grep -c "Entrez Gene,1236,OMIM,600242" |\
	grep -E '^1$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="Result to have 250 xrefs."
result=$(./bin/bridgedb xrefs -f "csv" "Homo sapiens" 0 1 \
	< test/xrefDataSourcesAndIdentifiers.csv |\
	wc -l |\
	grep -E '^250$')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi
