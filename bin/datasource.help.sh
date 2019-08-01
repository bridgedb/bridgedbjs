#! /bin/bash

# To DETECT the format of a data source, leave "as" empty.
#     Example 1) Detect the format of the input "Entrez Gene":
        ./bin/bridgedb datasource "Entrez Gene"
#       # -> "http://vocabularies.bridgedb.org/ops#conventionalName"
#       #     This is the IRI for the BridgeDb conventional name.
#     Example 2) Detect the format of the input "ncbigene":
        ./bin/bridgedb datasource "ncbigene"
#       # -> "http://identifiers.org/idot/preferredPrefix"
#       #    This is the IRI for the identifiers.org (Miriam) preferred prefix.

#     More examples:
        ./bin/bridgedb datasource "ensembl"
        ./bin/bridgedb datasource "http://identifiers.org/ensembl/"

# To CONVERT a data source to another format, specify a term or IRI for "as".
#     Example) Convert the BridgeDb conventional name "Entrez Gene" to an identifiers.org preferred prefix:
        ./bin/bridgedb datasource "Entrez Gene" preferredPrefix
#       # -> "ncbigene"

#     More examples:
	./bin/bridgedb datasource "Entrez Gene" "http://identifiers.org/idot/preferredPrefix"
	./bin/bridgedb datasource "Entrez Gene" "http://www.w3.org/1999/02/22-rdf-syntax-ns#about"
	./bin/bridgedb datasource "Entrez Gene" id
