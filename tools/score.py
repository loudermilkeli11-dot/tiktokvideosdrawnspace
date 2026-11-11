#!/usr/bin/env python3
"""score.py — procedural score layer (pure numpy) -> projects/<slug>/out/score.wav

usage: python3 tools/score.py projects/<slug> [--out file.wav]

Film length comes from shots.txt (30 fps). Output: 48 kHz stereo 16-bit (float32 with --float),
peak-normalised to `master_peak_db` (default -3 dBFS).

score.json schema (all keys optional; times in film seconds):
{
  "master_peak_db": -3.0,
  "reverb": {"decay": 2.8, "send": 0.22, "predelay": 0.02},  # global space (exp-decaying noise IR)
  "ticks": {                     # clock ticks; rate DOUBLES at each step time
    "t0": 0.0, "t1": 40.0,       # range where ticks play
    "rate": 1.0,                 # ticks/s before the first step
    "steps": [6.0, 12.0, 18.0],  # each step doubles the rate (1->2->4->8 /s ...)
    "max_rate": 32,              # cap
    "gain_db": -14, "pitch": 1800, "spread": 0.25   # spread = alternating L/R pan amount
  },
  "risers": [                    # Shepard riser over a range, builds to t1 (put a braaam/hit at t1)
    {"t0": 30.0, "t1": 38.0, "gain_db": -10, "speed": 0.35,   # speed: octaves/s of the endless climb
     "noise": 0.5}               # rising filtered-noise amount (0..1)
  ],
  "braaams": [{"t": 38.0, "gain_db": -2, "decay": 3.2, "root": 55.0}],   # A1/E2/A2 stack by default
  "impacts": [{"t": 12.0, "gain_db": -6}],                                # short low hits
  "cracks": [{"t": 0.0, "gain_db": -4}],     # MID-RANGE hit (200 Hz-3 kHz): audible on phone speakers. Layer on every cut.
  "big_hit": {"t": 52.0, "gain_db": 0, "decay": 6.0},   # THE biggest moment: braaam+sub drop+noise+long tail
  "silent": [[52.0, 53.0]],      # ranges of TRUE digital silence for the whole mix
                                 # (score writes zeros; assemble.sh gates the full mix; check.py verifies)
  "loop_silence_frames": 2       # also silence the last N frames before the loop point (assemble.sh)
}
"""
import json, os, sys, wave
import numpy as np

SR = 48000
FPS = 30
rng = np.random.default_rng(1234)


def db(x):
    return 10 ** (x / 20.0)


def read_shots(proj):
    total = 0
    for line in open(os.path.join(proj, 'shots.txt')):
        line = line.split('#')[0].strip()
        if not line:
            continue
        total += int(line.split()[1])
    return total


def stft_filter(x, gain_fn, n=2048):
    """Time-varying spectral filter. gain_fn(times[frames,1], freqs[1,bins]) -> gain matrix."""
    hop = n // 4
    win = np.hanning(n).astype(np.float64)
    pad = np.concatenate([np.zeros(n), x, np.zeros(n)])
    nfr = (len(pad) - n) // hop + 1
    idx = np.arange(n)[None, :] + hop * np.arange(nfr)[:, None]
    fr = pad[idx] * win
    spec = np.fft.rfft(fr, axis=1)
    t = ((np.arange(nfr) * hop + n / 2 - n) / SR)[:, None]
    f = np.fft.rfftfreq(n, 1 / SR)[None, :]
    spec *= gain_fn(t, f)
    out_fr = np.fft.irfft(spec, n=n, axis=1) * win
    out = np.zeros(len(pad))
    R = n // hop  # frames k, k+R, ... never overlap each other -> plain fancy-index add
    for k in range(R):
        starts = np.arange(k, nfr, R) * hop
        if len(starts):
            out[(starts[:, None] + np.arange(n)[None, :]).ravel()] += out_fr[k::R].ravel()
    norm = (win ** 2).sum() / hop
    return out[n:n + len(x)] / norm


