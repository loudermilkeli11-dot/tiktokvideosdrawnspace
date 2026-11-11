#!/usr/bin/env bash
# Join collected chunks into per-shot clips: projects/<slug>/out/<shot>.mp4 (lossless concat, same encoder settings).
# usage: bash tools/cloud/join.sh plan.json projects/<slug>
set -euo pipefail
PLAN=$1; PROJ=$2
python3 - "$PLAN" "$PROJ" <<'PY'
import json, sys, subprocess, os, collections
plan, proj = json.load(open(sys.argv[1])), sys.argv[2]; by = collections.OrderedDict()
for c in plan: by.setdefault(c['shot'], []).append(c)
for shot, cs in by.items():
    lst = os.path.join(proj, 'out', 'chunks', shot + '.txt')
    open(lst, 'w').write(''.join(f"file '{c['chunk']}.mp4'\n" for c in sorted(cs, key=lambda c: c['from'])))
    out = os.path.join(proj, 'out', shot + '.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out], check=True)
    n = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip()
    print(f'{out} frames={n} expected={sum(c["to"] - c["from"] for c in cs)}')
PY
