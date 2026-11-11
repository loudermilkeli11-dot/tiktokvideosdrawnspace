// Invisible Journeys audio core (plain script, NOT a module). build_page.py prepends it to a shot's <shot>_sound.js and
// writes <shot>_sound.html; tools/audio.js calls renderSound(dur) there (OfflineAudioContext, deterministic).
// A shot's sound file defines:  function SOUND(ctx, out, dur) { ... }   (t = 0 is the shot's first frame)
// Rule (War Room A3): every hard cut gets a MID-RANGE transient (hit()), sub only as a sweetener.

// ---- helpers (must exist: panned sounds went silent without them once) ----
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
const db = (x) => Math.pow(10, x / 20);
const SR = 48000;

// ---- sources ----
const _noise = {};
function noiseBuf(ctx, color = 'white', sec = 4, seed = 1) {
  const key = color + sec + ':' + seed; if (_noise[key]) return _noise[key];
  const n = Math.round(sec * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let s = (seed * 9301 + c * 49297) % 233280, b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      s = (s * 9301 + 49297) % 233280; const w = s / 233280 * 2 - 1;
      if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w * 0.5;
    }
  }
  return (_noise[key] = b);
}
function src(ctx, buf, t0, t1, rate = 1) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.loopStart = 0; s.start(Math.max(0, t0), (hash(t0 * 7.7) * 3) % buf.duration); s.stop(t1); return s; }
function filt(ctx, type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function panner(ctx, p = 0) { const s = ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; }
function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
// gain envelope from keys [[t, dB], ...] (linear ramps; -120 dB = off)
function env(ctx, keys) { const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); for (const [t, d] of keys) g.gain.linearRampToValueAtTime(d <= -119 ? 0 : db(d), Math.max(0, t)); return g; }

// ---- reverb (convolver with an exponentially decaying noise IR) ----
let _verb = null;
function verb(ctx, out, decay = 2.6, wet = 0.25) {
  if (_verb) return _verb;
  const n = Math.round(decay * ctx.sampleRate), ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (hash(i * 1.37 + c * 91.1) * 2 - 1) * Math.pow(1 - i / n, 3) * Math.exp(-3 * i / n); }
  const cv = ctx.createConvolver(); cv.buffer = ir; const g = ctx.createGain(); g.gain.value = wet; cv.connect(g).connect(out);
  return (_verb = cv);
}

