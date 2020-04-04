SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_BASENAME=$( basename ${BASH_SOURCE[0]} )

TMPFILE=$(mktemp /tmp/${SCRIPT_BASENAME}.XXXXXX) || exit 1
TMPFILE_SHASUM="$TMPFILE.sha1sum"

cleanup() {
  if [ -e "$TMPFILE" ]; then
    rm "$TMPFILE"
  fi
  if [ -e "$TMPFILE_SHASUM" ]; then
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

##################################

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
echo '' > "$TMPFILE"

###################################

##################################

expect="Result to have HGNC:CCR6."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0 \
	<<< $'1234\n1235\n' |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")
echo '' > "$TMPFILE"

##################################

expect="Result to have Uniprot-TrEMBL:Q38L21."
echo 'eb26f3caa2d3e8960cbdcb3847a6a39f6b47e0f9 ?-' > "$TMPFILE_SHASUM"
result=$(echo $'gene\n1234\n1235\n' |\
	./bin/bridgedb xrefs -f "tsv" --headers=true \
	"Homo sapiens" "Entrez Gene" "gene" |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")
echo '' > "$TMPFILE"

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
echo '' > "$TMPFILE"

##################################

expect="Result to have 250 xrefs."
echo '2a62fd85cb38de49dca92568adb7c5bec99a33c1 ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs -f "csv" "Homo sapiens" 0 1 \
	< test/xrefDataSourcesAndIdentifiers.csv |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")
echo '' > "$TMPFILE"

##################################

expect="to get outputs in multiple datasource formats."
echo 'b29638efb0aa2a02cafe51845bf4adacc1491a7b ?-' > "$TMPFILE_SHASUM"
result=$(./bin/bridgedb xrefs "Homo sapiens" CAS "50-00-0" \
	CAS cas chebi P2057 P683 |\
       	tee "$TMPFILE" |\
	bin/sha1sumup -c "$TMPFILE_SHASUM")

###################################

#echo 'local xrefs'
#echo $'7157\n' | ./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0
#echo $'7157\n7157\n7157\n' | ./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0
#
#echo 'remote xrefs'
#(unset NODE_ENV && echo $'7157\n' | ./bin/bridgedb xrefs -f "tsv" "Homo sapiens" "Entrez Gene" 0)
#
## bizarrely, 1 gives a different result from 2 below:
#echo 'local xrefsBatch? 4'
#./bin/bridgedb xrefs --headers=true -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
#	ensembl \
#	< test/RefSeqSample.tsv
#
#echo 'local xrefsBatch? 5'
#./bin/bridgedb xrefs --headers=true -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
#	ensembl b \
#  < test/RefSeqSample.tsv
#
## but here, 1 and 2 give the same result
#echo 'remote xrefsBatch? 4'
#(unset NODE_ENV && ./bin/bridgedb xrefs --headers=true -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
#	ensembl \
#	< test/RefSeqSample.tsv)
#
#echo 'remote xrefsBatch? 5'
#(unset NODE_ENV && ./bin/bridgedb xrefs --headers=true -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
#	ensembl b \
#	< test/RefSeqSample.tsv)

expected_count=15
expect="to get $expected_count rows of 'Entrez Gene	7157	ensembl	ENSG00000141510'"
# TODO: fix the bug that requires having more than one filter, e.g.,
# ensembl ncbigene, not just ensembl.
# This issue shows up just for localhost, not webservice.bridgedb.org.
actual_count=$(./bin/bridgedb xrefs --headers=true -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
	ensembl ncbigene \
	< test/RefSeqSample.tsv |\
  grep -c 'Entrez Gene	7157	ensembl	ENSG00000141510')

if [ $actual_count -lt $expected_count ]; then
  echo "got $actual_count results, but expected $expect" >/dev/stderr && exit 1
fi

##################################

expected_count=15
expect="to get $expected_count instances of 'Entrez Gene	7157	ensembl	ENSG00000141510', despite timeout"
# TODO: fix the bug that requires having more than one filter, e.g.,
# ensembl ncbigene, not just ensembl.
# This issue shows up just for localhost, not webservice.bridgedb.org.
actual_count=$(./bin/bridgedb xrefs --headers=true -t 2 -f "tsv" "Homo sapiens" "Entrez Gene" "Gene" \
	ensembl placeholder \
	< test/RefSeqSample.tsv |\
  grep -c 'Entrez Gene	7157	ensembl	ENSG00000141510')

if [ $actual_count -lt $expected_count ]; then
  echo "got $actual_count results, but expected $expect" >/dev/stderr && exit 1
fi

##################################

# The following is the only query that isn't mocked.
# We can't mock it because it would make an excessively long filename.
# There were 698 results as of 2020-04-03, but this number may change
# (probably rise) slowly over time, so it doesn't have to match exactly.
expected_count=650
expect="to get at least $expected_count xrefs for a large dataset, including result 'Entrez Gene	6352'"
result=$(unset NODE_ENV && ./bin/bridgedb xrefs -f "tsv" "Homo sapiens" 1 0 \
	ensembl hgnc.symbol ncbigene uniprot hmdb chebi wikidata \
	< test/inputs/large.tsv)
actual_count=$(echo -e "$result" |	wc -l)
if [ $(echo "$result" | grep -c 'Entrez Gene	6352') -lt 1 ]; then
  echo "expected $expect" >/dev/stderr && exit 1
fi
if [ $actual_count -lt $expected_count ]; then
  echo "got $actual_count results, but expected $expect" >/dev/stderr && exit 1
fi

##################################
