// s02_today sound (5.0 s + 0.6 s tail). The rewind to TODAY: cut hit + a reversed "rewind" whoosh (high -> low) over the
// counter spin-back, then a calm dusk bay: slow small surf, gulls crossing, the far town's low hum, a few murmurs on the pier.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.6, 0.22);
  hit(ctx, out, { t: 0.0, gain: -6 }); hit(ctx, rv, { t: 0.0, gain: -14, sub: false });           // cut on the counter rewind
  whoosh(ctx, out, { t: 0.0, dur: 0.22, gain: -12, f0: 4200, f1: 380, pan0: 0.5, pan1: -0.5 });   // reversed swell: high -> low
  whoosh(ctx, rv, { t: 0.02, dur: 0.3, gain: -18, f0: 3000, f1: 300, pan0: -0.3, pan1: 0.3 });
  surf(ctx, out, { t0: 0.05, t1: dur, gain: -19, period: 5.2, swell: 0.05 });                     // calm: long period, small
  surf(ctx, rv, { t0: 0.05, t1: dur, gain: -26, period: 6.8, swell: 0.0, pan: 0.3 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -30, f: 260 });                                           // far town hum, low
  wind(ctx, rv, { t0: 0, t1: dur, gain: -34, f: 520 });
  crowd(ctx, rv, { t0: 0.3, t1: dur, gain: -36, voices: 4, excite: () => 0.08, seed: 6 });         // a few far voices on the pier
  flutter(ctx, out, { t: 0.9, dur: 2.6, gain: -30, pan0: 0.7, pan1: -0.7 });                       // gulls crossing right -> left
  // gull calls: two short falling cries, filtered so they sit far away
  for (const [t, p] of [[1.35, 0.4], [2.2, -0.1], [2.55, -0.3]]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.start(t); o.stop(t + 0.45);
    o.frequency.setValueAtTime(1850, t); o.frequency.linearRampToValueAtTime(2300, t + 0.05); o.frequency.exponentialRampToValueAtTime(1150, t + 0.38);
    chain(o, filt(ctx, 'bandpass', 1900, 3), env(ctx, [[t, -120], [t + 0.03, -36], [t + 0.2, -40], [t + 0.42, -120]]), panner(ctx, p), rv);
  }
}
