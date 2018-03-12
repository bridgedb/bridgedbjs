#! /bin/bash

./bin/bridgedb datasource "Entrez Gene" |\
	sed 's/"http:\/\/vocabularies.bridgedb.org\/ops#conventionalName"/OK/'

./bin/bridgedb datasource "ensembl" |\
	sed 's/"http:\/\/identifiers.org\/idot\/preferredPrefix"/OK/'

./bin/bridgedb datasource "http://identifiers.org/ensembl/" |\
	sed 's/"http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#about"/OK/'

./bin/bridgedb datasource "Entrez Gene" preferredPrefix |\
	sed 's/"ncbigene"/OK/'

./bin/bridgedb datasource "Entrez Gene" id |\
	sed 's/"http:\/\/identifiers.org\/ncbigene\/"/OK/'

./bin/bridgedb datasource "Entrez Gene" "http://identifiers.org/idot/preferredPrefix" |\
	sed 's/"ncbigene"/OK/'

./bin/bridgedb datasource "Entrez Gene" "http://www.w3.org/1999/02/22-rdf-syntax-ns#about" |\
	sed 's/"http:\/\/identifiers.org\/ncbigene\/"/OK/'
