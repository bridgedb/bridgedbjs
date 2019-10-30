#! /bin/bash

expect="get UCSC Genome Browser	uc062izs.1"
result=$(./bin/bridgedb xrefs "Homo sapiens" "Entrez Gene" "1234" |\
	grep -c "UCSC Genome Browser	uc062izs.1")

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="get hgnc.symbol:CCR6"
result=$(./bin/bridgedb xrefs "Homo sapiens" "Entrez Gene" "1235" ensembl hgnc.symbol |\
	grep -c "hgnc.symbol	CCR6")

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************' 1>&2;
	echo "Command below failed (error code $ret). Expected: $expect" 1>&2;
	echo '****************************************************************' 1>&2;
	echo "  $cmd" 1>&2;
	echo '' 1>&2;
  exit 1
fi

##################################
