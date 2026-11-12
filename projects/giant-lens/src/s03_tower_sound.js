// s03_tower sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Riser 1 (9.0 -> 13.5) and hit 1 (13.5) are in score.json: no cut hit here. Nothing repeating above ~3 kHz (crack/sizzle
// layers are low-passed at 4 kHz, and the cracks fall at irregular times).
// GROW = 0.2: SHOT.s03_tower.grows[0][0] in src/story.js (lens 63 -> 200 m over GROW_S = 0.8 s).
// MELT = 1.88: the dwell pane reaches flow (T_UP 0.35 + GLASS_MELT_S 1.53, src/s03_tower.js + story.js): groan, then drips hiss.
// CLIMB = 2.05: T_CLIMB in src/s03_tower.js (the spot climbs; panes crack and burst out one after another).
function SOUND(ctx, out, dur) {
  const GROW = 0.2, MELT = 1.88, CLIMB = 2.05;
  const rv = verb(ctx, out, 2.4, 0.22);
  // the tilt-up from s02 carries on: a soft low whoosh
  whoosh(ctx, out, { t: 0, dur: 0.6, gain: -22, f0: 110, f1: 700, pan0: 0, pan1: 0.1 });
  // street below: distant crowd, low city wind
  crowd(ctx, out, { t0: 0, t1: dur, gain: -30, voices: 8, excite: (t) => 0.5 + 0.3 * sstep(2.0, 3.0, t), seed: 3 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -32, f: 600 });
  // the low beam hum (60-120 Hz), deepening a little with the grow
  for (const [f0, f1, g] of [[80, 72, -22], [160, 144, -33]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, 0); o.frequency.linearRampToValueAtTime(f1, GROW + 0.8);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, g], [dur - 0.4, g], [dur, -120]]), out); }
  // lens-grow swell: a low 0.8 s swell (40-120 Hz) from GROW
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(44, GROW); o.frequency.exponentialRampToValueAtTime(100, GROW + 0.8);
    o.start(GROW); o.stop(GROW + 1.6); chain(o, filt(ctx, 'lowpass', 180), env(ctx, [[GROW, -60], [GROW + 0.55, -13], [GROW + 0.85, -17], [GROW + 1.5, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 33), GROW, GROW + 1.6);
    chain(n, filt(ctx, 'lowpass', 120), env(ctx, [[GROW, -60], [GROW + 0.6, -19], [GROW + 1.5, -120]]), out); }
  // the spot on glass: a low sizzle building while the pane heats (band-limited, low-passed at 4 kHz)
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 35), 0.3, dur);
    chain(n, filt(ctx, 'bandpass', 1400, 0.7), filt(ctx, 'lowpass', 4000), env(ctx, [[0.3, -60], [MELT, -30], [CLIMB + 0.3, -28], [dur, -34]]), panner(ctx, 0.15), out); }
  // glass groans as the dwell pane sags (slow, low, two voices)
  for (const [f, tA, g, p] of [[190, MELT - 0.3, -24, 0.1], [130, MELT + 0.4, -26, 0.25]]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, tA); o.frequency.linearRampToValueAtTime(f * 0.72, tA + 1.4);
    o.start(tA); o.stop(tA + 1.8); chain(o, filt(ctx, 'lowpass', 520, 2.5), env(ctx, [[tA, -70], [tA + 0.35, g], [tA + 1.1, g - 4], [tA + 1.7, -120]]), panner(ctx, p), rv); }
  // sparse cracks: panes bursting along the climb (irregular times, short low-passed noise bursts + a low body)
  const CR = [CLIMB + 0.12, CLIMB + 0.47, CLIMB + 0.66, CLIMB + 1.13, CLIMB + 1.52, CLIMB + 1.71, CLIMB + 2.24];
  CR.forEach((tc, i) => {
    const n = src(ctx, noiseBuf(ctx, 'white', 0.5, 40 + i), tc, tc + 0.4);
    chain(n, filt(ctx, 'bandpass', 900 + 380 * ((i * 0.618) % 1), 0.9), filt(ctx, 'lowpass', 4000), env(ctx, [[tc, -80], [tc + 0.006, -24 - (i % 3) * 3], [tc + 0.09, -40], [tc + 0.35, -120]]), panner(ctx, 0.1 + 0.2 * ((i * 0.37) % 1)), out);
    const b = src(ctx, noiseBuf(ctx, 'brown', 0.6, 50 + i), tc, tc + 0.5);
    chain(b, filt(ctx, 'lowpass', 300), env(ctx, [[tc, -80], [tc + 0.01, -22], [tc + 0.4, -120]]), rv);
  });
  // molten drips hissing on the street below (low-passed, a bed, not repeating ticks)
  { const n = src(ctx, noiseBuf(ctx, 'pink', 4, 45), MELT + 0.4, dur);
    chain(n, filt(ctx, 'highpass', 900), filt(ctx, 'lowpass', 3800), env(ctx, [[MELT + 0.4, -60], [MELT + 1.2, -33], [dur, -30]]), panner(ctx, -0.1), out); }
}
