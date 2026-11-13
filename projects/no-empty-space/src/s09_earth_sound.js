// s09_earth sound (dur = 6.0 + 0.6). Plain script (audio_core.js is prepended). t = 0 is film 50.0.
// The score owns the hit at 51.5 (T_ORBIT), riser 2, the braaams and the hit at 55.0: NO hits here. The gale fading as we rise,
// then space: a low groan into the deep Earth INHALE (3.0 s) with a HARD stop at 55.0.
const T_CUT = 1.5;     // T_ORBIT 51.5 - SHOT.s09_earth.t0 50.0
const T_SQ = 2.0;      // SQZ.earth.T 52.0 - 50.0
const T_END = 5.0;     // doneAt('earth') 55.0 - 50.0
function inhale(ctx, out, t0, t1, f0, f1, g0, g1, seed) {
  const s = src(ctx, noiseBuf(ctx, 'pink', 4, seed), t0, t1 + 0.05), bp = filt(ctx, 'bandpass', f0, 1.1), lp = filt(ctx, 'lowpass', f1 * 1.4, 0.6);
  bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
  const g = env(ctx, [[t0, -120], [t0 + 0.2, g0], [t1 - 0.02, g1], [t1, -120]]);
  chain(s, bp, lp, g, out);
}
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.2, 0.25);
  // 0-1.5: the gale easing as the camera rises over the town, cut dead at the orbit cut
  for (const [f, g, sd] of [[260, -18, 91], [140, -20, 93]]) {
    const s = src(ctx, noiseBuf(ctx, 'pink', 5, sd), 0, T_CUT + 0.02), bp = filt(ctx, 'bandpass', f, 0.5);
    chain(s, bp, env(ctx, [[0, g], [1.2, g - 10], [T_CUT - 0.01, g - 14], [T_CUT, -120]]), out); }
  crowd(ctx, out, { t0: 0, t1: T_CUT, gain: -30, voices: 8, excite: () => 0.4, seed: 4 });
  // space: a low groan (sub + brown rumble) swelling under the deep inhale; both stop dead at 55.0
  { const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(48, T_SQ); os.frequency.exponentialRampToValueAtTime(30, T_END);
    const lp = filt(ctx, 'lowpass', 160, 0.8); os.start(T_SQ); os.stop(T_END + 0.02);
    chain(os, lp, env(ctx, [[T_SQ, -120], [T_SQ + 0.6, -26], [T_END - 0.03, -15], [T_END, -120]]), out); }
  rumble(ctx, out, { t0: T_SQ, t1: T_END, gain: -17, sub: 29, level: (t) => sstep(T_SQ, T_END, t) });
  inhale(ctx, out, T_SQ + 0.2, T_END, 90, 1400, -40, -10, 71);
  inhale(ctx, rv, T_SQ + 0.4, T_END, 130, 1700, -46, -18, 72);
}
