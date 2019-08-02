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

# Here's the query to get the raw BridgeDb response:
#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d $'1234\n1235\n' \
#	'https://webservice.bridgedb.org/Human/xrefsBatch/Entrez%20Gene'

expect="Result to be 2 lines long."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" -i 1 "Homo sapiens" "Entrez Gene" 0 |\
	wc -l |\
	grep -E '^2$')

##################################

expect="Result to have PDB:1ND8."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(echo $'1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="Result to have HGNC:CCR6."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n' |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="Result to have Uniprot-TrEMBL:Q38L21."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(echo $'gene\n1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" --headers=true \
	"Homo sapiens" "Entrez Gene" "gene" |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

# Here's the query to get the raw BridgeDb response:
#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d $'1234\n1235\n1236\n' \
#	'https://webservice.bridgedb.org/Human/xrefsBatch/Entrez%20Gene'

expect="Result to have OMIM:600242."
echo '2a62fd85cb38de49dca92568adb7c5bec99a33c1 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "csv" "Homo sapiens" "Entrez Gene" 0 \
	< test/xrefIdentifiers.csv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

##################################

expect="Result to have 250 xrefs."
echo '2a62fd85cb38de49dca92568adb7c5bec99a33c1 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "csv" "Homo sapiens" 0 1 \
	< test/xrefDataSourcesAndIdentifiers.csv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")
