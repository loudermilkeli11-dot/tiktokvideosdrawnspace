// s06_tower sound (dur = 7.0 + 0.6 s). Plain script: audio_core.js is prepended. t = 0 is the shot's first frame (film 30.0).
// NO cut hit (30.0 is in score.json) and NO squeeze boom (score.json lands the big_hit at 33.8). Riser 1 is in the score.
// Sync (story.js): T = SQZ.tower.T - SHOT.s06_tower.t0 = 33.0 - 30.0 = 3.0 ; STOP = 33.42 - 30.0 = 3.42 (BUILDERS: hard stop,
// the score holds TRUE silence 33.42-33.8) ; HIT = doneAt('tower') - 30.0 = 3.8 ; FRONT = 36.3 - 30.0 = 6.3 (s06_tower.js T_FRONT).
const T = 3.0, STOP = 3.42, HIT = 3.8, FRONT = 6.3;
function SOUND(ctx, out, dur) {
  // every layer goes through one gate that is SILENT from STOP to HIT
  const gate = env(ctx, [[0, -3], [STOP - 0.005, -3], [STOP, -120], [HIT - 0.002, -120], [HIT, -3]]); gate.connect(out); out = gate;
  const rv = verb(ctx, out, 3.0, 0.25);
  // --- the pre-rumble: the harbour room, gulls lifting off in a flurry, the ground starting to growl
  surf(ctx, out, { t0: 0, t1: STOP, gain: -27, period: 4.5 });
  crowd(ctx, out, { t0: 0, t1: STOP, gain: -31, voices: 10, seed: 3, excite: (t) => 0.2 + 0.4 * sstep(1.5, 3.0, t) });
  flutter(ctx, out, { t: 0.5, dur: 2.2, gain: -22, pan0: -0.5, pan1: 0.6 });
  for (const [t, f, p] of [[0.55, 1150, -0.3], [0.8, 1300, 0.1], [1.05, 1000, 0.4], [1.6, 1200, 0.6]]) gull(ctx, rv, t, f, p);
  rumble(ctx, out, { t0: 0.2, t1: dur, gain: -14, sub: 30, level: (t) => (t < STOP ? 0.15 + 0.85 * sstep(0.3, 3.0, t) : 0.6 * (1 - sstep(HIT + 0.5, dur, t)) + 0.2) });
  // a deep groan in the tower's steel as the crane slews
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, 0.8); o.frequency.linearRampToValueAtTime(62, 2.6); o.start(0.8); o.stop(T);
    chain(o, filt(ctx, 'lowpass', 240, 3), env(ctx, [[0, -120], [0.8, -120], [1.6, -30], [2.9, -26], [T, -120]]), out); }
  // --- THE INHALE (0.42 s heard): the air and the glass shriek INTO the point, low-passed; HARD stop at STOP
  { const s = src(ctx, noiseBuf(ctx, 'pink', 0.6, 71), T - 0.02, STOP + 0.02), f = filt(ctx, 'bandpass', 260, 1.0);
    f.frequency.setValueAtTime(260, T); f.frequency.exponentialRampToValueAtTime(2000, STOP);
    chain(s, f, env(ctx, [[0, -120], [T, -36], [STOP - 0.01, -8], [STOP, -120]]), out); }
  { const s = src(ctx, noiseBuf(ctx, 'white', 0.6, 73), T + 0.05, STOP + 0.02), f = filt(ctx, 'bandpass', 900, 3);
    f.frequency.setValueAtTime(900, T + 0.05); f.frequency.exponentialRampToValueAtTime(2600, STOP);
    chain(s, f, filt(ctx, 'lowpass', 2800, 0.7), env(ctx, [[0, -120], [T + 0.05, -40], [STOP - 0.01, -18], [STOP, -120]]), panner(ctx, 0.2), out); }   // glass shriek
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(40, T); o.frequency.exponentialRampToValueAtTime(160, STOP); o.start(T); o.stop(STOP + 0.02);
    chain(o, filt(ctx, 'lowpass', 500, 2), env(ctx, [[0, -120], [T, -34], [STOP - 0.01, -14], [STOP, -120]]), out); }
  // --- after the big hit (score): the shock ROAR, far windows shattering (low-passed), the town screaming
  { const s = src(ctx, noiseBuf(ctx, 'brown', 4, 81), HIT, dur); chain(s, filt(ctx, 'lowpass', 320, 0.8), env(ctx, [[0, -120], [HIT, -120], [HIT + 0.08, -6], [HIT + 1.2, -11], [dur, -22]]), out); }
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4, 83), HIT, dur); chain(s, filt(ctx, 'bandpass', 520, 0.7), env(ctx, [[0, -120], [HIT, -120], [HIT + 0.3, -15], [FRONT - 0.3, -13], [FRONT + 0.2, -9], [dur, -18]]), rv); }
  for (let i = 0; i < 9; i++) { const t = HIT + 0.35 + i * 0.27 + 0.1 * Math.sin(i * 7); const s = src(ctx, noiseBuf(ctx, 'white', 0.3, 90 + i), t, t + 0.25);
    chain(s, filt(ctx, 'bandpass', 1500 + 300 * (i % 3), 1.5), filt(ctx, 'lowpass', 2400, 0.7), env(ctx, [[0, -120], [t, -120], [t + 0.01, -27 - (i % 3) * 2], [t + 0.22, -50]]), panner(ctx, -0.6 + 0.15 * i), rv); }
  crowd(ctx, rv, { t0: HIT + 0.2, t1: dur, gain: -17, voices: 14, seed: 9, excite: (t) => 0.75 + 0.25 * sstep(FRONT - 0.5, FRONT, t) });
  gasp(ctx, out, { t: HIT + 0.25, gain: -16, voices: 8 });
  // --- the pressure front hits the terrace: a wall of wind, flowers and glass whipping past
  whoosh(ctx, out, { t: FRONT - 0.25, dur: 1.0, gain: -10, f0: 160, f1: 1600, pan0: -0.3, pan1: 0.4 });
  wind(ctx, out, { t0: FRONT - 0.2, t1: dur, gain: -17, f: 600 });
  [0.05, 0.12, 0.2, 0.31].forEach((d, i) => hit(ctx, out, { t: FRONT + d, gain: -26 - i, sub: false, pan: -0.5 + 0.35 * i }));
}
function gull(ctx, out, t, f, pan) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.28);
  const lp = filt(ctx, 'lowpass', 1800, 0.8); o.start(t); o.stop(t + 0.32);
  chain(o, lp, env(ctx, [[0, -120], [t, -120], [t + 0.03, -31], [t + 0.25, -38], [t + 0.3, -120]]), panner(ctx, pan), out);
}
