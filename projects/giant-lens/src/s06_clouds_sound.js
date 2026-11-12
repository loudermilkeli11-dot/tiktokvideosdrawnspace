// s06_clouds sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Hit 2 (22.5) and riser 2 are in score.json: no cut hit here. Nothing repeating above ~3 kHz.
// GROW = 0.0: SHOT.s06_clouds.grows[0][0] in src/story.js (lens 2 -> 6.3 km over GROW_S = 0.8 s).
// CLIMB = 3.9: T_CLIMB in src/s06_clouds.js (the camera's fast climb into s07).
function SOUND(ctx, out, dur) {
  const GROW = 0.0, CLIMB = 3.9;
  const rv = verb(ctx, out, 3.2, 0.22);
  // altitude wind, swelling into the climb
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 520 });
  const wn = src(ctx, noiseBuf(ctx, 'pink', 4, 61), 0, dur);
  chain(wn, filt(ctx, 'bandpass', 380, 0.6), filt(ctx, 'lowpass', 2500), env(ctx, [[0, -40], [CLIMB, -36], [dur - 0.5, -22], [dur, -28]]), out);
  // the low beam hum (60-120 Hz), carried over from the ground shots, deepening a little as the lens grows
  for (const [f0, f1, g] of [[62, 55, -22], [124, 110, -32]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, 0); o.frequency.linearRampToValueAtTime(f1, GROW + 0.8);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, g], [dur - 0.4, g], [dur, -120]]), out); }
  // lens-grow swell: a low 0.8 s swell (40-120 Hz) from GROW
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(42, GROW); o.frequency.exponentialRampToValueAtTime(96, GROW + 0.8);
    o.start(GROW); o.stop(GROW + 1.6); chain(o, filt(ctx, 'lowpass', 180), env(ctx, [[GROW, -60], [GROW + 0.55, -12], [GROW + 0.85, -16], [GROW + 1.5, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 63), GROW, GROW + 1.6);
    chain(n, filt(ctx, 'lowpass', 120), env(ctx, [[GROW, -60], [GROW + 0.6, -18], [GROW + 1.5, -120]]), out); }
  // the airliner (upper left): engines spool up as it banks hard away, then fade off to the left
  { const n = src(ctx, noiseBuf(ctx, 'pink', 4, 67), 0, dur);
    chain(n, filt(ctx, 'bandpass', 420, 0.8), env(ctx, [[0, -34], [0.4, -30], [1.6, -21], [3.0, -26], [dur, -42]]), panner(ctx, -0.55), out);
    const r = src(ctx, noiseBuf(ctx, 'brown', 4, 69), 0, dur);
    chain(r, filt(ctx, 'lowpass', 260), env(ctx, [[0, -30], [1.6, -20], [3.2, -27], [dur, -40]]), panner(ctx, -0.4), out);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(820, 0); o.frequency.linearRampToValueAtTime(1240, 1.7); o.frequency.linearRampToValueAtTime(1150, dur);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, -48], [1.7, -38], [3.4, -44], [dur, -60]]), panner(ctx, -0.6), out); }
  // the burn far below: a deep, slow rumble
  rumble(ctx, out, { t0: 0, t1: dur, gain: -28, sub: 34, level: (t) => 0.6 + 0.4 * sstep(0, 0.8, t) });
  // the climb: a low whoosh (f0 80-200, f1 <= 1200)
  whoosh(ctx, out, { t: CLIMB, dur: 0.9, gain: -15, f0: 120, f1: 900, pan0: -0.2, pan1: 0.2 });
  whoosh(ctx, rv, { t: CLIMB + 0.1, dur: 0.9, gain: -22, f0: 100, f1: 700, pan0: 0.2, pan1: -0.2 });
}
