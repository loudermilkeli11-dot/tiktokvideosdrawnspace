// s08_earth sound (dur = 20.0 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 43.5 (v2: s07_coast cut; HIT 2:
// the cut hit and the braaam (root 41.2 Hz, -6 dB) are in score.json). This bed: a low tone under the braaam, the planet's
// slow rumble, a soft low swell at the restore (film 61.0 = story T_RESTORE = shot 17.5), then near silence: everything is
// out by shot 19.3, before the score's TRUE silence (film 62.85–63.45 = shot 19.35–19.95).
function SOUND(ctx, out, dur) {
  const T_RESTORE = 17.5, T_SIL = 19.3, D = 8.5;                             // D: v1 offsets (the restore was at 9.0) shift by 8.5
  const rv = verb(ctx, out, 3.6, 0.28);
  // a low tone a fifth over the braaam root (41.2 × 1.5 = 61.8 Hz), slowly fading as the planet holds still
  const o = ctx.createOscillator(); o.frequency.value = 61.8; o.start(0); o.stop(T_SIL);
  const o2 = ctx.createOscillator(); o2.frequency.value = 41.2 * 2; o2.start(0); o2.stop(T_SIL);
  chain(o, filt(ctx, 'lowpass', 200, 0.7), env(ctx, [[0, -120], [0.8, -24], [6.0, -27], [8.6 + D, -30], [T_RESTORE, -26], [10.2 + D, -34], [T_SIL, -120]]), out);
  chain(o2, env(ctx, [[0, -120], [1.2, -34], [8.5 + D, -38], [T_SIL, -120]]), rv);
  rumble(ctx, out, { t0: 0, t1: T_SIL, gain: -22, sub: 28, level: (t) => (1 - 0.6 * sstep(0, 8.8 + D, t)) * (1 - sstep(10.2 + D, 10.8 + D, t)) });
  // the restore: a soft low swell (brown noise + 48 Hz sine) that blooms at 17.5 and dies away by 19.3 (no hit, no crack)
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 301), 8.4 + D, T_SIL), filt(ctx, 'lowpass', 240, 0.6), env(ctx, [[8.4 + D, -120], [T_RESTORE, -20], [9.7 + D, -24], [T_SIL, -120]]), rv);
  const sw = ctx.createOscillator(); sw.frequency.setValueAtTime(40, 8.6 + D); sw.frequency.linearRampToValueAtTime(52, 10.0 + D); sw.start(8.6 + D); sw.stop(T_SIL);
  chain(sw, env(ctx, [[8.6 + D, -120], [T_RESTORE + 0.2, -22], [10.2 + D, -30], [T_SIL, -120]]), out);
}
