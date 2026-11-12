// s02_grip sound (dur = 4.5 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 4.0 (tau 4).
// 0.0-0.35 the tail of the whip whoosh; the glassy slide hiss + a low drone as everything glides downhill (no tyre noise).
// T_GRIP = 1.0 (tau 5 = film 5.0, story.js T_GRIP1): the grip BITES: a low tyre-bite crunch + metal crumple + sub (the score
// adds the big hit), then skid squeals that die out as the cars stop (stopTime(slopeV(5), SKID_HILL) = 1.68 s -> 2.68),
// roll impacts (groupA_hill.js: rolls start at +0.08 s; 90 deg of a roll = its duration x 0.5 / 1.0), the bus slamming onto
// its side (1.0 + 0.08 + 1.15 = 2.23), then car alarms (low, band-limited, far) and a settling quiet.
// Everything heavy stays low (brown noise < ~900 Hz); no ticks, no dings.
const T_GRIP = 1.0, T_STOP = 1.0 + 1.68, T_BUS = 2.23;
function thud(ctx, out, t, gain, pan, lp = 320, len = 0.45) {
  const s = src(ctx, noiseBuf(ctx, 'brown', 1, 700 + Math.round(t * 100)), t, t + len + 0.1);
  chain(s, filt(ctx, 'lowpass', lp, 0.8), env(ctx, [[t, -120], [t + 0.008, gain], [t + 0.1, gain - 7], [t + len, -120]]), panner(ctx, pan), out);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.3); o.start(t); o.stop(t + len);
  chain(o, env(ctx, [[t, -120], [t + 0.01, gain - 3], [t + len, -120]]), panner(ctx, pan), out);
}
function crumple(ctx, out, t, dur, gain, pan) {
  // sheet metal folding: band-passed noise (350-800 Hz) chopped into irregular bursts
  const s = src(ctx, noiseBuf(ctx, 'pink', 2, 900 + Math.round(t * 10)), t, t + dur + 0.1);
  const bp = filt(ctx, 'bandpass', 520, 1.6), g = ctx.createGain(); g.gain.value = 0;
  for (let k = 0, tt = t; tt < t + dur; k++) { const a = db(gain) * (0.35 + 0.65 * hash(k * 3.3 + t)) * (1 - (tt - t) / dur); g.gain.setValueAtTime(a, tt); g.gain.setTargetAtTime(0, tt + 0.012, 0.03); bp.frequency.setValueAtTime(380 + 420 * hash(k + t), tt); tt += 0.025 + 0.05 * hash(k * 7.1 + t); }
  chain(s, bp, g, panner(ctx, pan), out);
}
function skid(ctx, out, t0, t1, gain, pan, f) {
  const n = src(ctx, noiseBuf(ctx, 'white', 2, 50 + Math.round(f)), t0, t1 + 0.05);
  chain(n, filt(ctx, 'bandpass', f, 8), env(ctx, [[t0, -120], [t0 + 0.06, gain], [t1 - 0.4, gain - 3], [t1, -120]]), panner(ctx, pan), out);
}
function alarm(ctx, out, t0, t1, gain, pan, f0, rate) {
  // a car alarm far up the street: low two-tone warble, band-limited (no piercing tone)
  const o = ctx.createOscillator(); o.type = 'triangle'; o.start(t0); o.stop(t1);
  for (let t = t0; t < t1; t += 1 / rate) { o.frequency.setValueAtTime(f0, t); o.frequency.setValueAtTime(f0 * 1.26, t + 0.5 / rate); }
  chain(o, filt(ctx, 'lowpass', 900, 0.7), env(ctx, [[t0, -120], [t0 + 0.3, gain], [t1 - 0.2, gain], [t1, -120]]), panner(ctx, pan), out);
}
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 2.4, 0.26);
  whoosh(ctx, out, { t: 0, dur: 0.4, gain: -18, f0: 300, f1: 140, pan0: 0.3, pan1: -0.5 });
  // gliding: hiss + drone (heavier as the mass picks up speed)
  const h = src(ctx, noiseBuf(ctx, 'pink', 4, 6), 0, T_GRIP + 0.1);
  chain(h, filt(ctx, 'lowpass', 2600, 0.5), filt(ctx, 'highpass', 400, 0.5), env(ctx, [[0, -32], [0.9, -29], [T_GRIP + 0.02, -29], [T_GRIP + 0.05, -120]]), out);
  rumble(ctx, out, { t0: 0, t1: T_GRIP + 0.2, gain: -20, sub: 31, level: (t) => 0.7 + 0.3 * sstep(0, 1, t) });
  // THE GRIP BITES (1.0): crunch + crumple + sub, low
  thud(ctx, out, T_GRIP, -7, 0, 700, 0.7);
  thud(ctx, rv, T_GRIP + 0.01, -14, 0, 500, 0.9);
  crumple(ctx, out, T_GRIP, 0.7, -12, -0.2); crumple(ctx, out, T_GRIP + 0.05, 0.6, -14, 0.3);
  rumble(ctx, out, { t0: T_GRIP, t1: T_GRIP + 1.6, gain: -12, sub: 34, level: (t) => Math.exp(-(t - T_GRIP) * 2.5) });
  // skids (real events, die out as the cars stop)
  [[-0.4, 1650], [0.3, 1400], [0.6, 1900], [-0.1, 1250]].forEach(([p, f], k) => skid(ctx, out, T_GRIP + 0.02 + k * 0.04, T_STOP - k * 0.12, -25 - k, p, f));
  // rolls and tips: each 90 deg lands with a low crunch
  [[T_GRIP + 0.08 + 0.55, -12, 0.25], [T_GRIP + 0.08 + 1.1, -13, 0.3], [T_GRIP + 0.08 + 0.5, -15, -0.3], [T_GRIP + 0.08 + 1.0, -16, -0.25],
   [T_GRIP + 0.08 + 0.6, -19, 0.0], [T_GRIP + 0.08 + 1.2, -20, 0.05]].forEach(([t, g, p]) => { thud(ctx, out, t, g, p, 420, 0.4); crumple(ctx, out, t, 0.3, g - 6, p); });
  thud(ctx, out, T_BUS, -9, 0.15, 380, 0.8); crumple(ctx, out, T_BUS, 0.5, -15, 0.15); thud(ctx, rv, T_BUS + 0.02, -16, 0.15, 300, 1.0);
  // tables and bins clattering down the pavement (low wood/metal knocks, not dings)
  for (let k = 0; k < 9; k++) { const t = T_GRIP + 0.15 + k * 0.17 + hash(k) * 0.08; thud(ctx, out, t, -27 - (k % 3) * 2, 0.55 - (k % 2) * 1.1, 600, 0.15); }
  // aftermath: alarms (far, low), the crowd far down at the quay reacting, wind
  alarm(ctx, rv, 1.7, dur, -31, 0.35, 520, 3.2); alarm(ctx, rv, 2.2, dur, -34, -0.45, 610, 2.1);
  wind(ctx, out, { t0: 0, t1: dur, gain: -33, f: 450 });
  crowd(ctx, rv, { t0: 1.4, t1: dur, gain: -34, voices: 6, excite: (t) => 0.6, pan: 0, seed: 8 });
}
