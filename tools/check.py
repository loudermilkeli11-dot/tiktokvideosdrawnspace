#!/usr/bin/env python3
"""check.py — QC for a finished film.

usage: python3 tools/check.py projects/<slug>/out/final.mp4 [--score projects/<slug>/score.json] [--frames N]

Writes next to the video: <name>.check.txt (report) and <name>.contact_NN.jpg (1 fps contact sheets).
Expected frame count: --frames, else sum of ../shots.txt if the video sits in projects/<slug>/out/.
score.json defaults to ../score.json likewise (silent ranges + loop_silence_frames).
Exit code 1 on hard failures: frame count, size >= 100 MB, loudness off -14 LUFS by > 1 LU, white flashes.
"""
import json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = 30
GW, GH = 270, 480          # analysis resolution (1/4 of 1080x1920)
SCALE = 1080 / GW
TW, TH = 180, 320          # contact-sheet thumb
COLS, ROWS = 6, 6


def tc(f):
    s = f / FPS
    return f"{int(s // 60):02d}:{s % 60:05.2f}"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=True)


def decode_gray(path):
    raw = run(['ffmpeg', '-v', 'error', '-threads', '4', '-i', path, '-an', '-vf', f'scale={GW}:{GH}:flags=area,format=gray',
               '-f', 'rawvideo', '-']).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, GH, GW)


def decode_thumbs(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-an', '-vf',
               f"select='not(mod(n\\,{FPS}))',scale={TW}:{TH}:flags=area,format=rgb24", '-fps_mode', 'passthrough',
               '-f', 'rawvideo', '-']).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, TH, TW, 3)


def decode_audio(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'],
                       capture_output=True)
    return np.frombuffer(p.stdout, '<f4').reshape(-1, 2) if p.stdout else np.zeros((0, 2), np.float32)


