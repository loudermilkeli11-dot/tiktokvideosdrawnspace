// s08_mountain sound (dur = 7.0 + 0.6). Plain script (audio_core.js is prepended). t = 0 is the shot's first frame (film 43.0).
// The score owns the cut hit at 43.0 and the completion boom at 45.7: NO hits here. Room, the long deep INHALE (hard stop),
// the gale roar through the town, cloth and tiles, the crowd, the gelato seller's small "oh". Low and warm, no ticks.
const T_SQ = 1.5;      // SQZ.mountain.T - SHOT.s08_mountain.t0 = 44.5 - 43.0
const T_END = 2.7;     // doneAt('mountain') - t0 = 45.7 - 43.0 (hard stop: the score's boom lands here)
const T_GALE = 2.85;   // groupC_mole T_GALE 45.85 - 43.0
const T_SCOOP = 4.35;  // groupC_mole T_SCOOP 47.35 - 43.0
// a rising, sucking noise sweep, low-passed, louder and higher, cut dead at t1
function inhale(ctx, out, t0, t1, f0, f1, g0, g1, seed) {
  const s = src(ctx, noiseBuf(ctx, 'pink', 4, seed), t0, t1 + 0.05), bp = filt(ctx, 'bandpass', f0, 1.1), lp = filt(ctx, 'lowpass', f1 * 1.4, 0.6);
  bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
  const g = env(ctx, [[t0, -120], [t0 + 0.1, g0], [t1 - 0.02, g1], [t1, -120]]);
  chain(s, bp, lp, g, out);
}
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.8, 0.22);
  // the room: water lapping on the promenade wall, a murmuring crowd still pointing at the headland (s07)
  surf(ctx, out, { t0: 0, t1: dur, gain: -26, period: 4.2 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -26, voices: 10, excite: (t) => 0.35 + 0.35 * sstep(T_SQ, T_SQ + 0.6, t) + 0.3 * sstep(T_GALE, T_GALE + 0.5, t) - 0.3 * sstep(5.5, 7.0, t), seed: 8 });
  // the long deep inhale: the whole mountain drawn into a point (1.2 s), with a low groan under it
  inhale(ctx, out, T_SQ, T_END, 120, 900, -36, -11, 81);
  inhale(ctx, rv, T_SQ, T_END, 160, 1100, -44, -20, 82);
  rumble(ctx, out, { t0: T_SQ - 0.2, t1: T_END, gain: -18, sub: 31, level: (t) => sstep(T_SQ - 0.2, T_END, t) });
  gasp(ctx, rv, { t: T_SQ + 0.25, gain: -20, dur: 1.0, voices: 6 });
  // the gale: air rushing toward the gap, a broad low roar that peaks and eases out by the end
  for (const [f, g, sd, p] of [[260, -14, 91, -0.3], [520, -17, 92, 0.3], [140, -16, 93, 0]]) {
    const s = src(ctx, noiseBuf(ctx, 'pink', 5, sd), T_GALE - 0.1, dur), bp = filt(ctx, 'bandpass', f, 0.5), pn = panner(ctx, p);
    const ge = env(ctx, [[T_GALE - 0.1, -120], [T_GALE + 0.35, g], [4.6, g - 1], [6.2, g - 9], [dur, g - 20]]);
    chain(s, bp, ge, pn, out); }
  wind(ctx, out, { t0: T_GALE, t1: dur, gain: -22, f: 650 });
  // cloth flapping and tiles: low irregular bursts (band-limited < 1.5 kHz, never periodic)
  { const s = src(ctx, noiseBuf(ctx, 'white', 3, 95), T_GALE, dur), bp = filt(ctx, 'bandpass', 900, 0.9), lp = filt(ctx, 'lowpass', 1500, 0.7), am = ctx.createGain(); am.gain.value = 0;
    for (let k = 0, t = T_GALE + 0.1; t < dur - 0.3; k++) { const a = db(-24) * (0.3 + 0.7 * hash(k * 1.7)) * (1 - sstep(5.0, 7.0, t)); am.gain.setTargetAtTime(a, t, 0.015); am.gain.setTargetAtTime(0, t + 0.05 + 0.08 * hash(k * 2.3), 0.04); t += 0.11 + 0.23 * hash(k * 5.1); }
    chain(s, bp, lp, am, panner(ctx, -0.2), out); }
  { const s = src(ctx, noiseBuf(ctx, 'brown', 3, 96), T_GALE + 0.3, 5.6), lp = filt(ctx, 'lowpass', 700, 0.8), am = ctx.createGain(); am.gain.value = 0;   // tiles and chairs knocking
    for (let k = 0, t = T_GALE + 0.4; t < 5.4; k++) { am.gain.setValueAtTime(db(-20) * (0.4 + 0.6 * hash(k * 9.1)), t); am.gain.setTargetAtTime(0, t + 0.005, 0.03); t += 0.18 + 0.4 * hash(k * 3.3); }
    chain(s, lp, am, panner(ctx, 0.3), out); }
  // gag 3: the scoops whip away; the seller's small low "oh"
  whoosh(ctx, out, { t: T_SCOOP - 0.05, dur: 0.55, gain: -26, f0: 180, f1: 900, pan0: -0.1, pan1: 0.2 });
  gasp(ctx, out, { t: T_SCOOP + 0.45, gain: -21, dur: 0.6, voices: 1 });
}
