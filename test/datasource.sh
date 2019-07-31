#! /bin/bash

trap 'previous_command=$this_command; this_command=$BASH_COMMAND' DEBUG

expect="conventionalName"
result=$(./bin/bridgedb datasource "Entrez Gene" |\
	grep -E '"http:\/\/vocabularies.bridgedb.org\/ops#conventionalName"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="preferredPrefix"
result=$(./bin/bridgedb datasource "ensembl" |\
	grep -E '"http:\/\/identifiers.org\/idot\/preferredPrefix"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="about"
result=$(./bin/bridgedb datasource "http://identifiers.org/ensembl/" |\
	grep -E '"http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#about"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="ncbigene"
result=$(./bin/bridgedb datasource "Entrez Gene" preferredPrefix |\
	grep -E '"ncbigene"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="ncbigene"
result=$(./bin/bridgedb datasource "Entrez Gene" id |\
	grep -E '"http:\/\/identifiers.org\/ncbigene\/"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="ncbigene"
result=$(./bin/bridgedb datasource "Entrez Gene" "http://identifiers.org/idot/preferredPrefix" |\
	grep -E '"ncbigene"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################

expect="ncbigene"
result=$(./bin/bridgedb datasource "Entrez Gene" "http://www.w3.org/1999/02/22-rdf-syntax-ns#about" |\
	grep -E '"http:\/\/identifiers.org\/ncbigene\/"')

cmd=$previous_command ret=$?
if [ $ret -ne 0 ]; then
	echo '****************************************************************';
	echo "Command below failed (error code $ret). Expected: $expect";
	echo '****************************************************************';
	echo "  $cmd";
	echo '';
fi

##################################
