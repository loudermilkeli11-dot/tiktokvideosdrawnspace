// s04_quay sound (4.5 s + 0.6 s tail). The whip settles (low whoosh); metal rushing down the asphalt grows; a run of low water slams as
// the stream leaves the quay (one every ~0.3 s: arrivals from story.js slopeTimeTo + coastTime + fallTime, spaced 4-8 m on the street);
// THE BUS slam at T_BUS; the muddy sheet rushing at the lens (T_WIPE) closes the shot. No ticks, no cracks: all energy < ~1.2 kHz.
// Sync (story.js): T_BUS = T_EDGE + fallTime(V_EDGE, 2, 0) - tau0 = 22.69 + 0.64 - 20 = 3.33 s. T_WIPE = 3.55 s (s04_quay.js ?tw default).
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-4); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 2.2, 0.2), T_BUS = 3.33, T_WIPE = 3.55;
  whoosh(ctx, out, { t: 0.0, dur: 0.45, gain: -17, f0: 140, f1: 700, pan0: 0, pan1: 0 });                       // the whip settling
  surf(ctx, out, { t0: 0, t1: dur, gain: -24, period: 2.4, swell: 0.3, pan: 0.2 });                              // harbour lapping on our hull
  // metal and plastic rushing down 400 m of asphalt at 120+ km/h: a dense low roar (no tyre squeal: no grip)
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 41), 0, dur), filt(ctx, 'bandpass', 420, 0.8), env(ctx, [[0, -120], [0.15, -26], [2.5, -21], [3.9, -20], [4.5, -30], [dur, -120]]), panner(ctx, -0.15), out);
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 42), 0, dur), filt(ctx, 'bandpass', 900, 1.2), env(ctx, [[0, -120], [0.2, -34], [3.9, -29], [4.5, -40]]), panner(ctx, -0.2), out);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -17, sub: 34, level: (t) => 0.6 + 0.4 * sstep(0, 3.3, t) });
  // the stream of water slams: low thump + a lowpassed water burst each
  const slam = (t, g, pan, big) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(big ? 70 : 90, t); o.frequency.exponentialRampToValueAtTime(big ? 28 : 40, t + (big ? 0.9 : 0.3)); o.start(t); o.stop(t + 1.2);
    chain(o, env(ctx, [[t, -120], [t + 0.01, g], [t + (big ? 0.9 : 0.3), -120]]), panner(ctx, pan), out);
    chain(src(ctx, noiseBuf(ctx, 'brown', 2, 50 + Math.floor(t * 10)), t, t + (big ? 2.2 : 0.8)), filt(ctx, 'lowpass', big ? 1100 : 800, 0.7), env(ctx, [[t, -120], [t + 0.012, g + 2], [t + 0.25, g - 8], [t + (big ? 2.0 : 0.7), -120]]), panner(ctx, pan), out);
    chain(src(ctx, noiseBuf(ctx, 'pink', 2, 60 + Math.floor(t * 10)), t + 0.05, t + 1.4), filt(ctx, 'lowpass', 1200, 0.7), env(ctx, [[t + 0.05, -120], [t + 0.2, g - 10], [t + 1.3, -120]]), rv);   // water falling back
  };
  for (let k = 0, t = 0.12; t < 4.3; k++, t += 0.24 + 0.22 * hash(k * 3.1)) if (Math.abs(t - T_BUS) > 0.2) slam(t, -22 + 5 * hash(k * 1.7), -0.35 + 0.3 * (hash(k * 5.3) - 0.5), false);
  slam(T_BUS, -7, -0.1, true);                                                                                     // THE BUS (126 km/h)
  slam(T_WIPE, -13, 0.1, false);
  // the muddy sheet thrown at the lens: a wet rush closing in, cut by the edit
  chain(src(ctx, noiseBuf(ctx, 'pink', 2, 71), T_WIPE + 0.1, dur), filt(ctx, 'lowpass', 1100, 0.7), env(ctx, [[T_WIPE + 0.1, -120], [4.1, -24], [4.45, -13], [4.5, -16], [dur, -120]]), out);
  chain(src(ctx, noiseBuf(ctx, 'brown', 2, 72), T_WIPE + 0.2, dur), filt(ctx, 'lowpass', 500, 0.7), env(ctx, [[T_WIPE + 0.2, -120], [4.4, -15], [4.5, -18], [dur, -120]]), out);
}
