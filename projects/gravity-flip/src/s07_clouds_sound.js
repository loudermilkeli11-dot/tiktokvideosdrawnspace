// s07_clouds sound (5.0 s + 0.6 tail): cut hit; a thin, high wind 13 km up; pigeons flapping; far-off cries from the crowd
// falling up around us; then the jet: a turbofan scream rising from below, roaring past at 2.4 s (Doppler drop: we and the
// air fall together, the jet flies through that air at ~100 m/s) and wobbling as it tumbles away upward.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.4, 0.22), PASS = 2.4, V = 100, D0 = 58, C = 343;
  hit(ctx, out, { t: 0, gain: -7 });
  // thin high-altitude wind: two narrow high bands, slow gusts
  wind(ctx, out, { t0: 0, t1: dur, gain: -23, f: 2600 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -27, f: 5200 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -26, level: (t) => 0.5 + 0.5 * Math.exp(-((t - PASS) ** 2) / 0.6), sub: 38 });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -33, voices: 8, excite: () => 0.9, seed: 7, pan: -0.2 });
  flutter(ctx, out, { t: 0.3, dur: 2.2, gain: -27, pan0: -0.7, pan1: 0.1 });
  // the jet: distance, radial speed -> level and Doppler factor
  const dist = (t) => Math.hypot(D0, V * (t - PASS)), vr = (t) => (V * V * (t - PASS)) / dist(t), dop = (t) => C / (C + vr(t));
  const lvl = (t) => Math.min(1, D0 / dist(t)) * sstep(-0.2, 0.8, t), wob = (t) => 0.72 + 0.28 * Math.sin(t * 4.7 + Math.sin(t * 1.9) * 2);   // tumbling: the intake swings to and from us
  const pan = (t) => clamp(0.15 + 0.012 * V * (t - PASS) / 10, -0.6, 0.7);
  const P = panner(ctx, 0); P.connect(out); const Pv = ctx.createGain(); Pv.gain.value = 0.35; P.connect(Pv); Pv.connect(rv);
  const parts = [];
  // fan whine: two blade-pass tones
  for (const [f, g] of [[2150, -19], [3240, -25]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.start(0); o.stop(dur); const bp = filt(ctx, 'bandpass', f, 6); const G = ctx.createGain(); G.gain.value = 0; chain(o, bp, G, P); parts.push({ f, g, o, bp, G }); }
  // buzz-saw (supersonic fan tips) and the broadband roar
  const bz = ctx.createOscillator(); bz.type = 'sawtooth'; bz.start(0); bz.stop(dur); const bzF = filt(ctx, 'bandpass', 420, 1.2), bzG = ctx.createGain(); bzG.gain.value = 0; chain(bz, bzF, bzG, P);
  const ns = src(ctx, noiseBuf(ctx, 'pink', 4, 707), 0, dur), nF = filt(ctx, 'lowpass', 1400, 0.6), nG = ctx.createGain(); nG.gain.value = 0; chain(ns, nF, nG, P);
  const hs = src(ctx, noiseBuf(ctx, 'white', 4, 708), 0, dur), hF = filt(ctx, 'bandpass', 3000, 0.9), hG = ctx.createGain(); hG.gain.value = 0; chain(hs, hF, hG, P);
  for (let t = 0; t <= dur; t += 0.02) {
    const k = dop(t), L = lvl(t), w = wob(t);
    for (const p of parts) { p.o.frequency.linearRampToValueAtTime(p.f * k, t); p.bp.frequency.linearRampToValueAtTime(p.f * k, t); p.G.gain.linearRampToValueAtTime(db(p.g) * L * w, t); }
    bz.frequency.linearRampToValueAtTime(140 * k, t); bzF.frequency.linearRampToValueAtTime(420 * k, t); bzG.gain.linearRampToValueAtTime(db(-21) * L * (0.6 + 0.4 * w), t);
    nF.frequency.linearRampToValueAtTime(900 + 2200 * L * k, t); nG.gain.linearRampToValueAtTime(db(-9) * Math.pow(L, 1.15), t);
    hF.frequency.linearRampToValueAtTime(3000 * k, t); hG.gain.linearRampToValueAtTime(db(-20) * L * L * w, t);
    P.pan.linearRampToValueAtTime(pan(t), t);
  }
  whoosh(ctx, out, { t: PASS - 0.45, dur: 0.9, gain: -11, f0: 250, f1: 2600, pan0: -0.2, pan1: 0.6 });
}
