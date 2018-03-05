#! /bin/bash

#########
# ARRAY #
#########

# nest: 0

echo '[{"id": "abc123", "dbConventionalName": "Entrez Gene", "dbId": "1234"}]' |\
	./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[]" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].ensembl == "ENSG00000160791"'

echo '[{"id": "abc123", "dbConventionalName": "Entrez Gene", "dbId": "1234"}]' |\
	./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].type | contains(["hgnc.symbol:CCR5","ensembl:ENSG00000160791","uniprot:Q38L21","uniprot:P51681","ncbigene:1234"])'

echo '{"dbConventionalName": "Entrez Gene", "dbId": "1234"}' |\
	./bin/bridgedb addMappedXrefs \
	Human \
	".dbConventionalName" \
	".dbId" \
	"." \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq 'keys | contains(["ensembl"])'

# BridgeDb doesn't return anything for Uniprot-SwissProt:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/Sp/P03952
# It does, however, return results for Uniprot-TrEMBL:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/S/P03952
./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/nest0-array.json |\
	jq '.[3].type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-array.json |\
	jq '.[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 1

./bin/bridgedb addMappedXrefs \
	Human \
	".entities[].dbConventionalName" \
	".entities[].dbId" \
	".entities" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entities[].dbConventionalName" \
	".entities[].dbId" \
	".entities[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "pvjsgeneratedida49") | .type | contains(["uniprot:P03952","ncbigene:3818"])'

############
### OBJECT #
############

# nest: 0

./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'
./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".pvjsgeneratedida49.dbConventionalName" \
	".pvjsgeneratedida49.dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 1

./bin/bridgedb addMappedXrefs \
	-b ".entitiesById[]" \
	Human \
	".dbConventionalName" \
	".dbId" \
	".type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq 'keys | contains(["pathway", "entitiesById", "more"])'

./bin/bridgedb addMappedXrefs \
	Mouse \
	".entitiesById[].dbConventionalName" \
	".entitiesById[].dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP1_73346.json |\
	jq '.entitiesById["HMDB:HMDB01206"].closeMatch | contains(["wikidata:Q715317"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entitiesById[].dbConventionalName" \
	".entitiesById[].dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])'

./bin/bridgedb addMappedXrefs \
	Human \
	-b ".entitiesById" \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])'

./bin/bridgedb addMappedXrefs \
	Human \
	-b ".entitiesById[]" \
	".dbConventionalName" \
	".dbId" \
	".type" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.type | contains(["uniprot:F8W9P4"])'

./bin/bridgedb addMappedXrefs \
	Human \
	-b ".entitiesById[]" \
	".dbConventionalName" \
	".dbId" \
	".xrefs" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.xrefs | contains(["uniprot:F8W9P4"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entitiesById[].dbConventionalName" \
	".entitiesById[].dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	-b ".entitiesById" \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

# nest: 2

./bin/bridgedb addMappedXrefs \
	Human \
	".sampleData.entitiesById.pvjsgeneratedida49.dbConventionalName" \
	".sampleData.entitiesById.pvjsgeneratedida49.dbId" \
	".sampleData.entitiesById.pvjsgeneratedida49.type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	-b ".sampleData.entitiesById.pvjsgeneratedida49" \
	Human \
	".dbConventionalName" \
	".dbId" \
	".type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entitiesById.pvjsgeneratedida49.dbConventionalName" \
	".entitiesById.pvjsgeneratedida49.dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])'

## can't currently handle more than one level of nesting before a wildcard:
##./bin/bridgedb addMappedXrefs Human \
##	".sampleData.entitiesById[].dbConventionalName" ".sampleData.entitiesById[].dbId" \
##	".sampleData.entitiesById[]" \
##	ensembl ncbigene uniprot wikidata \
##	< ./test/inputs/nest1-object.json |\
##	jq .
