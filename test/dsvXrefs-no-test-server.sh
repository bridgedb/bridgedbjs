#! /bin/bash

# These are in their own file, because I haven't had the chance to add
# them to the mockserver. So they will change if bridgedb changes.

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_BASENAME=$( basename ${BASH_SOURCE[0]} )

TMPFILE=$(mktemp /tmp/${SCRIPT_BASENAME}.XXXXXX) || exit 1
TMPFILE_SHASUM="$TMPFILE.sha1sum"

touch "$TMPFILE"
touch "$TMPFILE_SHASUM"

cleanup() {
  rm "$TMPFILE"
  rm "$TMPFILE_SHASUM"
}

debug() {
	cmd=$previous_command ret=$?
	if [ $ret -ne 0 ]; then
		echo '****************************************************************' > /dev/stderr;
		echo "Command failed (error code $ret). Expected $expect in $SCRIPT_PATH" > /dev/stderr;
		echo '****************************************************************' > /dev/stderr;
		echo "$cmd" > /dev/stderr;
		echo '' > /dev/stderr;
		echo "* Unexpected result:" > /dev/stderr;
		cat "$TMPFILE" > /dev/stderr;
		echo '' > /dev/stderr;
		echo "* Unexpected sha1sum: $(cat "$TMPFILE" | bin/sha1sumup)" > /dev/stderr;
		echo '' > /dev/stderr;
	fi
}

trap 'previous_command=$this_command; this_command=$BASH_COMMAND;' DEBUG
trap 'debug $previous_command $this_command' ERR
trap cleanup EXIT INT QUIT TERM

expect="to get 15 rows of 'Entrez Gene	7157	ensembl	ENSG00000141510'"
echo 'f23d22a6d94ef5e61c96a623ed8eb823fc188d26 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	ensembl \
	< test/RefSeqSample.tsv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="to get 15 instances of 'Entrez Gene	7157	ensembl	ENSG00000141510', despite timeout"
echo 'f23d22a6d94ef5e61c96a623ed8eb823fc188d26 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -t 2 -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	ensembl \
	< test/RefSeqSample.tsv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="to get xrefs for a large dataset, including result 'Entrez Gene	6352'"
echo '5d2a70314faadd78cb9f7c06116a8279a44e3611 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" 1 0 \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< test/inputs/large.tsv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="to get outputs in multiple datasource formats."
echo 'b29638efb0aa2a02cafe51845bf4adacc1491a7b ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs "Homo sapiens" CAS "50-00-0" \
	CAS cas chebi P2057 P683 |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")
