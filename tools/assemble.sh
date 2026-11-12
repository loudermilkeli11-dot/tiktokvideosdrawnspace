#!/usr/bin/env bash
# assemble.sh — shots + overlay + per-shot sound + score -> out/final.mp4
# usage: bash tools/assemble.sh projects/<slug> [--tail SECONDS] [--target-mb 85] [--preset medium]
#   video: out/<name>.mp4 concatenated frame-exact in shots.txt order (longer clips trimmed, shorter = error),
#          out/overlay.mov composited on top (skipped with a warning if missing), 2-pass libx264 High yuv420p.
#   audio: each out/<name>.wav placed at its shot start, trimmed to shot + tail (fade-out over the tail),
#          + out/score.wav; loudness -> -14 LUFS / <= -1 dBTP (measure, linear gain, true-peak limiter,
#          re-measure + correct); THEN exact zeros in score.json "silent" ranges (+ loop_silence_frames); AAC 192k.
set -euo pipefail
PROJ="${1:?usage: assemble.sh projects/<slug> [--tail S] [--target-mb MB] [--preset P]}"; shift
TAIL=0.6; TARGET_MB=85; PRESET=medium
while [ $# -gt 0 ]; do case "$1" in
  --tail) TAIL="$2"; shift 2;; --target-mb) TARGET_MB="$2"; shift 2;; --preset) PRESET="$2"; shift 2;;
  *) echo "unknown arg $1" >&2; exit 2;; esac; done
PROJ="$(cd "$PROJ" && pwd)"; OUT="$PROJ/out"; TMP="$OUT/tmp.$$"   # per-run folder: a folder locked by a crashed run (Windows) never blocks the next one
FPS=30; FF="ffmpeg -hide_banner -nostdin -loglevel error -y"
# python: python3 on Linux; on Windows (Git Bash) python3 can be the Store stub, so fall back to python
PY=${PYTHON:-python3}; "$PY" -c "import numpy" >/dev/null 2>&1 || PY=python
python3() { command "$PY" "$@"; }
rm -rf "$OUT"/tmp "$OUT"/tmp.* 2>/dev/null; mkdir -p "$TMP"; trap 'rm -rf "$TMP"' EXIT
T0=$(date +%s)

# ---------- shots
NAMES=(); FRAMES=(); TOTAL=0
while read -r name fr _; do
  NAMES+=("$name"); FRAMES+=("$fr"); TOTAL=$((TOTAL + fr))
done < <(sed 's/#.*//' "$PROJ/shots.txt" | awk 'NF>=2{print $1, $2}')
[ "$TOTAL" -gt 0 ] || { echo "ERROR: empty shots.txt" >&2; exit 1; }
DUR=$(python3 -c "print($TOTAL/$FPS)")
echo "assemble: ${#NAMES[@]} shots, $TOTAL frames, ${DUR}s"

INPUTS=(); FILT=""; CAT=""
for i in "${!NAMES[@]}"; do
  f="$OUT/${NAMES[$i]}.mp4"; want=${FRAMES[$i]}
  [ -f "$f" ] || { echo "ERROR: missing $f" >&2; exit 1; }
  have=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$f")
  if [ "$have" -lt "$want" ]; then echo "ERROR: ${NAMES[$i]}.mp4 has $have frames, shots.txt wants $want" >&2; exit 1; fi
  [ "$have" -gt "$want" ] && echo "  note: ${NAMES[$i]}.mp4 has $have frames, trimming to $want"
  INPUTS+=(-i "$f")
  FILT+="[$i:v]trim=end_frame=$want,setpts=PTS-STARTPTS,fps=$FPS,scale=1080:1920,setsar=1,format=yuv420p[v$i];"
  CAT+="[v$i]"
