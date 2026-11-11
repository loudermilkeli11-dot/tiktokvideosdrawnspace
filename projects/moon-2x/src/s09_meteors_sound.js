// s09_meteors sound (5.0 s + tail): the cut lands on the first impact. Running feet on the pier boards, meteor rips
// overhead in step with the streaks, deep booms arriving 0.4-1.0 s after each visible impact, the crowd screaming.
function boom9(ctx, out, t, gain, f0 = 70) {
  const s = src(ctx, noiseBuf(ctx, 'brown', 4, 33), t, t + 3.2); const lp = filt(ctx, 'lowpass', 260, 0.6);
  lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(90, t + 2.6);
  chain(s, lp, env(ctx, [[t, -120], [t + 0.03, gain], [t + 0.5, gain - 6], [t + 3.0, -120]]), out);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(28, t + 2.0); o.start(t); o.stop(t + 2.6);
  chain(o, env(ctx, [[t, -120], [t + 0.02, gain - 3], [t + 2.4, -120]]), out);
}
function steps9(ctx, out, t0, t1, rate, gain) {
  for (let k = 0, t = t0; t < t1; k++, t = t0 + k / rate) { const s = src(ctx, noiseBuf(ctx, 'pink', 1, 140 + (k % 4)), t, t + 0.14);
    chain(s, filt(ctx, 'bandpass', 230 + 80 * hash(k), 1.4), env(ctx, [[t, -120], [t + 0.004, gain - 4 * hash(k * 3)], [t + 0.09, -120]]), panner(ctx, (k % 2 ? 0.12 : -0.12)), out); }
}
function scream9(ctx, out, t, dur, gain, pan, seed) {
  const s = src(ctx, noiseBuf(ctx, 'white', 2, 70 + seed), t, t + dur + 0.1);
  const f1 = filt(ctx, 'bandpass', 900, 9), f2 = filt(ctx, 'bandpass', 2400, 10);
  const base = 1 + 0.25 * hash(seed); f1.frequency.setValueAtTime(800 * base, t); f1.frequency.linearRampToValueAtTime(1150 * base, t + dur * 0.3); f1.frequency.linearRampToValueAtTime(700 * base, t + dur);
  const m = ctx.createGain(); s.connect(f1); s.connect(f2); f1.connect(m); f2.connect(m);
  chain(m, env(ctx, [[t, -120], [t + 0.08, gain], [t + dur * 0.6, gain - 3], [t + dur, -120]]), panner(ctx, pan), out);
}
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3);
  hit(ctx, out, { t: 0 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -14, level: (t) => 0.6 + 0.4 * clamp(t / 5) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 900 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -20, period: 2.8, swell: 0.8 });
  steps9(ctx, out, 0.05, 5.0, 2.9, -15);                                     // the hero's feet on the boards
  crowd(ctx, out, { t0: 0, t1: dur, gain: -21, voices: 12, excite: () => 0.95 });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -26, voices: 8, excite: () => 0.9, seed: 3 });
  [[0.3, 1.0, -0.5], [1.4, 1.2, 0.4], [2.3, 0.9, -0.2], [3.6, 1.1, 0.6], [4.2, 0.8, -0.6]].forEach(([t, d, p], i) => scream9(ctx, rv, t, d, -20, p, i));
  // meteor rips: streaks crossing the frame (several per second), the four bolides loudest, right before their impacts
  for (let k = 0; k < 16; k++) { const t = 0.1 + k * 0.31 + hash(k * 5.1) * 0.15; whoosh(ctx, out, { t, dur: 0.45 + 0.3 * hash(k), gain: -22 + 4 * hash(k * 2), f0: 700, f1: 6500, pan0: 0.7, pan1: -0.6 }); }
  for (const ti of [1.2, 2.1, 3.5]) whoosh(ctx, out, { t: ti - 0.85, dur: 0.85, gain: -13, f0: 400, f1: 7000, pan0: 0.5, pan1: -0.3 });
  // impacts at 0.0, 1.2, 2.1, 3.5 (visible glows) -> booms after the distance delay
  [[0.45, -6], [1.95, -8], [2.6, -7], [4.5, -5]].forEach(([t, g]) => { boom9(ctx, out, t, g); boom9(ctx, rv, t + 0.05, g - 8, 55); });
}
