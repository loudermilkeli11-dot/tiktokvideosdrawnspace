// s02_street sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// No cut hits (score.json), no ticks, nothing repeating above ~3 kHz. Riser 1 starts at 9.0 film (score.json).
// Sync constants (shot seconds):
//   GROW = 0.15 : SHOT.s02_street.grows[0][0] in src/story.js (lens 20 -> 63 m over GROW_S 0.8 s)
//   CARS        : s02_street.js: the spot runs z 3.5 -> -50 over T_TURN 0.7 -> T_END 4.35 along the parked ROW
//                 (z 1.5, -6.5, -15.5, -22.5, -31.5, -38.5, -45.5); it reaches each roof at ≈ 0.75, 1.27, 1.88, 2.36, 2.97, 3.45,
//                 3.92 and the whole car goes up ≈ 0.5 s later: the whumps below (irregular gaps, varied pitch/level).
//   TILT = 3.9  : the tilt up toward the lens (into s03)
function SOUND(ctx, out, dur) {
  const GROW = 0.15, TILT = 3.9;
  const WHUMPS = [[1.27, -14, 74], [1.8, -17, 66], [2.4, -13, 80], [2.86, -18, 70], [3.5, -15, 62], [3.93, -19, 76], [4.42, -17, 68]];
  const rv = verb(ctx, out, 2.8, 0.2);
  // the tail of the whip from s01, decelerating
  whoosh(ctx, out, { t: 0, dur: 0.45, gain: -16, f0: 900, f1: 160, pan0: 0.3, pan1: 0.7 });
  // the low beam hum (60-120 Hz), deepening a little as the lens grows ×3.16
  for (const [f0, f1, g] of [[62, 55, -19], [124, 110, -29]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, 0); o.frequency.setValueAtTime(f0, GROW); o.frequency.linearRampToValueAtTime(f1, GROW + 0.8);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, g], [GROW + 0.8, g + 2], [dur, g + 2]]), out); }
  // lens-grow swell: a low 0.8 s swell (40-120 Hz) from GROW
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(42, GROW); o.frequency.exponentialRampToValueAtTime(96, GROW + 0.8);
    o.start(GROW); o.stop(GROW + 1.6); chain(o, filt(ctx, 'lowpass', 180), env(ctx, [[GROW, -60], [GROW + 0.55, -12], [GROW + 0.85, -16], [GROW + 1.5, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 41), GROW, GROW + 1.6);
    chain(n, filt(ctx, 'lowpass', 120), env(ctx, [[GROW, -60], [GROW + 0.6, -18], [GROW + 1.5, -120]]), out); }
  // the street: people running and shouting (no single voice), panned around the hero
  crowd(ctx, out, { t0: 0, t1: dur, gain: -22, voices: 12, excite: (t) => 0.55 + 0.35 * sstep(0.8, 2.0, t), pan: -0.15, seed: 5 });
  gasp(ctx, rv, { t: 1.3, gain: -19, dur: 1.2, voices: 6 });
  // the sizzle of the line on the asphalt (low-passed at 4 kHz), on the right
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 43), 0, dur);
    chain(n, filt(ctx, 'bandpass', 1800, 0.7), filt(ctx, 'lowpass', 4000), env(ctx, [[0, -40], [0.6, -30], [TILT, -32], [dur, -40]]), panner(ctx, 0.4), out); }
  // crackle (irregular grains), growing with the number of burning cars
  { const n = src(ctx, noiseBuf(ctx, 'white', 6, 47), 0, dur);
    const g = ctx.createGain(); g.gain.value = 0; let s = 101;
    for (let t = 0.6; t < dur - 0.2; t += 0.015 + 0.05 * hash(s++)) { const a = 0.2 + 0.8 * hash(s++); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03); }
    chain(n, g, filt(ctx, 'bandpass', 1300, 0.6), filt(ctx, 'lowpass', 4000), env(ctx, [[0, -60], [0.8, -34], [3.0, -27], [dur, -27]]), panner(ctx, 0.35), out); }
  // car-by-car ignition whumps (irregular)
  WHUMPS.forEach(([t, g, f], k) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.5); o.start(t); o.stop(t + 0.8);
    chain(o, env(ctx, [[t, -80], [t + 0.03, g], [t + 0.6, -60]]), panner(ctx, 0.45 - k * 0.04), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 1, 51 + k), t, t + 0.9); chain(n, filt(ctx, 'lowpass', 260), env(ctx, [[t, -80], [t + 0.04, g - 2], [t + 0.7, -60]]), panner(ctx, 0.45 - k * 0.04), out); });
  // the fire roar of the burning row, building
  { const f = src(ctx, noiseBuf(ctx, 'pink', 6, 53), 0, dur); chain(f, filt(ctx, 'bandpass', 340, 0.5), filt(ctx, 'lowpass', 3000), env(ctx, [[0, -40], [1.3, -28], [3.5, -21], [dur, -21]]), panner(ctx, 0.35), out);
    rumble(ctx, out, { t0: 0, t1: dur, gain: -24, sub: 36, level: (t) => 0.4 + 0.6 * sstep(1.0, 3.5, t) }); }
  // the tilt up toward the lens (low whoosh, upward)
  whoosh(ctx, out, { t: TILT, dur: 0.8, gain: -15, f0: 110, f1: 1000, pan0: 0.1, pan1: -0.1 });
}