done
N=${#NAMES[@]}
FILT+="${CAT}concat=n=$N:v=1:a=0[cat];"
if [ -f "$OUT/overlay.mov" ]; then
  ovf=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$OUT/overlay.mov")
  [ "$ovf" -ne "$TOTAL" ] && echo "  WARNING: overlay.mov has $ovf frames, film has $TOTAL"
  INPUTS+=(-i "$OUT/overlay.mov")
  FILT+="[$N:v]setpts=PTS-STARTPTS,format=argb[ov];[cat][ov]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[vout]"
else
  echo "  WARNING: no out/overlay.mov — assembling without captions"
  FILT+="[cat]format=yuv420p[vout]"
fi

# ---------- audio mix (numpy): shot wavs at offsets + score -> mix.f32 wav
python3 - "$PROJ" "$TAIL" "$TMP" <<'PY'
import sys, os, subprocess, json, numpy as np
proj, tail, tmp = sys.argv[1], float(sys.argv[2]), sys.argv[3]
SR, FPS = 48000, 30
shots = []; start = 0
for line in open(os.path.join(proj, 'shots.txt')):
    line = line.split('#')[0].split()
    if len(line) >= 2: shots.append((line[0], int(line[1]), start)); start += int(line[1])
N = int(round(start / FPS * SR))
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, '<f4').reshape(-1, 2).T.astype(np.float64)
mix = np.zeros((2, N)); used = []
for name, fr, st in shots:
    p = os.path.join(proj, 'out', name + '.wav')
    if not os.path.exists(p): print(f'  note: no {name}.wav (silent shot)'); continue
    x = load(p)
    keep = int(round((fr / FPS + tail) * SR)); x = x[:, :keep]
    body = int(round(fr / FPS * SR))
    if x.shape[1] > body:  # fade-out over the tail (cosine)
        n = x.shape[1] - body
        x[:, body:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n)))[None]
    i0 = int(round(st / FPS * SR)); i1 = min(N, i0 + x.shape[1])
    mix[:, i0:i1] += x[:, :i1 - i0]; used.append(name)
sp = os.path.join(proj, 'out', 'score.wav')
if os.path.exists(sp):
    s = load(sp)[:, :N]; mix[:, :s.shape[1]] += s; used.append('score')
else: print('  note: no score.wav')
print(f'  audio mix: {", ".join(used)}  peak {20*np.log10(np.abs(mix).max()+1e-12):.1f} dBFS')
import wave
with wave.open(os.path.join(tmp, 'mix.wav'), 'wb') as w:  # 24-bit
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
    v = (np.clip(mix, -1, 1 - 2**-23).T * 2**23).round().astype('<i4').tobytes()
    a = np.frombuffer(v, np.uint8).reshape(-1, 4)[:, :3]; w.writeframes(a.tobytes())
PY

# ---------- loudness: measure -> gain + true-peak limiter -> re-measure -> correct
measure() { # prints "I TP"
  ffmpeg -hide_banner -nostdin -i "$1" -af loudnorm=I=-14:TP=-1:LRA=20:print_format=json -f null - 2>&1 \
   | python3 -c "import sys,json,re; t=sys.stdin.read(); j=json.loads(t[t.rindex('{'):t.rindex('}')+1]); print(j['input_i'], j['input_tp'])"
}
read -r I TP < <(measure "$TMP/mix.wav")
echo "  mix measured: I=$I LUFS TP=$TP dBTP"
GAIN=$(python3 -c "print(round(-14-($I),2) if '$I' not in ('-inf','inf') else 0)")
SRC="$TMP/mix.wav"
for pass in 1 2 3 4; do
  # limiter at 192k (true-peak-ish), ceiling -2 dBFS (AAC encode adds ~0.5 dB overshoot)
  $FF -i "$SRC" -af "volume=${GAIN}dB,aresample=192000,alimiter=limit=0.79:attack=1:release=60:level=false:asc=1,aresample=48000" \
      -c:a pcm_s24le "$TMP/norm$pass.wav"
  read -r I2 TP2 < <(measure "$TMP/norm$pass.wav")
  echo "  pass $pass: gain ${GAIN} dB -> I=$I2 LUFS TP=$TP2 dBTP"
  OK=$(python3 -c "print(int(abs(-14-($I2))<=0.3 and ($TP2)<=-1.0))")
  NORM="$TMP/norm$pass.wav"
  [ "$OK" = 1 ] && break
  GAIN=$(python3 -c "print(round(($GAIN)+1.4*(-14-($I2)),2))")  # over-correct: limiter eats part of the gain
