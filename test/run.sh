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
	ensembl ncbigene uniprot wikidata |\
	jq '.[0].ensembl == "ENSG00000160791"'

echo '[{"id": "abc123", "dbConventionalName": "Entrez Gene", "dbId": "1234"}]' |\
	./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata |\
	jq '.[0].type | contains(["ensembl:ENSG0000016079"])'

echo '{"dbConventionalName": "Entrez Gene", "dbId": "1234"}' |\
	./bin/bridgedb addMappedXrefs \
	Human \
	".dbConventionalName" \
	".dbId" \
	"." \
	ensembl ncbigene uniprot wikidata |\
	jq 'keys | contains(["ensembl"])'

./bin/bridgedb addMappedXrefs Human \
	".[].dbConventionalName" ".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-array.json |\
	jq '.[2].type | contains(["ncbigene:1234"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-array.json |\
	jq '.[] | select(.id == "Uniprot-SwissProt:P03952") | .closeMatch | contains(["uniprot:P03952"])'

# nest: 1

./bin/bridgedb addMappedXrefs \
	Human \
	".entities[].dbConventionalName" \
	".entities[].dbId" \
	".entities" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "Uniprot-SwissProt:P03952") | .closeMatch | contains(["uniprot:P03952"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entities[].dbConventionalName" \
	".entities[].dbId" \
	".entities[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "pvjsgeneratedida49") | .type | contains(["uniprot:P03952"])'

###########
## OBJECT #
###########

# nest: 0

./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	".[].type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.pvjsgeneratedida49.type | contains(["uniprot:P03952"])'
./bin/bridgedb addMappedXrefs \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-SwissProt:P03952"].closeMatch | contains(["uniprot:P03952"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".pvjsgeneratedida49.dbConventionalName" \
	".pvjsgeneratedida49.dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-SwissProt:P03952"].closeMatch | contains(["uniprot:P03952"])'

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
	Human \
	".entitiesById[].dbConventionalName" \
	".entitiesById[].dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-SwissProt:P03952"].closeMatch | contains(["uniprot:P03952"])'

./bin/bridgedb addMappedXrefs \
	-b ".entitiesById" \
	Human \
	".[].dbConventionalName" \
	".[].dbId" \
	"." \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-SwissProt:P03952"].closeMatch | contains(["uniprot:P03952"])'

# nest: 2

./bin/bridgedb addMappedXrefs \
	Human \
	".sampleData.entitiesById.pvjsgeneratedida49.dbConventionalName" \
	".sampleData.entitiesById.pvjsgeneratedida49.dbId" \
	".sampleData.entitiesById.pvjsgeneratedida49.type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952"])'

./bin/bridgedb addMappedXrefs \
	-b ".sampleData.entitiesById.pvjsgeneratedida49" \
	Human \
	".dbConventionalName" \
	".dbId" \
	".type" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952"])'

./bin/bridgedb addMappedXrefs \
	Human \
	".entitiesById.pvjsgeneratedida49.dbConventionalName" \
	".entitiesById.pvjsgeneratedida49.dbId" \
	".entitiesById" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-SwissProt:P03952"].closeMatch | contains(["uniprot:P03952"])'

# can't currently handle more than one level of nesting before a wildcard:
#./bin/bridgedb addMappedXrefs Human \
#	".sampleData.entitiesById[].dbConventionalName" ".sampleData.entitiesById[].dbId" \
#	".sampleData.entitiesById[]" \
#	ensembl ncbigene uniprot wikidata \
#	< ./test/inputs/nest1-object.json |\
#	jq .
