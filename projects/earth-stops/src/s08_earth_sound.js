// s08_earth sound (dur = 11.5 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 52.0 (HIT 3: the cut hit and the
// braaam (root 41.2 Hz, -6 dB) are in score.json). This bed: a low tone under the braaam, the planet's slow rumble, a soft
// low swell at the restore (film 61.0 = story T_RESTORE = shot 9.0), then near silence: everything is out by shot 10.8,
// before the score's TRUE silence (film 62.85–63.45 = shot 10.85–11.45).
function SOUND(ctx, out, dur) {
  const T_RESTORE = 9.0, T_SIL = 10.8;                                       // film 61.0 - 52.0; score silence at 62.85
  const rv = verb(ctx, out, 3.6, 0.28);
  // a low tone a fifth over the braaam root (41.2 × 1.5 = 61.8 Hz), slowly fading as the planet holds still
  const o = ctx.createOscillator(); o.frequency.value = 61.8; o.start(0); o.stop(T_SIL);
  const o2 = ctx.createOscillator(); o2.frequency.value = 41.2 * 2; o2.start(0); o2.stop(T_SIL);
  chain(o, filt(ctx, 'lowpass', 200, 0.7), env(ctx, [[0, -120], [0.8, -24], [6.0, -27], [8.6, -30], [T_RESTORE, -26], [10.2, -34], [T_SIL, -120]]), out);
  chain(o2, env(ctx, [[0, -120], [1.2, -34], [8.5, -38], [T_SIL, -120]]), rv);
  rumble(ctx, out, { t0: 0, t1: T_SIL, gain: -22, sub: 28, level: (t) => (1 - 0.6 * sstep(0, 8.8, t)) * (1 - sstep(10.2, 10.8, t)) });
  // the restore: a soft low swell (brown noise + 48 Hz sine) that blooms at 9.0 and dies away by 10.8 (no hit, no crack)
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 301), 8.4, T_SIL), filt(ctx, 'lowpass', 240, 0.6), env(ctx, [[8.4, -120], [T_RESTORE, -20], [9.7, -24], [T_SIL, -120]]), rv);
  const sw = ctx.createOscillator(); sw.frequency.setValueAtTime(40, 8.6); sw.frequency.linearRampToValueAtTime(52, 10.0); sw.start(8.6); sw.stop(T_SIL);
  chain(sw, env(ctx, [[8.6, -120], [T_RESTORE + 0.2, -22], [10.2, -30], [T_SIL, -120]]), out);
}