done

# ---------- gate: exact digital silence in score.json silent ranges (+ loop tail)
python3 - "$PROJ" "$NORM" "$TMP/gated.wav" "$TOTAL" <<'PY'
import sys, os, json, wave, numpy as np
proj, src, dst, total = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
SR, FPS = 48000, 30
w = wave.open(src); n = w.getnframes(); b = np.frombuffer(w.readframes(n), np.uint8).reshape(-1, 3)
x = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int8).astype(np.int32) << 16)).reshape(-1, 2)
N = int(round(total / FPS * SR)); x = np.vstack([x, np.zeros((max(0, N - len(x)), 2), np.int32)])[:N]
cue = json.load(open(os.path.join(proj, 'score.json'))) if os.path.exists(os.path.join(proj, 'score.json')) else {}
rngs = [tuple(r) for r in cue.get('silent', [])]
if cue.get('loop_silence_frames'): rngs.append(((total - cue['loop_silence_frames']) / FPS, total / FPS))
fl = int(0.003 * SR); xf = x.astype(np.float64)
for a, b_ in rngs:
    i0, i1 = int(round(a * SR)), min(N, int(round(b_ * SR)))
    if i0 - fl > 0: xf[i0 - fl:i0] *= np.linspace(1, 0, fl)[:, None]
    if i1 + fl < N: xf[i1:i1 + fl] *= np.linspace(0, 1, fl)[:, None]
    xf[i0:i1] = 0
    print(f'  gate: silence {a:.3f}-{b_:.3f}s')
out = wave.open(dst, 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes(np.clip(np.round(xf / 256), -32768, 32767).astype('<i2').tobytes()); out.close()
PY
$FF -i "$TMP/gated.wav" -c:a aac -b:a 192k -ar 48000 "$TMP/audio.m4a"

# ---------- video: 2-pass x264 at a bitrate that lands ~TARGET_MB
VBR=$(python3 -c "d=$DUR; print(min(30000, int(($TARGET_MB*8e6/d - 192e3)*0.985/1000)))")  # capped at 30 Mbps for short films
echo "  video: 2-pass libx264 $PRESET @ ${VBR}k ($TARGET_MB MB target)"
X264=(-c:v libx264 -preset "$PRESET" -profile:v high -pix_fmt yuv420p -b:v "${VBR}k" -maxrate "$((VBR*2))k" -bufsize "$((VBR*2))k"
      -g 30 -keyint_min 30 -sc_threshold 0 -r $FPS -frames:v "$TOTAL")
AIDX=$(( ${#INPUTS[@]} / 2 ))
( cd "$TMP" && $FF "${INPUTS[@]}" -filter_complex "$FILT" -map "[vout]" "${X264[@]}" -pass 1 -passlogfile "$TMP/x264" -an -f null - )
( cd "$TMP" && $FF "${INPUTS[@]}" -i "$TMP/audio.m4a" -filter_complex "$FILT" -map "[vout]" -map "$AIDX:a" \
    "${X264[@]}" -pass 2 -passlogfile "$TMP/x264" -c:a copy -movflags +faststart "$OUT/final.mp4" )

# ---------- report
F="$OUT/final.mp4"
NF=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$F")
VD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
SZ=$(stat -c %s "$F")
read -r FI FTP < <(measure "$F")
echo "final: $F"
echo "  frames $NF (expected $TOTAL)  duration ${VD}s  size $(python3 -c "print(f'{$SZ/1e6:.1f}')") MB"
echo "  loudness I=$FI LUFS  TP=$FTP dBTP   (assembled in $(( $(date +%s) - T0 ))s)"
[ "$NF" -eq "$TOTAL" ] || { echo "ERROR: frame count mismatch" >&2; exit 1; }
[ "$SZ" -lt 100000000 ] || { echo "ERROR: file >= 100 MB" >&2; exit 1; }
