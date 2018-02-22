#! /bin/bash
(jq -r '.entitiesById[] | select(has("dbConventionalName") and .kaavioType=="SingleFreeNode") | .dbConventionalName+","+.dbId' |\
       	head -n 3 |\
	while read -r ln; do \
		xrefDb="${ln/,*/}"; \
		xrefId="${ln/*,/}"; \
		./bin/bridgedb xrefs "Homo sapiens" "$xrefDb" "$xrefId" |\
	       	jq -c ". | {\"$xrefDb:$xrefId\":[.dataSource+\":\"+.dbId]}" &\
	       	#tee "xrefs-for-$xrefId.tsv" & \
	done |\
		jq -Rs --stream 'split("\n") | reduce .[] as $item ([]; if $item == "" then . else . + [($item | fromjson | to_entries | .[0])] end) | reduce .[] as $item ({}; if has($item.key) then (. += {($item.key): (.[$item.key] + $item.value)}) else (. += {($item.key): $item.value}) end)' | \
	       	tee "xrefs.tsv" \
		) <\
       	"../gpml2pvjson-js/test/expected/WP481_94171.json"
