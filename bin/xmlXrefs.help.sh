#! /bin/bash

GPML_SOURCE_DIR="./wikipathways-20180210-gpml-Homo_sapiens";
MAPPED_DIR="./mapped";

if [ ! -d "$MAPPED_DIR" ]; then
	mkdir "$MAPPED_DIR";
fi

if [ ! -d "$GPML_SOURCE_DIR" ]; then
	wget "http://data.wikipathways.org/current/gpml/$GPML_SOURCE_DIR.zip";
	unzip "$GPML_SOURCE_DIR.zip" -d "$GPML_SOURCE_DIR";
	rm "$GPML_SOURCE_DIR.zip";
fi

for f in $(ls $GPML_SOURCE_DIR | grep "WP.*.gpml"); do
	#echo "$f";
	gpml="$GPML_SOURCE_DIR/$f"
	organism=$(xpath "$gpml" "//@Organism" | awk '{gsub(/\ *[a-zA-Z][a-zA-Z0-9]*="/ , ""); gsub(/"\ */, ""); print $0}');
	xpath $gpml "//Xref/@*[name()='Database' or name()='ID']" |\
	       	awk '{gsub(/["\ ]*Database="/, "\n"); gsub (/"\ *[a-zA-Z][a-zA-Z0-9]*="/, "\t"); gsub(/"\ */, ""); print $0}' |\
	       	awk 'NF' |\
	       	./bin/bridgedb xrefs -f "tsv" "$organism" 0 1 chembl.compound chebi wikidata ensembl ncbigene \
	> "$MAPPED_DIR/$f.gmt.tsv"
done
