#! /bin/bash

#    When you pipe your JSON though this tool, it will:
#    1) find the xref(s) in your JSON as specified by
#       xrefDataSource and xrefIdentifier
#    1) map the found xrefs to equivalents/alternates from
#       other datasources. If you specified one or more
#       desiredDataSource(s), the mapped xrefs will be
#       limited to what you specified.
#    2) Optionally add these mapped xrefs to your JSON at the
#	location(s)
#       specified by insertionPoint
#    3) pipe your JSON back out with the added xrefs
#
#    Paths use the format of basic jq filters, e.g.:
#          .a
#          .a.z
#          .a.z.x
#          .a.z.x.y
#          .[]
#          .[].z
#          .[].z.y
#          .[].z.y.x
#          .a[]
#          .a[].z
#          .a[].z.y
#          .a[].z.y.x
#
#      More info: https://stedolan.github.io/jq/manual/v1.5/#Basicfilters
#
#    Note: This has been tested on the pvjson format from gpml2pvjson:
#      <https://github.com/wikipathways/gpml2json>
#      If you are using it on another format, exercise caution and verify your results.
#
# Examples:

# Just get xrefs:

      echo '{"id":"abc123","xref":{"dataSource":"ensembl","identifier":"ENSG00000132031"}}' |\
      ./bin/bridgedb xrefs -f "json" \
        Human  ".xref.dataSource" ".xref.identifier" \
        ensembl uniprot |\
      jq .

      echo '[{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
      ./bin/bridgedb xrefs -f "json" \
        Human ".[].xrefDataSource" ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata

      ./bin/bridgedb xrefs -f "json" -i ".[].type" \
        Human ".[].xrefDataSource" ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < "./test/inputs/nest0-array.json" |\
      jq .

      ./bin/bridgedb xrefs -f "json" \
	Human ".[].xrefDataSource" ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest0-array.json |\
      jq .

      ./bin/bridgedb xrefs -f "json" \
        Human ".entitiesById[].xrefDataSource" ".entitiesById[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest1-object.json |\
      jq .

      ./bin/bridgedb xrefs -f "json" \
        Human ".entitiesById[].xrefDataSource" ".entitiesById[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest1-object.json |\
      jq .

# Get xrefs and insert them into your JSON:

      echo '{"id":"abc123","xref":{"dataSource":"ensembl","identifier":"ENSG00000132031"}}' |\
      ./bin/bridgedb xrefs -f "json" \
        -i ".xref.alternates" \
        Human \
        ".xref.dataSource" \
        ".xref.identifier" \
        ensembl uniprot

      echo '[{"xrefDataSource": "Entrez Gene", "xrefIdentifier": "1234"}]' |\
      ./bin/bridgedb xrefs -f "json" \
        -i ".[]" \
        Human \
        ".[].xrefDataSource" \
        ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata

      ./bin/bridgedb xrefs -f "json" -i ".[].type" \
        Human \
        ".[].xrefDataSource" \
        ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < "./test/inputs/nest0-array.json" |\
      jq .

      ./bin/bridgedb xrefs -f "json" -i ".[]" \
	Human ".[].xrefDataSource" ".[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest0-array.json |\
      jq .

      ./bin/bridgedb xrefs -f "json" -i ".entitiesById[].type" \
        Human ".entitiesById[].xrefDataSource" ".entitiesById[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest1-object.json |\
      jq .

      ./bin/bridgedb xrefs -f "json" -i ".entitiesById" \
        Human ".entitiesById[].xrefDataSource" ".entitiesById[].xrefIdentifier" \
        ensembl ncbigene uniprot wikidata \
      < ./test/inputs/nest1-object.json |\
      jq .
