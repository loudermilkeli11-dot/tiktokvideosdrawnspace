// s02_street sound (dur = 7.0 + 0.6). t = shot time; film = 8.0 + t. The soft cut at 8.0 (from s01) carries only s01's
// low whoosh, so nothing new hits at t 0. The shock roar is continuous (Mach 1.1 flow: a roar, NOT a crack).
// Sync (s02_street.js): shop window i bursts at e ≈ 0.62 + 0.42·i/7 (left -> right as the camera tracks), film = 1 + 12·e,
// shot t = film - 8 -> t ≈ 0.44 .. 5.5. The tilt-up runs t 5.0 -> 7.0; one low whoosh into the 15.0 soft cut.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.4, 0.2);
  // the roar (continuing from s01 at the same body level)
  rumble(ctx, out, { t0: 0, t1: dur, gain: -11, sub: 33, level: (t) => 0.9 + 0.1 * Math.sin(t * 1.1) });
  chain(src(ctx, noiseBuf(ctx, 'brown', 6, 147), 0, dur), filt(ctx, 'lowpass', 600, 0.6), env(ctx, [[0, -12], [5, -11], [dur - 0.4, -12], [dur, -15]]), out);
  wind(ctx, out, { t0: 0, t1: dur, gain: -19, f: 600 });
  // street-level rattle and scrape: denser than s01, panning left -> right
  chain(src(ctx, noiseBuf(ctx, 'pink', 5, 149), 0, dur), filt(ctx, 'bandpass', 1000, 0.8), filt(ctx, 'lowpass', 2000, 0.7), env(ctx, [[0, -23], [dur, -24]]), panner(ctx, 0), out);
  for (let i = 0; i < 12; i++) { const t0 = 0.2 + i * 0.55 + hash(i * 2.9) * 0.25, d = 0.6 + hash(i + 4) * 0.5, f = 450 + hash(i * 4.3) * 800;
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.9, t0); p.pan.linearRampToValueAtTime(0.9, t0 + d);
    chain(src(ctx, noiseBuf(ctx, 'pink', 3, 160 + i), t0, t0 + d + 0.1), filt(ctx, 'bandpass', f, 2.5), filt(ctx, 'lowpass', 2200, 0.7),
      env(ctx, [[t0, -120], [t0 + 0.06, -25 - 4 * hash(i * 7)], [t0 + d, -120]]), p, out); }
  // the shop windows bursting (low-passed: a heavy crunch, not a bright tinkle)
  for (let i = 0; i < 8; i++) { const t0 = 1 + 12 * (0.62 + 0.42 * i / 7) - 8;
    chain(src(ctx, noiseBuf(ctx, 'white', 2, 180 + i), t0, t0 + 0.8), filt(ctx, 'bandpass', 1400, 0.9), filt(ctx, 'lowpass', 2800, 0.7),
      env(ctx, [[t0, -120], [t0 + 0.01, -24], [t0 + 0.12, -30], [t0 + 0.6, -120]]), panner(ctx, -0.6 + 0.17 * i), out);
    chain(src(ctx, noiseBuf(ctx, 'brown', 2, 190 + i), t0, t0 + 0.5), filt(ctx, 'lowpass', 300, 0.7), env(ctx, [[t0, -120], [t0 + 0.01, -20], [t0 + 0.35, -120]]), out);
    chain(src(ctx, noiseBuf(ctx, 'white', 2, 200 + i), t0, t0 + 1.2), filt(ctx, 'bandpass', 1800, 1.2), filt(ctx, 'lowpass', 2600, 0.7), env(ctx, [[t0, -120], [t0 + 0.02, -34], [t0 + 1.0, -120]]), rv); }
  // a car alarm smeared in the wind (two tones, low-passed, wobbling with the gusts), passing left -> right
  { const o = ctx.createOscillator(); o.type = 'square'; const t0 = 1.2, t1 = 5.6; o.start(t0); o.stop(t1);
    for (let t = t0; t < t1; t += 0.25) o.frequency.setValueAtTime(Math.floor((t - t0) / 0.25) % 2 ? 620 : 830, t);
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.8, t0); p.pan.linearRampToValueAtTime(0.8, t1);
    const g = ctx.createGain(); g.gain.value = 0; for (let t = t0; t < t1; t += 0.1) g.gain.linearRampToValueAtTime(db(-36) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3.1 + Math.sin(t * 1.7)))) * sstep(t0, t0 + 0.6, t) * (1 - sstep(t1 - 0.8, t1, t)), t);
    chain(o, filt(ctx, 'lowpass', 1500, 0.7), g, p, out); }
  // the soft cut at 15.0 -> s03: one low whoosh as the camera tilts up (f1 <= 2000, gain <= -16)
  whoosh(ctx, out, { t: 6.5, dur: 0.9, gain: -18, f0: 160, f1: 1400, pan0: -0.4, pan1: 0.4 });
}
