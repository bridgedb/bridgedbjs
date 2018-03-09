#! /bin/bash

#  Examples:

./bin/bridgedb datasource "Entrez Gene"

./bin/bridgedb datasource "ensembl"
./bin/bridgedb datasource "http://identifiers.org/ensembl/"

./bin/bridgedb datasource "Entrez Gene" preferredPrefix
./bin/bridgedb datasource "Entrez Gene" id

./bin/bridgedb datasource "Entrez Gene" "http://identifiers.org/idot/preferredPrefix"
./bin/bridgedb datasource "Entrez Gene" "http://www.w3.org/1999/02/22-rdf-syntax-ns#about"
