#!/usr/bin/env bash
# Two (or J) renderers per machine on one page, then lossless concat.
# bash tools/run.sh page.html out.mp4 FROM TO [J=2] [extra render.js args...]
set -euo pipefail
PAGE=$1; OUT=$2; FROM=$3; TO=$4; J=${5:-2}; shift $(( $# < 5 ? $# : 5 )) || true
D=$(dirname "$0"); TMP=$(mktemp -d "${OUT%.mp4}.parts.XXXX"); N=$((TO-FROM)); STEP=$(( (N + J - 1) / J ))
pids=(); : > "$TMP/list.txt"
for ((k=0; k<J; k++)); do a=$((FROM + k*STEP)); b=$((a+STEP)); ((b>TO)) && b=$TO; ((a>=b)) && continue
  node "$D/render.js" "$PAGE" "$TMP/p$k.mp4" --from $a --to $b "$@" > "$TMP/p$k.log" 2>&1 & pids+=($!); echo "file 'p$k.mp4'" >> "$TMP/list.txt"; done
fail=0; for p in "${pids[@]}"; do wait $p || fail=1; done
((fail)) && { tail -5 "$TMP"/p*.log; exit 1; }
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$OUT"
n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$OUT")
echo "$OUT frames=$n expected=$N"; tail -1 "$TMP"/p*.log; rm -rf "$TMP"; [ "$n" = "$N" ]
