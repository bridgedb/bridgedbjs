#! /bin/bash

./bin/bridgedb datasource "Entrez Gene" |\
	sed 's/"http:\/\/vocabularies.bridgedb.org\/ops#conventionalName"/pass/'

./bin/bridgedb datasource "ensembl" |\
	sed 's/"http:\/\/identifiers.org\/idot\/preferredPrefix"/pass/'

./bin/bridgedb datasource "http://identifiers.org/ensembl/" |\
	sed 's/"http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#about"/pass/'

./bin/bridgedb datasource "Entrez Gene" preferredPrefix |\
	sed 's/"ncbigene"/pass/'

./bin/bridgedb datasource "Entrez Gene" id |\
	sed 's/"http:\/\/identifiers.org\/ncbigene\/"/pass/'

./bin/bridgedb datasource "Entrez Gene" "http://identifiers.org/idot/preferredPrefix" |\
	sed 's/"ncbigene"/pass/'

./bin/bridgedb datasource "Entrez Gene" "http://www.w3.org/1999/02/22-rdf-syntax-ns#about" |\
	sed 's/"http:\/\/identifiers.org\/ncbigene\/"/pass/'
