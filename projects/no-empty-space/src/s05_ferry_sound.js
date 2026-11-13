// s05_ferry sound (dur = 6.5 + 0.6 s). Plain script: audio_core.js is prepended (no imports). t = 0 is the shot's first frame.
// NO cut hits and NO squeeze boom (score.json has the 26.1 completion boom). This shot plays the room, the INHALE (hard stop
// at the squeeze's end), the water slam + geyser roar, the ropes, the ring wave on the quay, the crowd and the fish.
// Sync (story.js): T = SQZ.ferry.T - SHOT.s05_ferry.t0 = 25.5 - 23.5 = 2.0 ; END = T + SQZ.ferry.dur = 2.6 ;
//                  SLAM = doneAt('ferry') + 0.22 - 23.5 = 2.82 (s05_ferry.js TS) ; CATCH = 28.45 - 23.5 = 4.95 (T_CATCH).
const T = 2.0, END = 2.6, SLAM = 2.82, CATCH = 4.95;
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 2.4, 0.22);
  // --- the room: water lapping on our hull, the town across the water, a few gulls (low, sparse)
  surf(ctx, out, { t0: 0, t1: dur, gain: -24, period: 3.8, pan: -0.2 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -27, voices: 12, pan: 0.35, seed: 5, excite: (t) => 0.2 + 0.75 * sstep(T + 0.2, T + 0.7, t) * (1 - 0.4 * sstep(4.5, 6.5, t)) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -34, f: 500 });
  for (const [t, f, p] of [[0.5, 1250, -0.5], [1.3, 1100, 0.4], [3.4, 1350, 0.2], [3.7, 1200, -0.3], [5.8, 1050, 0.6]]) gull(ctx, rv, t, f, p);
  // --- the INHALE: the steel groans and the air is sucked in; louder and higher, HARD stop at END
  { const s = src(ctx, noiseBuf(ctx, 'pink', 1.2, 21), T - 0.05, END + 0.05), f = filt(ctx, 'bandpass', 300, 1.1);
    f.frequency.setValueAtTime(300, ctx.currentTime + T); f.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + END);
    chain(s, f, env(ctx, [[0, -120], [T, -40], [END - 0.02, -13], [END, -120]]), out); }
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, T); o.frequency.exponentialRampToValueAtTime(150, END);
    const lp = filt(ctx, 'lowpass', 420, 2.5); o.start(T); o.stop(END + 0.05);
    chain(o, lp, env(ctx, [[0, -120], [T, -42], [END - 0.03, -17], [END, -120]]), out); }
  // the mooring ropes part (low snaps, not ticks), the papers and crates rattle in
  [T + 0.12, T + 0.2, T + 0.31, T + 0.4].forEach((t, i) => hit(ctx, out, { t, gain: -27 - i, sub: false, pan: 0.3 + 0.1 * i }));
  { const s = src(ctx, noiseBuf(ctx, 'brown', 1, 33), T, END); chain(s, filt(ctx, 'bandpass', 700, 1.4), env(ctx, [[0, -120], [T, -40], [END - 0.05, -26], [END, -120]]), panner(ctx, 0.3), out); }
  // --- the SLAM: the walls of water meet (a deep wet thump), then the geyser ROARS up and rains down
  { const s = src(ctx, noiseBuf(ctx, 'brown', 2.5, 41), SLAM, SLAM + 2.4); chain(s, filt(ctx, 'lowpass', 380, 0.9), env(ctx, [[0, -120], [SLAM, -120], [SLAM + 0.03, -5], [SLAM + 0.5, -14], [SLAM + 2.3, -40]]), out); }
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4.5, 43), SLAM, dur); chain(s, filt(ctx, 'bandpass', 750, 0.6), env(ctx, [[0, -120], [SLAM, -120], [SLAM + 0.15, -12], [SLAM + 1.5, -15], [dur, -24]]), rv); }
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4.5, 47), SLAM + 1.2, dur); chain(s, filt(ctx, 'bandpass', 1600, 0.8), env(ctx, [[0, -120], [SLAM + 1.2, -120], [SLAM + 2.2, -27], [dur, -30]]), panner(ctx, 0.1), out); }   // the curtain raining back down
  whoosh(ctx, out, { t: SLAM - 0.05, dur: 0.9, gain: -15, f0: 180, f1: 1400, pan0: 0, pan1: 0.2 });
  // --- the ring wave slaps the quay alongside (right), the boats knock
  whoosh(ctx, out, { t: SLAM + 0.15, dur: 0.7, gain: -17, f0: 250, f1: 1200, pan0: 0.2, pan1: 0.55 });
  surf(ctx, out, { t0: SLAM + 0.8, t1: dur, gain: -17, period: 1.6, pan: 0.4, swell: (t) => 1 - 0.5 * sstep(4, 7, t) });
  gasp(ctx, rv, { t: T + 0.55, gain: -18, voices: 8 });
  gasp(ctx, out, { t: SLAM + 0.25, gain: -19, voices: 3 });
  // --- the fish: a wet flop into his arms, his small "whoa"
  { const s = src(ctx, noiseBuf(ctx, 'brown', 0.3, 51), CATCH - 0.01, CATCH + 0.22); chain(s, filt(ctx, 'lowpass', 900, 1.2), env(ctx, [[0, -120], [CATCH, -120], [CATCH + 0.01, -10], [CATCH + 0.18, -40]]), panner(ctx, -0.35), out); }
  for (const t of [CATCH + 0.35, CATCH + 0.7, CATCH + 1.05]) { const s = src(ctx, noiseBuf(ctx, 'brown', 0.2, 60 + t * 10), t, t + 0.12); chain(s, filt(ctx, 'lowpass', 700, 1), env(ctx, [[0, -120], [t, -120], [t + 0.01, -22], [t + 0.1, -45]]), panner(ctx, -0.35), out); }   // flapping
  gasp(ctx, out, { t: CATCH + 0.05, gain: -21, dur: 0.6, voices: 1 });
}
// a gull: a short falling cry, band-limited (no high whistle), sent to the reverb
function gull(ctx, out, t, f, pan) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.28);
  const lp = filt(ctx, 'lowpass', 1800, 0.8); o.start(t); o.stop(t + 0.32);
  chain(o, lp, env(ctx, [[0, -120], [t, -120], [t + 0.03, -33], [t + 0.25, -40], [t + 0.3, -120]]), panner(ctx, pan), out);
}
