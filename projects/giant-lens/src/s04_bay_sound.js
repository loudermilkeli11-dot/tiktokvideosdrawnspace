// s04_bay sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Hit 1 (13.5 = t 0) is in score.json: no cut hit here. Nothing repeating above ~3 kHz (fire/hiss layers low-passed at 4 kHz).
// GROW = 0.0: SHOT.s04_bay.grows[0][0] in src/story.js (lens 200 -> 632 m over GROW_S = 0.8 s).
// BOAT_B = 1.17 + 0.2, BOAT_A = 2.25 + 0.2: T_BB / T_BA in src/s04_bay.js (+ flame ignition delay): each boat goes up with a whump.
// WATER = 3.2: T_OFF in src/s04_bay.js (the spot leaves the pier end: the sea boils in a hard hiss). CRANE = 3.9: T_CRANE (low whoosh).
function SOUND(ctx, out, dur) {
  const GROW = 0.0, BOAT_B = 1.37, BOAT_A = 2.45, WATER = 3.2, CRANE = 3.9;
  const rv = verb(ctx, out, 2.8, 0.22);
  // the bay: surf and a light sea wind
  surf(ctx, out, { t0: 0, t1: dur, gain: -24, period: 5.5 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -32, f: 500 });
  // the low beam hum (60-120 Hz), a step deeper than s03
  for (const [f0, f1, g] of [[72, 66, -22], [144, 132, -33]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, 0); o.frequency.linearRampToValueAtTime(f1, GROW + 0.8);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, g], [dur - 0.4, g], [dur, -120]]), out); }
  // lens-grow swell: a low 0.8 s swell (40-120 Hz) from GROW
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(42, GROW); o.frequency.exponentialRampToValueAtTime(98, GROW + 0.8);
    o.start(GROW); o.stop(GROW + 1.6); chain(o, filt(ctx, 'lowpass', 180), env(ctx, [[GROW, -40], [GROW + 0.5, -12], [GROW + 0.85, -16], [GROW + 1.5, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 43), GROW, GROW + 1.6);
    chain(n, filt(ctx, 'lowpass', 120), env(ctx, [[GROW, -40], [GROW + 0.6, -18], [GROW + 1.5, -120]]), out); }
  // the pier going up: a rushing crackle that grows as the burning line races toward us (low-passed, a bed, no ticks)
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 47), 0, dur);
    chain(n, filt(ctx, 'bandpass', 900, 0.5), filt(ctx, 'lowpass', 4000), env(ctx, [[0, -40], [1.0, -32], [WATER, -23], [dur, -26]]), panner(ctx, 0.05), out);
    const r = src(ctx, noiseBuf(ctx, 'brown', 6, 48), 0, dur);
    chain(r, filt(ctx, 'lowpass', 220), env(ctx, [[0, -34], [WATER, -22], [dur, -24]]), out); }
  rumble(ctx, out, { t0: 0, t1: dur, gain: -26, sub: 36, level: (t) => 0.5 + 0.5 * sstep(0, 3.2, t) });
  // the two boats catching: soft low whumps (irregular), into the reverb
  for (const [tb, g, p] of [[BOAT_B, -14, 0.2], [BOAT_A, -12, 0.0]]) {
    const n = src(ctx, noiseBuf(ctx, 'brown', 1.2, 50 + tb * 10), tb, tb + 1.1);
    chain(n, filt(ctx, 'lowpass', 260), env(ctx, [[tb, -80], [tb + 0.05, g], [tb + 0.5, g - 10], [tb + 1.0, -120]]), panner(ctx, p), out);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, tb); o.frequency.exponentialRampToValueAtTime(38, tb + 0.6);
    o.start(tb); o.stop(tb + 0.8); chain(o, env(ctx, [[tb, -80], [tb + 0.03, g - 2], [tb + 0.7, -120]]), rv); }
  // the sea boiling: a hard hiss (low-passed at 4 kHz) with a low steam roar under it
  { const n = src(ctx, noiseBuf(ctx, 'white', 3, 55), WATER - 0.1, dur);
    chain(n, filt(ctx, 'highpass', 700), filt(ctx, 'lowpass', 4000), env(ctx, [[WATER - 0.1, -70], [WATER + 0.15, -22], [dur - 0.3, -24], [dur, -40]]), panner(ctx, 0.25), out);
    const b = src(ctx, noiseBuf(ctx, 'brown', 3, 56), WATER - 0.1, dur);
    chain(b, filt(ctx, 'lowpass', 300), env(ctx, [[WATER - 0.1, -70], [WATER + 0.2, -20], [dur, -26]]), panner(ctx, 0.2), out); }
  // the crane up and back: a low whoosh (f0 80-200, f1 <= 1200)
  whoosh(ctx, out, { t: CRANE, dur: 0.9, gain: -17, f0: 110, f1: 800, pan0: -0.1, pan1: 0.1 });
}
