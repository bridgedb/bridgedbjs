#!/usr/bin/env sh

organism="Human"

##############################
## a simple GET from xrefs
##############################

#datasource_symbol="Ca"
#xref_identifier="50-00-0"
#
#mock_dir="./test/mocks/$organism/xrefs/$datasource_symbol/$xref_identifier"
#mkdir -p "$mock_dir"
#mock_f="$mock_dir/GET.mock"
#
## copy the headers from an existing file to the new mock file
#head -n 7 "./test/mocks/Human/xrefsBatch/POST.mock" >"$mock_f"
#
#curl \
#	--header 'Accept: */*' \
#	"https://webservice.bridgedb.org/$organism/xrefs/$datasource_symbol/$xref_identifier" \
#  >>"$mock_f"

###########################################
# a more complicated POST to xrefsBatch
###########################################

#input_f=$(mktemp /tmp/mock-input.XXXXXX) || exit 1
#echo -e '50-00-0\tCAS\n' > "$input_f"

input_f="./test/inputs/medium1.tsv"

post_body=""
while IFS= read -r line; do
  [[ -z $line ]] && break
  post_body="$post_body"$(echo "$line" | awk -F\\t '{print $1"\\t"$2"\\n"}')
done < "$input_f"

mock_filename='POST--'"$(printf "$post_body")"'.mock'

filename_length_max=255
filename_length=${#mock_filename}
# filenames on Linux are limited to 255 bytes
[ $filename_length -gt $filename_length_max ] && echo $'\n'"mock_filename is too long ($filename_length > $filename_length_max):"$'\n'"$mock_filename"$'\n' >/dev/stderr && exit 1
mock_dir="./test/mocks/$organism/xrefsBatch"
mkdir -p "$mock_dir"
mock_f="$mock_dir/$mock_filename"

# copy the headers from an existing file to the new mock file
head -n 7 "./test/mocks/Human/xrefsBatch/POST.mock" >"$mock_f"

printf "$post_body" |\
  curl -X POST \
	--data-binary @- \
  --header 'Content-Type: text/html' \
	--header 'Accept: */*' \
	"https://webservice.bridgedb.org/$organism/xrefsBatch" \
  >>"$mock_f"

##################################
# the following queries also work:
##################################

#echo -e '1234\tEntrez Gene\n' | curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d @- \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	-d $'1234\tEntrez Gene\n1235\tEntrez Gene\n1236\tEntrez Gene\nHMDB01442\tHMDB' \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	--data-binary @mypostbody1.txt \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#echo -e "$post_body" | curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	--data-binary @- \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#printf "$post_body" | curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	--data-binary @- \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#printf "$post_body" > mypostbody1.txt
#cat mypostbody1.txt | curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	--data-binary @- \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'

#printf "$post_body" > mypostbody1.txt
#curl -X POST --header 'Content-Type: text/html' \
#	--header 'Accept: */*' \
#	--data-binary @mypostbody1.txt \
#	'https://webservice.bridgedb.org/Human/xrefsBatch'
