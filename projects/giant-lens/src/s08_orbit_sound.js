// s08_orbit sound (dur = 5.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Hit 3 (31.5, + braaam) and hit 4 (37.0) are in score.json: no cut hit here. Space: one low tone (board).
// GROW = 0.0: SHOT.s08_orbit.grows[0][0] in src/story.js (63 -> 200 km over GROW_S = 0.8 s).
// SIL = 5.05: score.json's true silence 36.55-36.97 = shot time 5.05-5.47; everything here is out by then.
function SOUND(ctx, out, dur) {
  const GROW = 0.0, GS = 0.8, SIL = 5.05;
  const rv = verb(ctx, out, 4.5, 0.3);
  // the one low tone: 36.7 Hz + a soft fifth, swelling with the grow, fading into the silence
  for (const [f, g, type] of [[36.7, -16, 'sine'], [55, -26, 'sine'], [73.4, -32, 'triangle']]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, 0);
    o.start(0); o.stop(SIL + 0.1); chain(o, filt(ctx, 'lowpass', 220), env(ctx, [[0, -60], [0.4, g - 4], [GS + 0.4, g], [4.0, g - 3], [SIL - 0.05, -70], [SIL, -120]]), out);
  }
  // lens-grow swell (40-120 Hz, 0.8 s)
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(40, GROW); o.frequency.exponentialRampToValueAtTime(110, GROW + GS);
    o.start(GROW); o.stop(GROW + 1.8); chain(o, filt(ctx, 'lowpass', 180), env(ctx, [[GROW, -60], [GROW + 0.6, -11], [GROW + 0.9, -15], [GROW + 1.7, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 83), GROW, GROW + 1.8);
    chain(n, filt(ctx, 'lowpass', 100), env(ctx, [[GROW, -60], [GROW + 0.6, -18], [GROW + 1.7, -120]]), rv); }
  // a faint, slow pressure of the burn (sub only), gone before the silence
  rumble(ctx, out, { t0: 0, t1: SIL, gain: -32, sub: 30, level: (t) => 0.6 + 0.4 * sstep(0, GS, t) - 0.6 * sstep(3.8, SIL, t) });
}