def lp_gain(fc, f, order=4):
    return 1.0 / np.sqrt(1 + (f / np.maximum(fc, 1.0)) ** (2 * order))


def place(buf, sig, t, pan=0.0):
    """mix mono or stereo sig into buf (2,N) at time t (seconds); pan -1..1 for mono."""
    i0 = int(round(t * SR))
    if sig.ndim == 1:
        g = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)
        sig = g[:, None] * sig[None, :]
    a, b = max(0, i0), min(buf.shape[1], i0 + sig.shape[1])
    if b > a:
        buf[:, a:b] += sig[:, a - i0:b - i0]


def saw(freq, n, phase0=0.0):
    ph = (phase0 + np.cumsum(np.broadcast_to(freq, (n,)) / SR)) % 1.0
    return 2 * ph - 1


# ---------------------------------------------------------------- elements
def tick_sound(pitch=1800):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    click = rng.standard_normal(n) * np.exp(-t / 0.0012)
    click = np.diff(click, prepend=0)  # crude highpass
    body = np.sin(2 * np.pi * pitch * t) * np.exp(-t / 0.012) * 0.6
    low = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.02) * 0.35
    s = click * 0.5 + body + low
    return s / np.abs(s).max()


def render_ticks(buf, c):
    t, t1 = c.get('t0', 0.0), c.get('t1', buf.shape[1] / SR)
    rate = c.get('rate', 1.0)
    steps = sorted(c.get('steps', []))
    maxr = c.get('max_rate', 32)
    g = db(c.get('gain_db', -14))
    spread = c.get('spread', 0.25)
    snd = tick_sound(c.get('pitch', 1800))
    k = 0
    while t < t1:
        r = rate * 2 ** sum(1 for s in steps if s <= t + 1e-9)
        r = min(r, maxr)
        # slight level drop as ticks get dense, accent on the beat ("tick-TOCK")
        lvl = g * (1.0 if k % 2 == 0 else 0.8) * (1.0 / (1 + 0.15 * np.log2(max(r, 1))))
        s = snd if k % 2 == 0 else tick_sound(c.get('pitch', 1800) * 0.84)
        place(buf, s * lvl, t, pan=spread if k % 2 == 0 else -spread)
        k += 1
        nt = t + 1.0 / r
        # snap to next step boundary so the new tempo starts exactly on the step
        nxt = [s for s in steps if t < s < nt]
        t = nxt[0] if nxt else nt


def render_riser(buf, c):
    t0, t1 = c['t0'], c['t1']
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    speed = c.get('speed', 0.35)
    nOct, fmin = 8, 30.0
    crescendo = (tt / tt[-1]) ** 1.6 * 0.85 + 0.15
    out = np.zeros((2, n))
    for ch in range(2):
        acc = np.zeros(n)
        for k in range(nOct):
            pos = (k + speed * tt + ch * 0.02) % nOct          # octave position 0..nOct
            f = fmin * 2 ** pos
            amp = np.exp(-0.5 * ((pos - nOct / 2) / (nOct / 6.5)) ** 2)  # bell over log-f
            ph = np.cumsum(2 * np.pi * f / SR)
            acc += amp * (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph))
        out[ch] = acc
    out /= np.abs(out).max() + 1e-9
    # rising filtered noise
    nz = c.get('noise', 0.5)
    if nz > 0:
        for ch in range(2):
            w = rng.standard_normal(n)
            fc0, fc1 = 300.0, 9000.0
            w = stft_filter(w, lambda t, f: np.exp(-0.5 * (np.log2(np.maximum(f, 1) / (fc0 * (fc1 / fc0) ** np.clip(t / (t1 - t0), 0, 1))) / 0.9) ** 2))
            w /= np.abs(w).max() + 1e-9
            out[ch] = out[ch] * (1 - 0.4 * nz) + w * nz * 0.6 * (tt / tt[-1]) ** 2
    out *= crescendo * db(c.get('gain_db', -10))
    fade = np.minimum(1, tt / 0.3)
    out *= fade
    place(buf, out, t0)


