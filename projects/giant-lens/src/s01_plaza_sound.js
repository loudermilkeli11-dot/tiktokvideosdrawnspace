// s01_plaza sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// No cut hits here (score.json), no ticks, nothing repeating above ~3 kHz (sizzles/crackle low-passed at 4 kHz).
// Sync constants (shot seconds):
//   FOCUS = 1.0  : story.FOCUS_S (C 10 -> 11,556 suns, the point is white-hot)
//   CAR = 1.95   : the spot reaches the car roof (groupA_frame1 gAt: bezier to the roof by 1.95)
//   ROOF = 2.75  : roof flames (groupA_frame1: t0 2.5-2.9, grow 0.5) -> the soft whump at 3.0 per the brief
//   BLAZE = 3.0  : whole-car flames (t0 2.95-3.4)
//   TREE = 3.6   : the spot reaches the plaza ring tree's crown (gAt: 3.05 -> 3.6)
//   WHIP = 4.15  : s01_plaza WHIP_T 4.5 - WHIP_DUR/2 (the right whip into s02)
function SOUND(ctx, out, dur) {
  const FOCUS = 1.0, CAR = 1.95, BLAZE = 3.0, TREE = 3.6, WHIP = 4.15;
  const rv = verb(ctx, out, 2.8, 0.2);
  // plaza room tone: crowd murmur -> gasps as the point flares, then alarm and running
  crowd(ctx, out, { t0: 0, t1: dur, gain: -24, voices: 10, excite: (t) => 0.2 + 0.25 * sstep(0.8, 1.4, t) + 0.35 * sstep(2.6, 3.3, t), seed: 3 });
  gasp(ctx, rv, { t: 1.05, gain: -18, dur: 1.2, voices: 5 });
  gasp(ctx, rv, { t: 3.05, gain: -16, dur: 1.4, voices: 7 });
  // the fountain (left)
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 11), 0, dur); chain(n, filt(ctx, 'bandpass', 900, 0.5), filt(ctx, 'lowpass', 3000), env(ctx, [[0, -36], [dur, -36]]), panner(ctx, -0.5), out); }
  // the low beam hum (60-120 Hz), already sounding at frame 1 (s09 ends on the same level: -22 / -32)
  for (const [f, g] of [[62, -22], [124, -32]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, 0); o.start(0); o.stop(dur);
    chain(o, env(ctx, [[0, g], [FOCUS, g + 3], [dur, g + 3]]), out); }
  // the rising sizzle as the spot tightens, then the scorching line (low-passed at 4 kHz)
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 13), 0, dur);
    const bp = filt(ctx, 'bandpass', 1200, 0.8); bp.frequency.setValueAtTime(700, 0); bp.frequency.exponentialRampToValueAtTime(2200, FOCUS);
    chain(n, bp, filt(ctx, 'lowpass', 4000), env(ctx, [[0, -48], [FOCUS, -28], [CAR, -30], [CAR + 0.1, -26], [BLAZE, -32], [dur, -40]]), panner(ctx, 0.1), out); }
  // crackle of scorching paving (irregular grains, low-passed)
  { const n = src(ctx, noiseBuf(ctx, 'white', 6, 17), 0, dur);
    const g = ctx.createGain(); g.gain.value = 0; let s = 7;
    for (let t = 0.85; t < dur - 0.2; t += 0.02 + 0.07 * hash(s++)) { const a = 0.2 + 0.8 * hash(s++); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03); }
    chain(n, g, filt(ctx, 'bandpass', 1500, 0.6), filt(ctx, 'lowpass', 4000), env(ctx, [[0, -60], [0.9, -34], [CAR, -30], [dur, -30]]), panner(ctx, 0.15), out); }
  // paint pops on the roof (a few low, irregular)
  for (const [t, g] of [[2.02, -24], [2.19, -27], [2.41, -23], [2.53, -29], [2.7, -25]]) {
    const n = src(ctx, noiseBuf(ctx, 'brown', 1, 23 + t * 100), t, t + 0.2); chain(n, filt(ctx, 'bandpass', 420, 1.2), env(ctx, [[t, -80], [t + 0.005, g], [t + 0.12, -80]]), panner(ctx, 0.2), out); }
  // the roof catches: a soft whump at 3.0, then the car's fire roar
  { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(78, BLAZE); o.frequency.exponentialRampToValueAtTime(38, BLAZE + 0.5); o.start(BLAZE); o.stop(BLAZE + 0.8);
    chain(o, env(ctx, [[BLAZE, -80], [BLAZE + 0.03, -12], [BLAZE + 0.6, -60]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 2, 29), BLAZE, BLAZE + 1); chain(n, filt(ctx, 'lowpass', 220), env(ctx, [[BLAZE, -80], [BLAZE + 0.04, -14], [BLAZE + 0.7, -60]]), out);
    const f = src(ctx, noiseBuf(ctx, 'pink', 4, 31), 2.4, dur); chain(f, filt(ctx, 'bandpass', 380, 0.5), filt(ctx, 'lowpass', 3000), env(ctx, [[2.4, -60], [BLAZE, -26], [dur, -24]]), panner(ctx, 0.2), out); }
  // the tree crown flares (a low rushing flare)
  whoosh(ctx, out, { t: TREE - 0.05, dur: 0.7, gain: -20, f0: 110, f1: 700, pan0: 0.3, pan1: 0.45 });
  // the whip right into s02 (low whoosh, f1 <= 1200)
  whoosh(ctx, out, { t: WHIP, dur: 0.75, gain: -13, f0: 160, f1: 1100, pan0: -0.6, pan1: 0.7 });
  whoosh(ctx, rv, { t: WHIP + 0.05, dur: 0.8, gain: -22, f0: 120, f1: 800, pan0: -0.4, pan1: 0.5 });
}
