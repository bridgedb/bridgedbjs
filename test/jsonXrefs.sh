SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_BASENAME=$( basename ${BASH_SOURCE[0]} )

TMPFILE=$(mktemp /tmp/${SCRIPT_BASENAME}.XXXXXX) || exit 1
TMPFILE_SHASUM="$TMPFILE.sha1sum"

cleanup() {
  if [ -e "$TMPFILE" ]; then
    rm "$TMPFILE"
    rm "$TMPFILE_SHASUM"
  fi
}

debug() {
	cmd=$previous_command ret=$?
	if [ $ret -eq 143 ]; then
		echo '****************************************************************' 1>&2;
		echo "Command killed or failed (error code $ret) when running $expect in $SCRIPT_PATH" 1>&2;
		echo '****************************************************************' 1>&2;
	elif [ $ret -ne 0 ]; then
		echo '****************************************************************' 1>&2;
		echo "Command failed (error code $ret). Expected $expect in $SCRIPT_PATH" 1>&2;
		echo '****************************************************************' 1>&2;
		echo "$cmd" 1>&2;
		echo '' 1>&2;
    if [ -e "$TMPFILE" ]; then
      echo "* Unexpected result:" 1>&2;
      cat "$TMPFILE" 1>&2;
      echo '' 1>&2;
      echo "* Unexpected sha1sum: $(cat "$TMPFILE" | bin/sha1sumup)" 1>&2;
      echo '' 1>&2;
    fi
    exit 1
	fi
}

trap 'previous_command=$this_command; this_command=$BASH_COMMAND;' DEBUG
trap 'debug $previous_command $this_command' ERR
trap cleanup EXIT INT QUIT TERM

#########
# ARRAY #
#########

# nest: 0

# bridgedb xrefs -i '.entitiesById' -f 'json' Mouse '.entitiesById[].xrefDataSource' '.entitiesById[].xrefIdentifier' ensembl hgnc.symbol ncbigene uniprot chebi hmdb wikidata

expect="array, nest 0, ..."
echo '87099983da62c1a3b1c5b51405bdb7419eca97a2 ?-' > "$TMPFILE_SHASUM"
result=$(echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb xrefs -f "json" \
	-i ".[]" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="array, nest 0, specifying output datasources"
echo '4e6b0965e2db7f4f8556b2a6b52a98af1959a31f ?-' > "$TMPFILE_SHASUM"
result=$(echo '[{"id": "abc123", "xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
	./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="array, nest 0, keys contain ensembl"
echo '31fa1b061d4f842f308ea8a82caab06985f6bf09 ?-' > "$TMPFILE_SHASUM"
result=$(echo '{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}' |\
	./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

# BridgeDb doesn't return anything for Uniprot-SwissProt:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/Sp/P03952
# It does, however, return results for Uniprot-TrEMBL:P03952:
# http://webservice.bridgedb.org/Homo%20sapiens/xrefs/S/P03952
expect="array, nest 0, get uniprot:P03952"
echo '52cb6952c0acb418633980adbea33cd0f6b21087 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< ./test/inputs/nest0-array.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="array, nest 0, get uniprot:P03952 via closeMatch"
echo '9392f4daa6251b75aeb1b1d28316ff9d15831427 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< ./test/inputs/nest0-array.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

# nest: 1

expect="array, nest 1, get uniprot:P03952"
echo 'e6260f438e2464be10f6c040b322dcb7d6d52c07 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entities" \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="array, nest 1, get uniprot:P03952 for another input"
echo 'b97d8c9ea584eeec9a15821f1f8ab6d87a245042 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entities[].type" \
	Human \
	".entities[].xrefDataSource" \
	".entities[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-array.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

############
### OBJECT #
############

# nest: 0

expect="object, nest 0, echo input"
echo 'c894dbd4e9404b9d77d5f2a67c10b6840b92e1a9 ?-' > "$TMPFILE_SHASUM"
result=$(
echo '{"id": "abc123","xref":{"dataSource": "ensembl","identifier": "ENSG00000132031"}}' |\
./bin/bridgedb xrefs -f "json" \
	-i ".xref.alternates" \
	Human \
	".xref.dataSource" \
	".xref.identifier" \
	ncbigene uniprot |
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 0, piped file input"
echo 'be3453a5af42ec240faead049ad432ac4eca07c1 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".[].type" \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< ./test/inputs/nest0-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 0, piped file input, closeMatch"
echo '6657e4c49007f0a71a69dcfcb9d1b40832b6e7e1 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 0, piped file input, closeMatch again"
echo '6657e4c49007f0a71a69dcfcb9d1b40832b6e7e1 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i "." \
	Human \
	".pvjsgeneratedida49.xrefDataSource" \
	".pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest0-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

# nest: 1

expect="object, nest 1, ..."
echo '7d9c9c0f1144a556b19baff869ec1ff3713da486 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ..."
echo '88927215c8fcdbe4775a3cb2ce23bfba3466f2a0 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Mouse \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP1_73346.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ..."
echo '8190d639cb89df926f7025db7c2f5c822870f16f ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ..."
echo '8190d639cb89df926f7025db7c2f5c822870f16f ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ..."
echo 'e9bccd3123ebbe6fefd5c78123e68324a91b042d ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ... again"
echo 'bb8a7ed12c39f5d03de395ca0be89188338f2a73 ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById[]" \
	-i ".xrefs" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata hmdb chembl.compound chebi hgnc.symbol \
	< ./test/inputs/WP481_94171.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ... again2"
echo 'c05626082873ce00772c181ca69a0bbe7ad1319b ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById[].xrefDataSource" \
	".entitiesById[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 1, ... again3"
echo 'c05626082873ce00772c181ca69a0bbe7ad1319b ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".entitiesById" \
	-i "." \
	Human \
	".[].xrefDataSource" \
	".[].xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

# nest: 2

expect="object, nest 2, ... a"
echo '0718a058567f6d052e9e86b5781a7f85e11f109f ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".sampleData.entitiesById.pvjsgeneratedida49.type" \
	Human \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".sampleData.entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 2, ... b"
echo '0718a058567f6d052e9e86b5781a7f85e11f109f ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-b ".sampleData.entitiesById.pvjsgeneratedida49" \
	-i ".type" \
	Human \
	".xrefDataSource" \
	".xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest2-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="object, nest 2, ... c"
echo 'c05626082873ce00772c181ca69a0bbe7ad1319b ?-' > "$TMPFILE_SHASUM"
result=$(
./bin/bridgedb xrefs -f "json" \
	-i ".entitiesById" \
	Human \
	".entitiesById.pvjsgeneratedida49.xrefDataSource" \
	".entitiesById.pvjsgeneratedida49.xrefIdentifier" \
	ensembl ncbigene uniprot wikidata \
	< ./test/inputs/nest1-object.json |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

## can't currently handle more than one level of nesting before a wildcard:
##./bin/bridgedb xrefs -f "json" Human \
##	".sampleData.entitiesById[].xrefDataSource" ".sampleData.entitiesById[].xrefIdentifier" \
##	".sampleData.entitiesById[]" \
##	ensembl ncbigene uniprot wikidata \
##	< ./test/inputs/nest1-object.json |\
##	jq .
