#!/usr/bin/env bash
# ONE collector loop: poll every 15 s for out/<chunk> branches, fetch each into its own ref (never FETCH_HEAD in parallel),
# extract the MP4, verify the frame count, re-fetch bad ones. Writes projects/<slug>/out/chunks/<chunk>.mp4.
# usage: bash tools/cloud/collect.sh plan.json projects/<slug> [timeout_min=120]
set -uo pipefail
PLAN=$1; PROJ=$2; TMO=${3:-120}; DEST="$PROJ/out/chunks"; mkdir -p "$DEST"
mapfile -t CH < <(python3 -c "import json,sys; [print(c['chunk'], c['to']-c['from']) for c in json.load(open('$PLAN'))]")
end=$(( $(date +%s) + TMO * 60 ))
while :; do
  missing=0; remote=$(git ls-remote origin 'refs/heads/out/*' 2>/dev/null)
  for line in "${CH[@]}"; do set -- $line; c=$1; n=$2; f="$DEST/$c.mp4"
    if [ -f "$f" ] && [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)" = "$n" ]; then continue; fi
    missing=$((missing+1))
    if grep -q "refs/heads/out/$c\$" <<<"$remote"; then
      git fetch -q origin "+refs/heads/out/$c:refs/remotes/origin/out/$c" && git show "refs/remotes/origin/out/$c:$c.mp4" > "$f.tmp" && mv "$f.tmp" "$f"
      got=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)
      echo "$(date -u +%T) $c frames=$got/$n"; [ "$got" = "$n" ] || rm -f "$f"
    fi
  done
  echo "$(date -u +%T) missing: $missing / ${#CH[@]}"
  [ $missing -eq 0 ] && { echo ALL_COLLECTED; exit 0; }
  [ "$(date +%s)" -gt $end ] && { echo "TIMEOUT: relaunch the missing chunks with the same names"; exit 1; }
  sleep 15
done