// ---- building blocks (all take (ctx, out, opts); times in seconds) ----
// Surf / tide: pink noise through a lowpass that breathes with each wave set; swell 0..1 raises size + level
function surf(ctx, out, o = {}) {
  const { t0 = 0, t1 = 10, gain = -14, period = 5.5, swell = 0, pan = 0 } = o;
  for (const [ch, dp] of [[0, -0.5], [1, 0.5]]) {
    const s = src(ctx, noiseBuf(ctx, 'pink', 6, 3 + ch), t0, t1); const lp = filt(ctx, 'lowpass', 600, 0.4); const g = ctx.createGain(); g.gain.value = 0;
    for (let t = t0; t < t1; t += 0.1) {
      const ph = ((t + ch * period * 0.37) % period) / period; const crash = Math.pow(sstep(0.0, 0.18, ph) * (1 - sstep(0.25, 1.0, ph)), 0.7);
      const sw = typeof swell === 'function' ? swell(t) : swell;
      lp.frequency.linearRampToValueAtTime(350 + 2600 * crash * (0.6 + 0.6 * sw), t);
      g.gain.linearRampToValueAtTime(db(gain + 6 * sw) * (0.35 + 0.65 * crash) * sstep(t0, t0 + 0.05, t), t);
    }
    chain(s, lp, g, panner(ctx, pan + dp), out);
  }
}
// Wind: band-passed noise with slow gusts
function wind(ctx, out, o = {}) {
  const { t0 = 0, t1 = 10, gain = -24, f = 700 } = o;
  const s = src(ctx, noiseBuf(ctx, 'pink', 5, 7), t0, t1); const bp = filt(ctx, 'bandpass', f, 0.6); const g = ctx.createGain(); g.gain.value = 0;
  for (let t = t0; t < t1; t += 0.2) { const gu = 0.5 + 0.5 * Math.sin(t * 0.7 + Math.sin(t * 0.23) * 3); bp.frequency.linearRampToValueAtTime(f * (0.7 + 0.6 * gu), t); g.gain.linearRampToValueAtTime(db(gain) * (0.5 + 0.5 * gu), t); }
  chain(s, bp, g, panner(ctx, 0.2), out);
}
// Low rumble: brown noise + sub sine, level follows `level(t)` 0..1
function rumble(ctx, out, o = {}) {
  const { t0 = 0, t1 = 10, gain = -16, level = () => 1, sub = 34 } = o;
  const s = src(ctx, noiseBuf(ctx, 'brown', 6, 11), t0, t1); const lp = filt(ctx, 'lowpass', 140, 0.5); const g = ctx.createGain(); g.gain.value = 0;
  const os = ctx.createOscillator(); os.frequency.value = sub; const og = ctx.createGain(); og.gain.value = 0; os.start(t0); os.stop(t1);
  for (let t = t0; t <= t1; t += 0.1) { const l = level(t); g.gain.linearRampToValueAtTime(db(gain) * l, t); og.gain.linearRampToValueAtTime(db(gain - 8) * l, t); }
  chain(s, lp, g, out); chain(os, og, out);
}
// Crowd: murmur of many voices (formant-filtered noise with syllable rhythm); excite(t) 0..1 raises level, pitch and pace
function crowd(ctx, out, o = {}) {
  const { t0 = 0, t1 = 10, gain = -20, voices = 10, excite = () => 0.3, pan = 0, seed = 1 } = o;
  const F = [[520, 1190], [730, 1090], [300, 2300], [440, 1020], [600, 1700]];
  for (let v = 0; v < voices; v++) {
    const s = src(ctx, noiseBuf(ctx, 'white', 3, 20 + v + seed * 31), t0, t1);
    const f = F[v % F.length], a = filt(ctx, 'bandpass', f[0], 5), b = filt(ctx, 'bandpass', f[1], 6), g = ctx.createGain(); g.gain.value = 0;
    const mix = ctx.createGain(); mix.gain.value = 1; s.connect(a); s.connect(b); a.connect(mix); b.connect(mix);
    let t = t0 + hash(v + seed) * 0.4;
    while (t < t1) { const ex = excite(t), syl = 0.09 + 0.12 * hash(t * 13 + v) * (1.2 - ex * 0.6), on = hash(t * 7.3 + v * 3) < 0.7 + 0.25 * ex;
      const lv = on ? db(gain) * (0.45 + 0.9 * ex) * (0.5 + 0.5 * hash(t * 3 + v)) : 0;
      g.gain.setTargetAtTime(lv, t, 0.02); const fm = 1 + 0.25 * ex + 0.15 * (hash(t + v * 5) - 0.5);
      a.frequency.setTargetAtTime(f[0] * fm, t, 0.03); b.frequency.setTargetAtTime(f[1] * fm, t, 0.03); t += syl; }
    chain(mix, g, panner(ctx, pan + (hash(v * 9.1 + seed) - 0.5) * 1.4), out);
  }
}
// Gasp / "whoa" swell from the crowd at time t (vowel-formant noise with rising then falling pitch)
function gasp(ctx, out, o = {}) {
  const { t = 0, gain = -12, dur = 1.4, voices = 6 } = o;
  for (let v = 0; v < voices; v++) {
    const t0 = t + hash(v * 3.1 + t) * 0.15, s = src(ctx, noiseBuf(ctx, 'white', 2, 60 + v), t0, t0 + dur + 0.2);
    const f1 = filt(ctx, 'bandpass', 650 + 120 * hash(v), 7), f2 = filt(ctx, 'bandpass', 1100 + 200 * hash(v + 1), 8);
    const g = env(ctx, [[t0, -120], [t0 + 0.12, gain], [t0 + dur * 0.5, gain - 4], [t0 + dur, -120]]);
    f1.frequency.setValueAtTime(500, t0); f1.frequency.linearRampToValueAtTime(800, t0 + 0.3); f1.frequency.linearRampToValueAtTime(600, t0 + dur);
    const m = ctx.createGain(); s.connect(f1); s.connect(f2); f1.connect(m); f2.connect(m); chain(m, g, panner(ctx, (hash(v * 7.7) - 0.5) * 1.6), out);
  }
}
// Mid-range hit for cuts (phones play it): noise snap + thwack + ring, optional sub
function hit(ctx, out, o = {}) {
  const { t = 0, gain = -6, sub = true, pan = 0 } = o;
  const s = src(ctx, noiseBuf(ctx, 'white', 1, 90), t, t + 0.4); const bp = filt(ctx, 'bandpass', 1300, 0.8);
  chain(s, bp, env(ctx, [[t, -120], [t + 0.002, gain + 2], [t + 0.09, gain - 24], [t + 0.35, -120]]), panner(ctx, pan), out);
  const th = ctx.createOscillator(); th.frequency.setValueAtTime(520, t); th.frequency.exponentialRampToValueAtTime(170, t + 0.08); th.start(t); th.stop(t + 0.5);
  chain(th, env(ctx, [[t, -120], [t + 0.003, gain], [t + 0.25, gain - 30], [t + 0.45, -120]]), out);
  for (const [f, a] of [[910, 0], [1373, -4], [2117, -8]]) { const r = ctx.createOscillator(); r.frequency.value = f; r.start(t); r.stop(t + 0.9); chain(r, env(ctx, [[t, -120], [t + 0.002, gain - 14 + a], [t + 0.8, -120]]), out); }
  if (sub) { const sb = ctx.createOscillator(); sb.frequency.setValueAtTime(90, t); sb.frequency.exponentialRampToValueAtTime(32, t + 0.6); sb.start(t); sb.stop(t + 1.2);
    chain(sb, env(ctx, [[t, -120], [t + 0.01, gain - 2], [t + 1.1, -120]]), out); }
}
// Whoosh (whip-pans, objects passing): band-passed noise sweeping up then down
function whoosh(ctx, out, o = {}) {
  const { t = 0, dur = 0.6, gain = -14, f0 = 300, f1 = 3000, pan0 = -0.6, pan1 = 0.6 } = o;
  const s = src(ctx, noiseBuf(ctx, 'pink', 2, 77), t, t + dur + 0.1); const bp = filt(ctx, 'bandpass', f0, 1.2); const p = panner(ctx, pan0);
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + dur);
  p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
  chain(s, bp, env(ctx, [[t, -120], [t + dur * 0.55, gain], [t + dur, -120]]), p, out);
}
// Distant siren (city reacting), very far: slow wail, band-limited, mostly reverb
function siren(ctx, out, o = {}) {
  const { t0 = 0, t1 = 10, gain = -30, pan = -0.4 } = o;
  const os = ctx.createOscillator(); os.type = 'triangle'; os.start(t0); os.stop(t1);
  for (let t = t0; t < t1; t += 0.05) os.frequency.linearRampToValueAtTime(700 + 260 * Math.sin((t - t0) * 1.6), t);
  const g = env(ctx, [[t0, -120], [t0 + 1.5, gain], [t1 - 0.3, gain], [t1, -120]]);
  chain(os, filt(ctx, 'bandpass', 900, 1.5), g, panner(ctx, pan), out);
}
// Wing flutter of a passing flock
function flutter(ctx, out, o = {}) {
  const { t = 0, dur = 2, gain = -26, pan0 = -0.7, pan1 = 0.7 } = o;
  const s = src(ctx, noiseBuf(ctx, 'white', 1, 55), t, t + dur); const hp = filt(ctx, 'highpass', 2500, 0.7); const am = ctx.createGain(); am.gain.value = 0;
  for (let k = 0; t + k * 0.055 < t + dur; k++) { const tt = t + k * 0.055 + hash(k) * 0.02; am.gain.setValueAtTime(db(gain) * (0.4 + 0.6 * hash(k * 3)), tt); am.gain.setTargetAtTime(0, tt + 0.008, 0.012); }
  const p = panner(ctx, pan0); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
  chain(s, hp, am, env(ctx, [[t, -120], [t + dur * 0.4, 0], [t + dur, -120]]), p, out);
}
// Phone camera shutters scattered in the crowd
function shutters(ctx, out, o = {}) {
  const { t0 = 0, t1 = 3, n = 6, gain = -26 } = o;
  for (let k = 0; k < n; k++) { const t = t0 + hash(k * 4.4 + t0) * (t1 - t0); const s = src(ctx, noiseBuf(ctx, 'white', 1, 120 + k), t, t + 0.08);
    chain(s, filt(ctx, 'bandpass', 3500, 2), env(ctx, [[t, -120], [t + 0.002, gain], [t + 0.02, gain - 18], [t + 0.03, gain - 4], [t + 0.07, -120]]), panner(ctx, (hash(k) - 0.5) * 1.6), out); }
}

// ---- entry point used by tools/audio.js ----
async function renderSound(dur, sr = SR) {
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const master = ctx.createGain(); master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  SOUND(ctx, master, dur);
  const buf = await ctx.startRendering();
  const enc = (a) => { const u = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  return { sr, ch: [enc(buf.getChannelData(0)), enc(buf.getChannelData(1))] };
}