def braaam(decay=3.2, root=55.0, big=False):
    dur = decay + 1.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    notes = [root, root * 1.4983, root * 2]  # A1, E2, A2
    out = np.zeros((2, n))
    for ch in range(2):
        s = np.zeros(n)
        for f in notes:
            for d in (-9, -3, 4, 10):
                det = 2 ** ((d + (ch * 2 - 1) * 3) / 1200)
                s += saw(f * det, n, rng.random())
        s /= 12
        # lowpass opens fast then closes
        open_t, peak = (0.25, 2600.0) if not big else (0.35, 3800.0)
        s = stft_filter(s, lambda tt, f: lp_gain(
            np.where(tt < open_t, 180 + (peak - 180) * np.clip(tt / open_t, 0, 1) ** 0.7,
                     180 + (peak - 180) * np.exp(-(tt - open_t) / (decay * 0.35))), f, 3))
        s = np.tanh(s * 2.2) / np.tanh(2.2)
        out[ch] = s
    env = np.minimum(1, t / 0.04) * np.exp(-t / (decay / 2.3))
    sub = np.sin(2 * np.pi * np.cumsum(np.full(n, root) * (1 + 0.15 * np.exp(-t / 0.08))) / SR) * 0.8
    out = out * env + sub * np.minimum(1, t / 0.01) * np.exp(-t / (decay / 2.0))
    return out / np.abs(out).max()


def impact(decay=0.7):
    n = int((decay + 0.3) * SR)
    t = np.arange(n) / SR
    f = 40 + 70 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (decay / 3))
    nz = rng.standard_normal(n) * np.exp(-t / 0.03)
    nz = stft_filter(nz, lambda tt, ff: lp_gain(np.full_like(tt, 1500.0), ff, 2))
    s = body + 0.6 * nz / (np.abs(nz).max() + 1e-9)
    s = np.tanh(1.5 * s)
    return s / np.abs(s).max()


def crack(decay=0.5):
    """Mid-range transient that survives phone speakers: band-passed noise snap + pitched thwack + metallic ring."""
    n = int((decay + 0.4) * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n) * np.exp(-t / 0.045)
    nz = stft_filter(nz, lambda tt, ff: np.exp(-((np.log2(np.maximum(ff, 1.0) / 1100.0)) ** 2) / (2 * 0.9 ** 2)) + 0 * tt)
    f = 170 + 330 * np.exp(-t / 0.03)                       # thwack 500 -> 170 Hz
    th = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)
    ring = sum(a * np.sin(2 * np.pi * fr * t + ph) for a, fr, ph in [(1.0, 910, 0.3), (0.7, 1373, 1.1), (0.45, 2117, 2.0), (0.3, 2890, 0.7)])
    ring *= np.exp(-t / (decay * 0.5)) * 0.35
    s = 0.9 * nz / (np.abs(nz).max() + 1e-9) + 0.8 * th + ring
    s *= np.minimum(1, t / 0.0015)
    s = np.tanh(1.8 * s)
    return s / np.abs(s).max()


def big_hit(decay=6.0, root=55.0):
    b = braaam(decay, root, big=True)
    n = b.shape[1]
    t = np.arange(n) / SR
    f = 25 + 55 * np.exp(-t / 0.5)            # sub drop 80 -> 25 Hz
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (decay / 2.5)) * np.minimum(1, t / 0.005)
    nz = rng.standard_normal((2, n)) * np.exp(-t / 0.25)
    for ch in range(2):
        nz[ch] = stft_filter(nz[ch], lambda tt, ff: lp_gain(5000 * np.exp(-tt / 0.6) + 200, ff, 2))
    nz /= np.abs(nz).max() + 1e-9
    out = b * 0.8 + sub[None] * 0.9 + nz * 0.45
    return out / np.abs(out).max()