def ebur128(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    t = p.stderr[p.stderr.rfind('Summary:'):]
    I = re.search(r'I:\s+(-?[\d.]+|-inf) LUFS', t)
    TP = re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', t)
    return (float(I.group(1)) if I else float('nan')), (float(TP.group(1)) if TP else float('nan'))


def contact_sheets(thumbs, base):
    try:
        font = ImageFont.load_default(size=14)
    except TypeError:
        font = ImageFont.load_default()
    per = COLS * ROWS
    paths = []
    for si in range(0, len(thumbs), per):
        chunk = thumbs[si:si + per]
        rows = (len(chunk) + COLS - 1) // COLS
        sheet = Image.new('RGB', (COLS * (TW + 4) + 4, rows * (TH + 22) + 4), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for k, th in enumerate(chunk):
            i = si + k
            x, y = 4 + (k % COLS) * (TW + 4), 4 + (k // COLS) * (TH + 22)
            sheet.paste(Image.fromarray(th), (x, y))
            d.text((x + 2, y + TH + 3), f"f{i * FPS}  {tc(i * FPS)}", fill=(255, 230, 120), font=font)
        p = f"{base}.contact_{si // per + 1:02d}.jpg"
        sheet.save(p, quality=85)
        paths.append(p)
    return paths


def analyze_motion(g):
    """per frame-pair: global shift (px, 1080 space), local motion (px), mean abs diff; per frame: luma, lapvar."""
    n = len(g)
    luma = g.reshape(n, -1).mean(1) / 255.0
    gf = g.astype(np.float32) / 255.0
    lap = (gf[:, 1:-1, 1:-1] * 4 - gf[:, :-2, 1:-1] - gf[:, 2:, 1:-1] - gf[:, 1:-1, :-2] - gf[:, 1:-1, 2:])
    lapvar = lap.reshape(n, -1).var(1)
    win = (np.hanning(GH)[:, None] * np.hanning(GW)[None, :]).astype(np.float32)
    shifts = np.zeros((max(n - 1, 0), 2)); peak = np.zeros(max(n - 1, 0))
    mad = np.zeros(max(n - 1, 0)); local = np.zeros(max(n - 1, 0)); hcorr = np.zeros(max(n - 1, 0))
    hist = np.stack([np.bincount((fr.ravel() >> 3), minlength=32) for fr in g]).astype(np.float64)
    CH = 120
    prevF = None
    for c0 in range(0, n, CH):
        blk = gf[c0:c0 + CH]
        F = np.fft.rfft2((blk - blk.mean(axis=(1, 2), keepdims=True)) * win)
        if prevF is not None:
            F = np.concatenate([prevF, F])
            base = c0 - 1
        else:
            base = c0
        R = F[1:] * np.conj(F[:-1])
        R /= np.abs(R) + 1e-9
        r = np.fft.irfft2(R, s=(GH, GW))
        for k in range(len(r)):
            i = base + k
            idx = np.unravel_index(np.argmax(r[k]), r[k].shape)
            dy = idx[0] if idx[0] <= GH // 2 else idx[0] - GH
            dx = idx[1] if idx[1] <= GW // 2 else idx[1] - GW
            shifts[i] = (dx * SCALE, dy * SCALE); peak[i] = r[k][idx]
        prevF = F[-1:]
    for i in range(n - 1):
        a, b = gf[i], gf[i + 1]
        mad[i] = np.abs(b - a).mean()
        dx, dy = int(round(shifts[i][0] / SCALE)), int(round(shifts[i][1] / SCALE))
        bc = np.roll(b, (-dy, -dx), axis=(0, 1))
        m = 8 + max(abs(dx), abs(dy))
        it = np.abs(bc - a)[m:-m, m:-m] if m * 2 < min(GH, GW) else np.abs(bc - a)
        ga = np.abs(np.diff(a, axis=1))[m:-m, m:-m - 1] if m * 2 < min(GH, GW) else np.abs(np.diff(a, axis=1))
        local[i] = it.mean() / (ga.mean() + 1e-3) * SCALE   # |I_t|/|grad I| ~ residual motion px
        h1, h2 = hist[i], hist[i + 1]
        hcorr[i] = np.corrcoef(h1, h2)[0, 1] if h1.std() > 0 and h2.std() > 0 else 1.0
    return luma, lapvar, shifts, peak, mad, local, hcorr


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    t_start = time.time()
    video = os.path.abspath(args[0])
    opt = lambda k: args[args.index(k) + 1] if k in args else None
    projdir = os.path.dirname(os.path.dirname(video))
    expected = int(opt('--frames')) if opt('--frames') else None
    if expected is None and os.path.exists(os.path.join(projdir, 'shots.txt')):
        expected = sum(int(l.split('#')[0].split()[1]) for l in open(os.path.join(projdir, 'shots.txt')) if len(l.split('#')[0].split()) >= 2)
    score_path = opt('--score') or (os.path.join(projdir, 'score.json') if os.path.exists(os.path.join(projdir, 'score.json')) else None)
    cue = json.load(open(score_path)) if score_path else {}
    base = os.path.splitext(video)[0]

    with ThreadPoolExecutor(4) as ex:
        fg = ex.submit(decode_gray, video); ft = ex.submit(decode_thumbs, video)
        fa = ex.submit(decode_audio, video); fl = ex.submit(ebur128, video)
        g, thumbs, audio, (I, TP) = fg.result(), ft.result(), fa.result(), fl.result()
    sheets = contact_sheets(thumbs, base)
    n = len(g)
    size = os.path.getsize(video)
    dur = n / FPS
    luma, lapvar, shifts, peak, mad, local, hcorr = analyze_motion(g)

    out, fails, warns = [], [], []
    P = out.append
    P(f"CHECK {video}")
    P(f"frames: {n}" + (f" (expected {expected})" if expected else "") + f"   duration {dur:.3f}s   size {size / 1e6:.2f} MB")
    if expected and n != expected: fails.append(f"frame count {n} != {expected}")
    if size >= 100e6: fails.append(f"size {size / 1e6:.1f} MB >= 100 MB")
    if not (61 <= dur <= 70): warns.append(f"duration {dur:.2f}s outside 61-70s")
    P(f"loudness: I={I:.1f} LUFS  TP={TP:.1f} dBTP (target -14 / <= -1)")
    if not (abs(I + 14) <= 1): fails.append(f"integrated loudness {I:.1f} LUFS (off by > 1 LU)")
    if TP > -1.0: warns.append(f"true peak {TP:.1f} dBTP > -1")

    # white flashes
    jumps = np.abs(np.diff(luma))
    flash = sorted(set(np.where(luma > 0.85)[0].tolist()) | set((np.where(jumps > 0.35)[0] + 1).tolist()))
    P(f"white-flash check: {len(flash)} frames" + (": " + ", ".join(f"f{f} {tc(f)} (luma {luma[f]:.2f})" for f in flash[:30]) if flash else " — OK"))
    if flash: fails.append(f"{len(flash)} white-flash frames")

    # hard cuts
    cut = (mad > 0.25) | ((mad > 0.08) & (hcorr < 0.9)) | ((mad > 0.06) & (peak < 0.03) & (hcorr < 0.97))
    cuts = (np.where(cut)[0] + 1).tolist()
    # audio onset strength at each cut: RMS 0..60 ms after vs 150..10 ms before
    mono = audio.mean(1) if len(audio) else np.zeros(1)
    # A3 (War Room): judge cut onsets above 200 Hz, i.e. what a phone speaker can actually play
    if len(mono) > 1:
        sp = np.fft.rfft(mono); fq = np.fft.rfftfreq(len(mono), 1 / 48000); sp[fq < 200] = 0; mono = np.fft.irfft(sp, len(mono))
    def rms_db(a, b):
        a, b = max(0, a), min(len(mono), b)
        return 20 * np.log10(np.sqrt(np.mean(mono[a:b] ** 2)) + 1e-9) if b > a else -180.0
    P(f"hard cuts: {len(cuts)} (confirm each lands on a sound hit; onset = dB rise after vs before, measured above 200 Hz)")
    for f in cuts:
        s = int(f / FPS * 48000)
        after, before = rms_db(s - 480, s + 2880), rms_db(s - 7200, s - 480)
        pk = 20 * np.log10(np.abs(mono[max(0, s - 1440):s + 4800]).max() + 1e-9) if len(mono) > 1 else -180
        flag = '' if after - before >= 6 else '   <- weak/no onset'
        P(f"  cut @ f{f} {tc(f)}  diff {mad[f - 1]:.2f}  onset {after - before:+.1f} dB  (level {after:.1f} dBFS, peak {pk:.1f}){flag}")

    # fast motion without blur, per shot (shots = segments between detected cuts)
    seg = np.zeros(n, int)
    for f in cuts: seg[f:] += 1
    med = {s: np.median(lapvar[seg == s]) for s in np.unique(seg)}
    motion = np.maximum(np.hypot(shifts[:, 0], shifts[:, 1]) * (peak > 0.05), local)
    jumps_list = []
    for i in range(n - 1):
        if cut[i]: continue
        f = i + 1
        sharp = lapvar[f] >= 0.75 * med[seg[f]]
        if motion[i] > 40 and sharp:
            jumps_list.append((f, motion[i], shifts[i], local[i], lapvar[f] / (med[seg[f]] + 1e-12)))
    P(f"jump report: {len(jumps_list)} sharp fast-motion frame pairs (> 40 px/frame, not motion-blurred)")
    # merge consecutive frames into runs
    runs = []
    for j in jumps_list:
        if runs and j[0] == runs[-1][-1][0] + 1: runs[-1].append(j)
        else: runs.append([j])
    for r in runs[:40]:
        mx = max(r, key=lambda j: j[1])
        P(f"  f{r[0][0]}-f{r[-1][0]} {tc(r[0][0])}  max {mx[1]:.0f} px/f (global {mx[2][0]:+.0f},{mx[2][1]:+.0f}; local {mx[3]:.0f}; sharpness x{mx[4]:.2f} of shot median)")
    P(f"motion summary: median {np.median(motion):.1f} px/f, p95 {np.percentile(motion, 95):.1f}, max {motion.max():.1f}" if n > 1 else "")

    # silent seconds
    rngs = [tuple(r) for r in cue.get('silent', [])]
    if cue.get('loop_silence_frames'):
        rngs.append(((n - cue['loop_silence_frames']) / FPS, n / FPS))
    for a, b in rngs:
        i0, i1 = int(a * 48000) + 1024, int(b * 48000) - 1024   # 1 AAC frame (21 ms) inside each edge (codec smear)
        seg_a = audio[i0:i1]
        pk = 20 * np.log10(np.abs(seg_a).max() + 1e-12) if len(seg_a) else float('-inf')
        ok = pk <= -60
        P(f"silence {a:.3f}-{b:.3f}s: peak {pk:.1f} dBFS {'OK' if ok else 'FAIL (> -60)'}")
        if not ok: warns.append(f"silent range {a:.2f}-{b:.2f}s peak {pk:.1f} dBFS")

    # loop check
    if n > 1:
        d = np.abs(g[0].astype(np.int16) - g[-1].astype(np.int16)).mean() / 255
        P(f"loop: first vs last frame mean abs diff {d:.3f} ({'seamless-ish' if d < 0.05 else 'visible jump'})")
    P(f"contact sheets: {', '.join(os.path.basename(s) for s in sheets)}")
    P("")
    for w in warns: P(f"WARN: {w}")
    for f in fails: P(f"FAIL: {f}")
    P(f"RESULT: {'FAIL' if fails else 'PASS'}  ({time.time() - t_start:.1f}s)")
    txt = "\n".join(out)
    print(txt)
    open(base + '.check.txt', 'w').write(txt + "\n")
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
