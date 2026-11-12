// s05_town sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Hit 2 (22.5 = this shot's end) is in score.json: no cut hit here. Nothing repeating above ~3 kHz (hiss low-passed at 4 kHz).
// GROW = 0.0: SHOT.s05_town.grows[0][0] in src/story.js (lens 632 m -> 2 km over GROW_S = 0.8 s).
// TOWN = 0.5 -> TURN = 2.6: the spot sweeps the town (T_TOWN0, T_TURN in src/s05_town.js): roofs catch one after another.
// TURN = 2.6: the spot reaches the bay; the sea boils (1.2 t/s) in a hard hiss to the end.
function SOUND(ctx, out, dur) {
  const GROW = 0.0, TOWN = 0.5, TURN = 2.6;
  const rv = verb(ctx, out, 3.0, 0.3);
  // the crane from s04 carries on: a soft low whoosh settling
  whoosh(ctx, out, { t: 0, dur: 0.7, gain: -22, f0: 90, f1: 500, pan0: 0, pan1: -0.1 });
  // air over the bay, gulls far off (low, no bright chirps)
  wind(ctx, out, { t0: 0, t1: dur, gain: -28, f: 500 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -30, period: 6.5 });
  // the beam hum, deeper with power (3.1 GW): 62 -> 55 Hz
  for (const [f0, f1, g] of [[62, 55, -20], [124, 110, -31]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, 0); o.frequency.linearRampToValueAtTime(f1, GROW + 0.8);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, g], [dur - 0.4, g], [dur, -120]]), out); }
  // lens-grow swell: low 0.8 s swell (40-120 Hz) from GROW
  { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(40, GROW); o.frequency.exponentialRampToValueAtTime(96, GROW + 0.8);
    o.start(GROW); o.stop(GROW + 1.6); chain(o, filt(ctx, 'lowpass', 170), env(ctx, [[GROW, -40], [GROW + 0.5, -12], [GROW + 0.85, -16], [GROW + 1.5, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 61), GROW, GROW + 1.6);
    chain(n, filt(ctx, 'lowpass', 120), env(ctx, [[GROW, -50], [GROW + 0.6, -18], [GROW + 1.5, -120]]), out); }
  // distant roofs catching: soft low whumps at irregular times along the sweep, plus a rolling fire bed
  const WH = [TOWN + 0.05, TOWN + 0.38, TOWN + 0.61, TOWN + 1.02, TOWN + 1.19, TOWN + 1.55, TOWN + 1.83, TOWN + 2.04];
  WH.forEach((tw, i) => { const b = src(ctx, noiseBuf(ctx, 'brown', 0.9, 70 + i), tw, tw + 0.8);
    chain(b, filt(ctx, 'lowpass', 260), env(ctx, [[tw, -80], [tw + 0.04, -21 - (i % 3) * 2], [tw + 0.7, -120]]), panner(ctx, -0.6 + 1.1 * (i / WH.length)), rv); });
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 75), TOWN, dur);
    chain(n, filt(ctx, 'bandpass', 700, 0.6), filt(ctx, 'lowpass', 3000), env(ctx, [[TOWN, -60], [TOWN + 1.2, -32], [dur, -29]]), out); }
  // the sea boils: a hard hiss (band-limited, low-passed 4 kHz) with a low steam roar under it
  { const n = src(ctx, noiseBuf(ctx, 'white', 3, 80), TURN, dur);
    chain(n, filt(ctx, 'bandpass', 1800, 0.5), filt(ctx, 'lowpass', 4000), env(ctx, [[TURN, -70], [TURN + 0.25, -24], [dur, -22]]), panner(ctx, 0.3), out);
    const r = src(ctx, noiseBuf(ctx, 'brown', 3, 81), TURN, dur);
    chain(r, filt(ctx, 'lowpass', 200), env(ctx, [[TURN, -70], [TURN + 0.3, -20], [dur, -19]]), out); }
}
