// s01_crossing sound (dur = 4.0 + 0.6). Plain script: audio_core.js is prepended (no imports). t = 0 is frame 1.
// 0.0 the brake squeal (the frame-1 sound hit) CUT DEAD at 0.25 s: the tyres lose their bite, then NO tyre noise at all,
// just a glassy frictionless hiss; city room tone; the crowd's surprise rising; soft low body thumps as people sit down
// (fall times from groupA_crossing.js: near walkers slip at tau 0.30 / 0.85 / 1.20, the fall takes 0.45 s -> thumps at
// 0.75 / 1.30 / 1.65; far ones later); a low drone rising; 3.65-4.35 a low whoosh on the whip-pan LEFT (WHIP in s01).
// No ticks, no dings: every hit is brown noise below ~300 Hz.
function thump(ctx, out, t, gain, pan) {
  const s = src(ctx, noiseBuf(ctx, 'brown', 1, 300 + Math.round(t * 100)), t, t + 0.4);
  chain(s, filt(ctx, 'lowpass', 260, 0.8), env(ctx, [[t, -120], [t + 0.008, gain], [t + 0.07, gain - 8], [t + 0.32, -120]]), panner(ctx, pan), out);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); o.start(t); o.stop(t + 0.3);
  chain(o, env(ctx, [[t, -120], [t + 0.006, gain - 4], [t + 0.25, -120]]), panner(ctx, pan), out);
}
function squeal(ctx, out, t0, t1, gain, rise) {
  // locked tyres on dry asphalt: a narrow band of noise around 1.9 kHz with a wobbling partial (real event, <= 0.25 s here)
  const n = src(ctx, noiseBuf(ctx, 'white', 2, 41), t0, t1 + 0.05);
  const bp = filt(ctx, 'bandpass', 1900, 7), bp2 = filt(ctx, 'bandpass', 2600, 9), m = ctx.createGain(); n.connect(bp); n.connect(bp2); bp.connect(m); bp2.connect(m);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.start(t0); o.stop(t1 + 0.05);
  for (let t = t0; t < t1 + 0.05; t += 0.01) o.frequency.linearRampToValueAtTime(1750 + 90 * Math.sin(t * 61) + 40 * Math.sin(t * 23), t);
  const og = ctx.createGain(); og.gain.value = 0.12; chain(o, filt(ctx, 'bandpass', 1800, 4), og, m);
  chain(m, env(ctx, [[t0, rise ? -60 : gain], [t0 + (rise ? t1 - t0 : 0.01), gain], [t1, gain], [t1 + 0.012, -120]]), panner(ctx, 0.35), out);
}
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.2, 0.22);
  // frame 1: the squeal at full, killed at 0.25 s (the grip is gone), with a low body to it
  squeal(ctx, out, 0, 0.25, -11, false);
  squeal(ctx, rv, 0, 0.25, -20, false);
  rumble(ctx, out, { t0: 0, t1: 0.3, gain: -20, sub: 40, level: (t) => 1 - sstep(0.2, 0.28, t) });
  // the frictionless glide: a soft glassy hiss (pink, high-cut 3 kHz), swelling a little
  const h = src(ctx, noiseBuf(ctx, 'pink', 4, 5), 0.2, dur);
  chain(h, filt(ctx, 'lowpass', 3000, 0.5), filt(ctx, 'highpass', 500, 0.5), env(ctx, [[0.24, -120], [0.32, -34], [2.5, -31], [dur, -33]]), panner(ctx, 0.15), out);
  // city room tone + the crowd: calm, then surprise
  wind(ctx, out, { t0: 0, t1: dur, gain: -34, f: 500 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -27, voices: 10, excite: (t) => 0.25 + 0.55 * sstep(0.5, 1.8, t), pan: 0.1, seed: 3 });
  gasp(ctx, rv, { t: 0.55, gain: -24, dur: 1.4, voices: 5 });
  // people sitting down hard (near ones louder; far ones soft)
  [[0.75, -16, -0.1], [1.30, -18, 0.05], [1.65, -19, -0.2], [2.05, -26, 0.5], [2.6, -27, 0.45], [3.1, -28, -0.4]].forEach(([t, g, p]) => thump(ctx, out, t, g, p));
  // a low drone: the world has started to slide
  rumble(ctx, out, { t0: 0.25, t1: dur, gain: -24, sub: 33, level: (t) => sstep(0.3, 3.6, t) });
  // the whip-pan into s02 (one move across the cut: 3.65 -> 4.35)
  whoosh(ctx, out, { t: 3.62, dur: 0.75, gain: -15, f0: 120, f1: 900, pan0: 0.6, pan1: -0.6 });
}
