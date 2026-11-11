// s05_crash sound (3.0 s + 0.6 s tail). The cut hit; the falling sea's roar swells over 1.09 s, ducks for a breath, then the
// slam lands EXACTLY at the impact: T_IMP = landsAt(5) - SHOT.s05_crash.tau0 = 17.09 - 16 = 1.09 s (story.js; keep in sync):
// the loudest hit of the film (deep boom + mid-range crack + a white-water burst), then the tsunami roar, debris, a car alarm.
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-6); bus.connect(out); out = bus;              // headroom: the slam peaks under 0 dBFS
  const T_IMP = 1.09, rv = verb(ctx, out, 3.0, 0.32);
  hit(ctx, out, { t: 0.0, gain: -10 }); hit(ctx, rv, { t: 0.0, gain: -20, sub: false });             // the cut
  // the sea falling: a rising roar (pink noise, band sweeping up) + rush of air, ducking just before the slam
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4, 41), 0, T_IMP + 0.02); const bp = filt(ctx, 'bandpass', 220, 0.8);
    bp.frequency.setValueAtTime(220, 0); bp.frequency.exponentialRampToValueAtTime(1500, T_IMP - 0.06);
    chain(s, bp, env(ctx, [[0, -120], [0.1, -30], [T_IMP - 0.12, -15], [T_IMP - 0.035, -17], [T_IMP - 0.005, -60], [T_IMP + 0.01, -120]]), out); }
  rumble(ctx, out, { t0: 0, t1: T_IMP, gain: -18, level: (t) => 0.2 + 0.8 * sstep(0, T_IMP, t), sub: 30 });
  wind(ctx, out, { t0: 0, t1: T_IMP, gain: -30, f: 900 });
  // THE SLAM (mid-range crack per A3 + deep boom + white-water burst)
  hit(ctx, out, { t: T_IMP, gain: -4 }); hit(ctx, rv, { t: T_IMP, gain: -11, sub: false });
  { const b = ctx.createOscillator(); b.frequency.setValueAtTime(70, T_IMP); b.frequency.exponentialRampToValueAtTime(26, T_IMP + 1.4); b.start(T_IMP); b.stop(T_IMP + 1.8);
    chain(b, env(ctx, [[T_IMP, -120], [T_IMP + 0.012, -6], [T_IMP + 0.5, -15], [T_IMP + 1.7, -120]]), out); }
  { const s = src(ctx, noiseBuf(ctx, 'white', 3, 52), T_IMP, dur); const lp = filt(ctx, 'lowpass', 6000, 0.5);
    lp.frequency.setValueAtTime(7000, T_IMP); lp.frequency.exponentialRampToValueAtTime(900, T_IMP + 1.6);
    chain(s, lp, env(ctx, [[T_IMP, -120], [T_IMP + 0.006, -9], [T_IMP + 0.25, -16], [T_IMP + 1.2, -23], [dur, -29]]), out);
    chain(src(ctx, noiseBuf(ctx, 'white', 3, 53), T_IMP, dur), filt(ctx, 'highpass', 2500, 0.7), env(ctx, [[T_IMP, -120], [T_IMP + 0.3, -20], [dur, -30]]), rv); }   // spray hiss
  // the tsunami: huge surf roar + rumble pouring toward us
  surf(ctx, out, { t0: T_IMP, t1: dur, gain: -13, period: 1.6, swell: 1 });
  surf(ctx, rv, { t0: T_IMP, t1: dur, gain: -15, period: 2.2, swell: 1, pan: -0.3 });
  rumble(ctx, out, { t0: T_IMP, t1: dur, gain: -15, level: (t) => 1 - 0.35 * sstep(T_IMP, dur, t), sub: 34 });
  // debris: wood and metal knocks, glass, a boat hull grinding past
  for (let k = 0; k < 14; k++) { const t = T_IMP + 0.35 + hash(k * 7.1) * (dur - T_IMP - 0.6), g = -24 + 8 * hash(k * 2.3), f = 250 + 1800 * hash(k * 5.9);
    chain(src(ctx, noiseBuf(ctx, 'white', 1, 70 + k), t, t + 0.25), filt(ctx, 'bandpass', f, 3), env(ctx, [[t, -120], [t + 0.004, g], [t + 0.12, g - 20], [t + 0.22, -120]]), panner(ctx, (hash(k * 3.7) - 0.5) * 1.6), out); }
  for (let k = 0; k < 4; k++) { const t = T_IMP + 0.9 + k * 0.37 + hash(k) * 0.1;                       // glass
    chain(src(ctx, noiseBuf(ctx, 'white', 1, 90 + k), t, t + 0.4), filt(ctx, 'highpass', 4500, 1), env(ctx, [[t, -120], [t + 0.003, -27], [t + 0.3, -120]]), panner(ctx, (hash(k * 9.1) - 0.5) * 1.4), rv); }
  { const t = T_IMP + 1.0, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t + 0.9); o.start(t); o.stop(t + 1.0);   // hull grinding
    chain(o, filt(ctx, 'bandpass', 600, 2), env(ctx, [[t, -120], [t + 0.1, -26], [t + 0.8, -30], [t + 1.0, -120]]), panner(ctx, 0.4), out); }
  // a car alarm somewhere in the flooded streets (no people)
  { const t0 = T_IMP + 1.3, o = ctx.createOscillator(); o.type = 'square'; o.start(t0); o.stop(dur);
    for (let t = t0; t < dur; t += 0.12) o.frequency.setValueAtTime(Math.floor((t - t0) / 0.12) % 2 ? 1250 : 980, t);
    chain(o, filt(ctx, 'bandpass', 1100, 3), env(ctx, [[t0, -120], [t0 + 0.05, -33], [dur, -34]]), panner(ctx, -0.6), rv); }
}