def reverb_ir(decay=2.8, predelay=0.02):
    n = int((decay + predelay) * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        w = rng.standard_normal(n) * np.exp(-6.9 * t / decay)  # -60 dB at `decay`
        # darker tail: highs decay faster
        w = stft_filter(w, lambda tt, f: lp_gain(9000 * np.exp(-tt / (decay * 0.4)) + 400, f, 1), n=1024)
        ir[ch] = w
    ir[:, :int(predelay * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def convolve(x, ir):
    n = x.shape[1] + ir.shape[1] - 1
    nf = 1 << (n - 1).bit_length()
    out = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:, :x.shape[1]]
    return out


# ---------------------------------------------------------------- main
def build(proj, cue):
    total = read_shots(proj)
    N = int(round(total / FPS * SR))
    dry = np.zeros((2, N))      # gets global reverb send
    long_send = np.zeros((2, N))  # big hit: long tail
    if 'ticks' in cue:
        render_ticks(dry, cue['ticks'])
    for r in cue.get('risers', []):
        render_riser(dry, r)
    for b in cue.get('braaams', []):
        place(dry, braaam(b.get('decay', 3.2), b.get('root', 55.0)) * db(b.get('gain_db', -2)), b['t'])
    for im in cue.get('impacts', []):
        s = impact(im.get('decay', 0.7)) * db(im.get('gain_db', -6))
        place(dry, s, im['t'])
    for c in cue.get('cracks', []):
        place(dry, crack(c.get('decay', 0.5)) * db(c.get('gain_db', -4)), c['t'], c.get('pan', 0.0))
    bh = cue.get('big_hit')
    if bh:
        s = big_hit(bh.get('decay', 6.0), bh.get('root', 55.0)) * db(bh.get('gain_db', 0)) * 1.4
        place(dry, s, bh['t'])
        place(long_send, s, bh['t'])
    rv = cue.get('reverb', {})
    mix = dry.copy()
    if rv.get('send', 0.22) > 0 and np.abs(dry).max() > 0:
        mix += convolve(dry, reverb_ir(rv.get('decay', 2.8), rv.get('predelay', 0.02))) * rv.get('send', 0.22)
    if np.abs(long_send).max() > 0:
        mix += convolve(long_send, reverb_ir(bh.get('reverb_decay', 7.0), 0.03)) * 0.35
    # silent ranges: exact zeros, with 4 ms fades outside the range to avoid clicks
    fl = int(0.004 * SR)
    for a, b in cue.get('silent', []):
        i0, i1 = int(round(a * SR)), int(round(b * SR))
        if i0 - fl > 0:
            mix[:, i0 - fl:i0] *= np.linspace(1, 0, fl)[None]
        if i1 + fl < N:
            mix[:, i1:i1 + fl] *= np.linspace(0, 1, fl)[None]
        mix[:, max(0, i0):min(N, i1)] = 0.0
    lsf = cue.get('loop_silence_frames', 0)
    if lsf:
        i0 = N - int(round(lsf / FPS * SR))
        mix[:, i0 - fl:i0] *= np.linspace(1, 0, fl)[None]
        mix[:, i0:] = 0.0
    pk = np.abs(mix).max()
    if pk > 0:
        mix *= db(cue.get('master_peak_db', -3.0)) / pk
    return mix


def write_wav(path, x, float32=False):
    x = np.clip(x, -1, 1)
    if float32:
        import struct
        data = x.T.astype('<f4').tobytes()
        with open(path, 'wb') as f:  # WAVE_FORMAT_IEEE_FLOAT
            f.write(b'RIFF' + struct.pack('<I', 36 + len(data)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 3, 2, SR, SR * 8, 8, 32)
                    + b'data' + struct.pack('<I', len(data)) + data)
        return
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x.T * 32767).round().astype('<i2').tobytes())


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); sys.exit(2)
    proj = args[0]
    out = args[args.index('--out') + 1] if '--out' in args else os.path.join(proj, 'out', 'score.wav')
    cue = json.load(open(os.path.join(proj, 'score.json')))
    import time; t = time.time()
    mix = build(proj, cue)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_wav(out, mix, '--float' in args)
    print(f"score: {mix.shape[1] / SR:.3f}s -> {out} ({time.time() - t:.1f}s)")


if __name__ == '__main__':
    main()
