// s10_ring sound (5.0 s + tail): cut hit, then the low roar of rubble overhead, wind on the hill, distant booms,
// a groan of stone at the rigid Roche limit (0.4 s).
function boom10(ctx, out, t, gain) {
  const s = src(ctx, noiseBuf(ctx, 'brown', 4, 44), t, t + 3.5); const lp = filt(ctx, 'lowpass', 200, 0.6);
  lp.frequency.setValueAtTime(320, t); lp.frequency.exponentialRampToValueAtTime(70, t + 3.0);
  chain(s, lp, env(ctx, [[t, -120], [t + 0.06, gain], [t + 0.8, gain - 6], [t + 3.3, -120]]), out);
}
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.4, 0.32);
  hit(ctx, out, { t: 0 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -11, level: (t) => 0.75 + 0.25 * clamp(t / 5) });
  // roar of rubble: wide band of filtered noise, slow beating
  const s = src(ctx, noiseBuf(ctx, 'pink', 5, 51), 0, dur); const bp = filt(ctx, 'bandpass', 380, 0.5); const g = ctx.createGain(); g.gain.value = 0;
  for (let t = 0; t <= dur; t += 0.1) { g.gain.linearRampToValueAtTime(db(-17) * (0.6 + 0.4 * clamp(t / 4)) * (0.8 + 0.2 * Math.sin(t * 2.3)), t); bp.frequency.linearRampToValueAtTime(320 + 140 * Math.sin(t * 0.9), t); }
  chain(s, bp, g, out);
  wind(ctx, out, { t0: 0, t1: dur, gain: -19, f: 650 });
  // stone groan at the rigid Roche limit
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, 0.4); o.frequency.linearRampToValueAtTime(36, 2.2); o.start(0.4); o.stop(2.6);
  chain(o, filt(ctx, 'lowpass', 180, 1.2), env(ctx, [[0.4, -120], [0.6, -16], [2.4, -120]]), rv);
  for (const [t, gn] of [[1.6, -9], [3.9, -10], [4.8, -14]]) { boom10(ctx, out, t, gn); boom10(ctx, rv, t + 0.05, gn - 8); }
  for (let k = 0; k < 7; k++) whoosh(ctx, rv, { t: 0.3 + k * 0.7 + hash(k) * 0.3, dur: 0.9, gain: -27, f0: 500, f1: 4500, pan0: 0.6, pan1: -0.6 });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -32, voices: 8, excite: () => 0.7, seed: 4 });
  siren(ctx, rv, { t0: 0, t1: dur, gain: -34, pan: 0.3 });
}
