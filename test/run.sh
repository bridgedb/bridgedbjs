#! /bin/bash

#########
# ARRAY #
#########

# nest: 0

echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	".[]" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].ensembl == "ENSG00000160791"'

echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	".[].type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].type | contains(["hgnc.symbol:CCR5","ensembl:ENSG00000160791","uniprot:Q38L21","uniprot:P51681","ncbigene:1234"])'

echo '{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}' |\
	./bin/bridgedb addAlternateXrefs \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq 'keys | contains(["ensembl"])'

# BridgeDb doesn't return anything for Uniprot-SwissProt:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/Sp/P03952
# It does, however, return results for Uniprot-TrEMBL:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/S/P03952
./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	".[].type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/nest0-array.json |\
	jq '.[3].type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-array.json |\
	jq '.[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 1

./bin/bridgedb addAlternateXrefs \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	".entities" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	".entities[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "pvjsgeneratedida49") | .type | contains(["uniprot:P03952","ncbigene:3818"])'

############
### OBJECT #
############

# nest: 0

echo '{"id": "abc123","xref":{"dataSource": "ensembl","identifier": "ENSG00000132031"}}' |\
./bin/bridgedb addAlternateXrefs \
	Human \
	".xref.dataSource" \
	".xref.identifier" \
	".xref.alternates" \
	ncbigene uniprot |
	jq '.xref.alternates | contains(["ncbigene:4148","uniprot:O15232"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	".[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".pvjsgeneratedida49.xrefDataSource" \
	".pvjsgeneratedida49.xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 1

./bin/bridgedb addAlternateXrefs \
	-b ".entitiesById[]" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	".type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq 'keys | contains(["pathway", "entitiesById", "more"])'

./bin/bridgedb addAlternateXrefs \
	Mouse \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP1_73346.json |\
	jq '.entitiesById["HMDB:HMDB01206"].closeMatch | contains(["wikidata:Q715317"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	-b ".entitiesById" \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	-b ".entitiesById[]" \
	".xrefDataSource" \
	".xrefIdentifier" \
	".type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.type | contains(["uniprot:F8W9P4"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	-b ".entitiesById[]" \
	".xrefDataSource" \
	".xrefIdentifier" \
	".xrefs" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.xrefs | contains(["uniprot:F8W9P4"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	-b ".entitiesById" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 2

./bin/bridgedb addAlternateXrefs \
	Human \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	".sampleData.entitiesById.pvjsgeneratedida49.type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	-b ".sampleData.entitiesById.pvjsgeneratedida49" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	".type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addAlternateXrefs \
	Human \
	".entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

## can't currently handle more than one level of nesting before a wildcard:
##./bin/bridgedb addAlternateXrefs Human \
##	".sampleData.entitiesById[].xrefDataSource" ".sampleData.entitiesById[].xrefIdentifier" \
##	".sampleData.entitiesById[]" \
##	ensembl ncbigene uniprot wikidata \
##	< ./test/inputs/nest1-object.json |\
##	jq .
