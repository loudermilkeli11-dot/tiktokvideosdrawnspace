#!/usr/bin/env python3
"""check.py — QC for a finished film.

usage: python3 tools/check.py projects/<slug>/out/final.mp4 [--score projects/<slug>/score.json] [--frames N] [--overlay ov.mov]
       python3 tools/check.py --contrast OVERLAY --bg BACKGROUND [--every 0.5]     (text contrast only, before assembly)
         OVERLAY = an overlay.mov or a dir of render_ov.js PNGs (ov_NNNNN.png); BACKGROUND = a video (frame-matched) or a still.
         The overlay is composited over the background and sent through a yuv420p round-trip first.

Writes next to the video: <name>.check.txt (report) and <name>.contact_NN.jpg (1 fps contact sheets).
Expected frame count: --frames, else sum of ../shots.txt if the video sits in projects/<slug>/out/.
score.json defaults to ../score.json likewise (silent ranges + loop_silence_frames).
Text contrast (amendment A4): with ../out/overlay.mov (or --overlay), every 0.5 s the overlay's text pixels are measured
against the composited pixels around them in the final (yuv420p) video; WARN below 3:1.
Exit code 1 on hard failures: frame count, size >= 100 MB, loudness off -14 LUFS by > 1 LU, white flashes
(a frame above 0.85 mean luma, or a jump UP by > 0.35; a cut from bright to dark is not a flash).
Duration: 30-38 s is the default (PLAYBOOK); 61-70 s is the flagged long test; anything else WARNs.
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


# ---------------------------------------------------------------- text contrast (A4)
_V = np.arange(256) / 255.0
_LIN = np.where(_V <= 0.04045, _V / 12.92, ((_V + 0.055) / 1.055) ** 2.4)
CT_MIN = 3.0      # luminance contrast floor (WCAG ratio)
CT_TILE = 48      # analysis tile, px of 1080x1920 (= 24 design px)


def rel_lum(rgb):
    """sRGB uint8 (..., 3) -> WCAG relative luminance."""
    return _LIN[rgb[..., 0]] * 0.2126 + _LIN[rgb[..., 1]] * 0.7152 + _LIN[rgb[..., 2]] * 0.0722


def box_any(m, r):
    """dilate a bool mask by a (2r+1)^2 square (integral image, O(N))."""
    c = np.pad(m.astype(np.int32), ((r + 1, r), (r + 1, r))).cumsum(0).cumsum(1)
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) > 0


def run_len(m, axis):
    """length of the straight run of True pixels each pixel belongs to, along axis (0 = vertical)."""
    m = np.moveaxis(m, axis, 0); up = np.zeros(m.shape, np.int32); dn = np.zeros(m.shape, np.int32)
    for i in range(1, m.shape[0]): up[i] = (up[i - 1] + 1) * m[i]
    up[0] = m[0]
    for i in range(m.shape[0] - 2, -1, -1): dn[i] = (dn[i + 1] + 1) * m[i]
    dn[-1] = m[-1]; up[1:] = np.where(m[1:], up[1:], 0)
    return np.moveaxis(np.where(m, up + dn - 1, 0), 0, axis)


def contrast_frame(ov, img):
    """ov: overlay RGBA uint8 (straight alpha); img: the composited frame (RGB uint8) after yuv420p.
    Text = opaque, bright overlay pixels (glyph cores; bands and shadows are dark and translucent, so they are not text).
    Surround = composited pixels in a ring 3-12 px around the glyphs (bands and shadows included: what the eye sees).
    Per 48 px tile and per class (white / accent-coloured): median text luminance vs the 90th and 10th percentile of the
    surround within +-24 px; the worse ratio counts. -> [(ratio, x, y, cls)] in 1080x1920 px."""
    a = ov[..., 3]
    yl = rel_lum(ov[..., :3])
    core = (a >= 215) & (yl >= 0.4)        # full-coverage glyph pixels (0.9-opacity tags count; AA edges, dark halos and bands do not)
    if core.sum() < 20:
        return []
    anyt = (a >= 90) & (yl >= 0.2)
    ys, xs = np.nonzero(anyt)
    y0, y1 = max(0, ys.min() - 40), min(ov.shape[0], ys.max() + 41)
    x0, x1 = max(0, xs.min() - 40), min(ov.shape[1], xs.max() + 41)
    core, anyt = core[y0:y1, x0:x1], anyt[y0:y1, x0:x1]
    # rules and bars are not text: drop straight runs taller than any glyph (> 110 px) or long thin horizontal rules
    rule = (run_len(anyt, 0) > 110) | ((run_len(anyt, 1) > 60) & (run_len(anyt, 0) <= 7))
    rule = box_any(rule, 2) & anyt
    core, anyt = core & ~rule, anyt & ~rule
    if core.sum() < 20:
        return []
    ring = box_any(anyt, 12) & ~box_any(anyt | rule, 3)
    L = rel_lum(img[y0:y1, x0:x1])
    rgb = ov[y0:y1, x0:x1, :3].astype(np.int16)
    accent = (rgb.max(-1) - rgb.min(-1)) > 40
    out, (H, W), T = [], core.shape, CT_TILE
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            c = core[ty:ty + T, tx:tx + T]
            if c.sum() < 12:
                continue
            by0, by1, bx0, bx1 = max(0, ty - T // 2), min(H, ty + T + T // 2), max(0, tx - T // 2), min(W, tx + T + T // 2)
            rb = L[by0:by1, bx0:bx1][ring[by0:by1, bx0:bx1]]
            if rb.size < 30:
                continue
            hi, lo = np.percentile(rb, 90), np.percentile(rb, 10)
            acc = accent[ty:ty + T, tx:tx + T]
            for cls, m in (('white', c & ~acc), ('accent', c & acc)):
                if m.sum() < 12:
                    continue
                tl = float(np.median(L[ty:ty + T, tx:tx + T][m]))
                cr = min((max(tl, b) + 0.05) / (min(tl, b) + 0.05) for b in (hi, lo))
                out.append((cr, x0 + tx + T // 2, y0 + ty + T // 2, cls))
    return out


# ---------------------------------------------------------------- TikTok safe area (design px x2; see PLAYBOOK Layout)
# a 19.5:9 phone crops a 9:16 video by ~96 px each side (of 1080); the top bar, the right button rail and the bottom
# caption block cover the picture. Overlay text (bright, >= 90 alpha) must stay inside.
SAFE = dict(x0=120, x1=960, y0=200, y1=1530, rail_x=880, rail_y=(860, 1740))


def safe_frame(ov):
    a, yl = ov[..., 3], rel_lum(ov[..., :3])
    m = (a >= 90) & (yl >= 0.2)
    if m.sum() < 20:
        return []
    ys, xs = np.nonzero(m); out = []
    for name, bad in (('left edge (crop)', xs < SAFE['x0']), ('right edge (crop)', xs > SAFE['x1']), ('top bar', ys < SAFE['y0']),
                      ('bottom caption', ys > SAFE['y1']),
                      ('right rail', (xs > SAFE['rail_x']) & (ys > SAFE['rail_y'][0]) & (ys < SAFE['rail_y'][1]))):
        if bad.sum() >= 20:
            out.append(f"{name} ({int(bad.sum())} px, e.g. design ({xs[bad][0] // 2},{ys[bad][0] // 2}))")
    return out


def probe_wh(path):
    w, h = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0',
                path]).stdout.decode().strip().split(',')[:2]
    return int(w), int(h)


def read_frames(path, step, pix, ch):
    """every `step`-th frame (n = 0, step, 2*step, ...) of a video as uint8 arrays (streamed)."""
    w, h = probe_wh(path)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-an', '-vf', f"select='not(mod(n\\,{step}))'", '-fps_mode', 'passthrough',
                          '-f', 'rawvideo', '-pix_fmt', pix, '-'], stdout=subprocess.PIPE)
    n = w * h * ch
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w, ch)
    p.stdout.close(); p.wait()


def contrast_report(rows, P, warns, step):
    """rows: [(frame, tiles)]; appends the report lines (P) and a WARN when any sampled frame is below CT_MIN."""
    rows = [(f, t) for f, t in rows if t]
    if not rows:
        P("text contrast (A4): no overlay text in the sampled frames"); return
    def fmt(r): return f"{r[0]:.2f}:1 {r[3]} text at design ({r[1] / 2:.0f},{r[2] / 2:.0f})"
    worst = {cls: min(((min(x for x in t if x[3] == cls), f) for f, t in rows if any(x[3] == cls for x in t)), default=None)
             for cls in ('white', 'accent')}
    bad = [(f, min(t)) for f, t in rows if min(t)[0] < CT_MIN]
    P(f"text contrast (A4, after yuv420p; every {step / FPS:.2f} s, {len(rows)} sampled frames with text):"
      + "".join(f"  worst {cls} {fmt(w[0])} @ f{w[1]} {tc(w[1])};" for cls, w in worst.items() if w)
      + f"  {len(bad)} frames below {CT_MIN:.0f}:1" + (" — OK" if not bad else ""))
    for f, r in bad[:40]:
        P(f"  f{f} {tc(f)}  {fmt(r)}   <- below {CT_MIN:.0f}:1")
    if bad:
        warns.append(f"text contrast below {CT_MIN:.0f}:1 in {len(bad)} sampled frames (worst {min(r for _, r in bad)[0]:.2f}:1)")


def contrast_only(args):
    """--contrast OVERLAY --bg BACKGROUND [--every S]: composite, yuv420p round-trip, measure. Exit 0 (warnings only)."""
    opt = lambda k: args[args.index(k) + 1] if k in args else None
    ovp, bgp, step = opt('--contrast'), opt('--bg'), max(1, round(float(opt('--every') or 0.5) * FPS))
    if not bgp:
        print("usage: check.py --contrast OVERLAY(.mov | png dir) --bg BACKGROUND(video | image) [--every 0.5]"); sys.exit(2)
    t0 = time.time()
    if os.path.isdir(ovp):        # render_ov.js --png output: ov_NNNNN.png
        files = {int(re.sub(r'\D', '', f) or -1): os.path.join(ovp, f) for f in os.listdir(ovp) if re.fullmatch(r'ov_\d+\.png', f)}
        keep = sorted(n for n in files if n % step == 0) or sorted(files)
        ovs = [(n, np.asarray(Image.open(files[n]).convert('RGBA'))) for n in keep]
    else:
        ovs = list(enumerate(read_frames(ovp, step, 'rgba', 4)))
        ovs = [(k * step, o) for k, o in ovs]
    H, W = ovs[0][1].shape[:2]
    if os.path.splitext(bgp)[1].lower() in ('.png', '.jpg', '.jpeg', '.webp'):
        still = np.asarray(Image.open(bgp).convert('RGB').resize((W, H), Image.LANCZOS))
        bgs = {n: still for n, _ in ovs}
    else:
        want = {n for n, _ in ovs}
        # only the sampled frames (the whole film at full size would not fit in memory)
        p = subprocess.run(['ffmpeg', '-v', 'error', '-i', bgp, '-an', '-vf', f"select='not(mod(n\\,{step}))',scale={W}:{H},format=rgb24",
                            '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
        allf = np.frombuffer(p, np.uint8).reshape(-1, H, W, 3)
        bgs = {n: allf[min(n // step, len(allf) - 1)] for n in want}
    comp = []
    for n, o in ovs:
        a = o[..., 3:4].astype(np.float32) / 255
        comp.append((o[..., :3] * a + bgs[n] * (1 - a)).round().astype(np.uint8))
    rt = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-i', '-',
                         '-vf', 'format=yuv420p,format=rgb24', '-f', 'rawvideo', '-'],
                        input=np.stack(comp).tobytes(), capture_output=True, check=True).stdout
    rt = np.frombuffer(rt, np.uint8).reshape(-1, H, W, 3)
    out, warns = [], []
    contrast_report([(n, contrast_frame(o, rt[k])) for k, (n, o) in enumerate(ovs)], out.append, warns, step)
    for w in warns:
        out.append(f"WARN: {w}")
    out.append(f"({len(ovs)} frames, {time.time() - t0:.1f}s)")
    print("\n".join(out))


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    if '--contrast' in args:
        return contrast_only(args)
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
    if not (30 <= dur <= 38.05 or 61 <= dur <= 70): warns.append(f"duration {dur:.2f}s outside 30-38s (or the 61-70s test length)")
    P(f"loudness: I={I:.1f} LUFS  TP={TP:.1f} dBTP (target -14 / <= -1)")
    if not (abs(I + 14) <= 1): fails.append(f"integrated loudness {I:.1f} LUFS (off by > 1 LU)")
    if TP > -1.0: warns.append(f"true peak {TP:.1f} dBTP > -1")

    # white flashes
    flash = sorted(set(np.where(luma > 0.85)[0].tolist()) | set((np.where(np.diff(luma) > 0.35)[0] + 1).tolist()))   # up only
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

    # text contrast (A4): overlay text vs the composited pixels around it, in the final (yuv420p) frames, every 0.5 s
    ovp = opt('--overlay') or os.path.join(projdir, 'out', 'overlay.mov')
    if os.path.exists(ovp) and probe_wh(ovp) == probe_wh(video):
        step = round(0.5 * FPS)
        rows = [(k * step, contrast_frame(o, im)) for k, (im, o) in
                enumerate(zip(read_frames(video, step, 'rgb24', 3), read_frames(ovp, step, 'rgba', 4)))]
        contrast_report(rows, P, warns, step)
        bad = [(k * step, v) for k, o in enumerate(read_frames(ovp, step, 'rgba', 4)) for v in [safe_frame(o)] if v]
        P(f"safe area (TikTok crop + UI): {len(bad)} sampled frames with text outside" + (" — OK" if not bad else ""))
        for f, v in bad[:20]:
            P(f"  f{f} {tc(f)}  " + "; ".join(v))
        if bad: warns.append(f"overlay text outside the TikTok safe area in {len(bad)} sampled frames")
    else:
        P(f"text contrast (A4): skipped ({'no ' + ovp if not os.path.exists(ovp) else 'overlay size differs from the video'})")

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
