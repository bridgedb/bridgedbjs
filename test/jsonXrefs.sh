#! /bin/bash

#########
# ARRAY #
#########

# nest: 0

echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb xrefs -f "json" \
	-i ".[]" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].ensembl == "ENSG00000160791"' |\
	sed 's/true/pass/'

echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq '.[0].type | contains(["hgnc.symbol:CCR5","ensembl:ENSG00000160791","uniprot:Q38L21","uniprot:P51681","ncbigene:1234"])' |\
	sed 's/true/pass/'

echo '{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}' |\
	./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol |\
	jq 'keys | contains(["ensembl"])' |\
	sed 's/true/pass/'

# BridgeDb doesn't return anything for Uniprot-SwissProt:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/Sp/P03952
# It does, however, return results for Uniprot-TrEMBL:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/S/P03952
./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/nest0-array.json |\
	jq '.[3].type | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-array.json |\
	jq '.[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

# nest: 1

./bin/bridgedb xrefs -f "json" \
	-i ".entities" \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "Uniprot-TrEMBL:P03952") | .closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".entities[].type" \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
	jq '.entities[] | select(.id == "pvjsgeneratedida49") | .type | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

############
### OBJECT #
############

# nest: 0

echo '{"id": "abc123","xref":{"dataSource": "ensembl","identifier": "ENSG00000132031"}}' |\
./bin/bridgedb xrefs -f "json" \
	-i ".xref.alternates" \
	Human \
	".xref.dataSource" \
	".xref.identifier" \
	ncbigene uniprot |
	jq '.xref.alternates | contains(["ncbigene:4148","uniprot:O15232"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".pvjsgeneratedida49.xrefDataSource" \
	".pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
	jq '.["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

# nest: 1

./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq 'keys | contains(["pathway", "entitiesById", "more"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Mouse \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP1_73346.json |\
	jq '.entitiesById["HMDB:HMDB01206"].closeMatch | contains(["wikidata:Q715317"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById["Entrez Gene:5594"].closeMatch | contains(["ensembl:ENSG00000100030"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.type | contains(["uniprot:F8W9P4"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".xrefs" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
	jq '.entitiesById.a0e.xrefs | contains(["uniprot:F8W9P4"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

# nest: 2

./bin/bridgedb xrefs -f "json" \
	-i ".sampleData.entitiesById.pvjsgeneratedida49.type" \
	Human \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-b ".sampleData.entitiesById.pvjsgeneratedida49" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
	jq '.sampleData.entitiesById.pvjsgeneratedida49.type | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
	jq '.entitiesById["Uniprot-TrEMBL:P03952"].closeMatch | contains(["uniprot:P03952","ncbigene:3818"])' |\
	sed 's/true/pass/'

## can't currently handle more than one level of nesting before a wildcard:
##./bin/bridgedb xrefs -f "json" Human \
##	".sampleData.entitiesById[].xrefDataSource" ".sampleData.entitiesById[].xrefIdentifier" \
##	".sampleData.entitiesById[]" \
##	ensembl ncbigene uniprot wikidata \
##	< ./test/inputs/nest1-object.json |\
##	jq .
