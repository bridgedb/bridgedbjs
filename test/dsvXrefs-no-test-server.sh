#! /bin/bash

# These are in their own file, because I haven't had the chance to add
# them to the mockserver. So they will change if bridgedb changes.

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
