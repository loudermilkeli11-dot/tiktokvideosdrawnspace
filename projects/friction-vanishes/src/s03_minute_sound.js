// s03_minute sound (4.5 s + 0.6 s tail). Low whoosh on the match cut; the glassy frictionless hiss returns; the street's slide grows
// with the speed (rumble level = slopeV(tau) / slopeV(4.5), story.js); one low crunch where car A T-bones car B; low whoosh on the
// whip down at the end. NO ticks, no cracks, nothing bright: every hit's energy stays under ~1 kHz.
// Sync: T_CRASH = (MAIN_X + 1.75 - W/2 - (A.x0 + L/2)) / vA = (60 + 1.75 - 0.93 - (30 + 2.2)) / 9 = 3.18 s (s03_minute.js, car A).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.4, 0.22);
  const T_CRASH = 3.18, VT = 79.5, TC = 46.7, v = (t) => VT * Math.tanh(Math.max(t, 0) / TC), vEnd = v(4.5);
  whoosh(ctx, out, { t: 0.0, dur: 0.7, gain: -18, f0: 110, f1: 800, pan0: 0.3, pan1: -0.3 });           // the match cut
  wind(ctx, out, { t0: 0, t1: dur, gain: -33, f: 500 });                                                   // high above the street
  // city room tone: distant traffic hum (brown, low)
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 31), 0, dur), filt(ctx, 'lowpass', 260, 0.7), env(ctx, [[0, -120], [0.2, -30], [dur, -32]]), out);
  // the glassy hiss: pink noise, high-cut 3 kHz, low; fades in as friction goes
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 32), 0, dur), filt(ctx, 'highpass', 450, 0.7), filt(ctx, 'lowpass', 3000, 0.7), env(ctx, [[0, -120], [0.5, -40], [2.0, -33], [dur, -31]]), out);
  // the whole street sliding: a low body that grows with the speed
  rumble(ctx, out, { t0: 0.2, t1: dur, gain: -19, sub: 36, level: (t) => 0.15 + 0.85 * v(t) / vEnd });
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 33), 0.3, dur), filt(ctx, 'bandpass', 380, 0.9), env(ctx, [[0.3, -120], [1.5, -36], [3.5, -28], [4.4, -25], [dur, -30]]), panner(ctx, -0.1), out);
  // the T-bone: low metal crunch (brown noise < 700 Hz + a thump), a scrape after
  { const t = T_CRASH; const o = ctx.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35); o.start(t); o.stop(t + 0.5);
    chain(o, env(ctx, [[t, -120], [t + 0.01, -16], [t + 0.4, -120]]), panner(ctx, 0.15), out);
    chain(src(ctx, noiseBuf(ctx, 'brown', 2, 34), t, t + 0.6), filt(ctx, 'lowpass', 700, 0.8), env(ctx, [[t, -120], [t + 0.008, -14], [t + 0.2, -24], [t + 0.55, -120]]), panner(ctx, 0.15), out);
    chain(src(ctx, noiseBuf(ctx, 'brown', 2, 35), t, t + 0.6), filt(ctx, 'lowpass', 600, 0.8), env(ctx, [[t, -120], [t + 0.02, -22], [t + 0.5, -120]]), rv);
    chain(src(ctx, noiseBuf(ctx, 'pink', 2, 36), t + 0.1, dur), filt(ctx, 'bandpass', 520, 1.6), env(ctx, [[t + 0.1, -120], [t + 0.25, -30], [t + 1.2, -38], [dur, -120]]), panner(ctx, 0.2), out); }
  whoosh(ctx, out, { t: 4.15, dur: 0.75, gain: -15, f0: 90, f1: 900, pan0: 0, pan1: 0 });                  // the whip down the street
}
