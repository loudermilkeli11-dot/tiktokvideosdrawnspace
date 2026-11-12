// s03_towers sound (dur = 7.0 + 0.6). Plain script: audio_core.js is prepended. t = 0 is the shot's first frame (film 15.0).
// Soft cut in (one low whoosh; NO hit: score.json owns the cuts). The Mach-1.1 roar continues from s02 (wind + rumble, low),
// deep steel groans as each tower's frame lets go, glass ribbons hissing (low-passed under 3 kHz), cladding rattles.
// Sync (groupB_towers.plazaShear, s03 shot times at which each roof lets go): 61 @0.3, 60 @0.6, 52 @0.9 (the front tower),
// 59 @1.5, 36 @2.0, 50 @2.3, 58 @2.9, 48 @3.6, 49 @4.2; a tower's floors follow every 0.42 s (0.035 e × 12).
// No ticks, nothing repeating above ~3 kHz (TASTE 11-12). Riser 1 starts at 22.0 in the score (= this shot's end).
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 3.0, 0.22);
  whoosh(ctx, out, { t: 0.0, dur: 0.9, gain: -18, f0: 160, f1: 1400, pan0: -0.6, pan1: 0.5 });
  // the roar: the air itself at 381 m/s (continuous, low; a slow swell, never a crack)
  rumble(ctx, out, { t0: 0, t1: dur, gain: -15, sub: 31, level: (t) => 0.85 + 0.15 * Math.sin(t * 0.9) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -21, f: 420 });
  wind(ctx, rv, { t0: 0, t1: dur, gain: -27, f: 900 });
  // steel groans: a low sawtooth gliding down, low-passed, one per tower in frame (louder for the near front tower 52)
  const groan = (t, g, f0, len, pan) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 0.62, t + len);
    o.start(t); o.stop(t + len + 0.1);
    const lp = filt(ctx, 'lowpass', 260, 2.5); lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(150, t + len);
    chain(o, lp, env(ctx, [[t, -120], [t + 0.25, g], [t + len * 0.7, g - 4], [t + len, -120]]), panner(ctx, pan), out);
    chain(lp, env(ctx, [[t, -120], [t + 0.3, g - 6], [t + len, -120]]), rv);
  };
  [[0.3, -24, 62, 1.6, 0.5], [0.6, -23, 55, 1.8, 0.3], [0.9, -16, 48, 2.4, -0.1], [1.5, -22, 58, 1.7, 0.2], [2.0, -25, 66, 1.4, -0.5],
   [2.3, -20, 51, 2.0, 0.0], [2.9, -22, 57, 1.8, 0.35], [3.6, -21, 46, 2.2, -0.2], [4.2, -23, 53, 1.9, 0.1]].forEach(([t, g, f, l, p]) => groan(t, g, f, l, p));
  // each released floor: a low concrete scrape (brown noise, band 90-400 Hz), 0.42 s apart for the front tower
  for (let k = 0; k < 7; k++) { const t = 0.9 + 0.42 * k;
    chain(src(ctx, noiseBuf(ctx, 'brown', 3, 40 + k), t, t + 1.2), filt(ctx, 'bandpass', 160 + 30 * (k % 3), 1.1), env(ctx, [[t, -120], [t + 0.08, -19], [t + 1.1, -120]]), panner(ctx, -0.1 + 0.08 * k), out); }
  // glass ribbons: a hiss band that thickens as the facades go (low-passed under 3 kHz)
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 33), 0, dur), filt(ctx, 'bandpass', 1500, 0.8), filt(ctx, 'lowpass', 2800, 0.7),
    env(ctx, [[0, -40], [1.2, -31], [3.5, -27], [6.0, -27], [dur, -36]]), panner(ctx, 0.25), out);
  // cladding rattles: short, low-mid, irregular (never a regular beat)
  for (let i = 0; i < 26; i++) { const t = 0.4 + 6.2 * hash(i * 3.1), g = -30 + 6 * hash(i * 7.7);
    chain(src(ctx, noiseBuf(ctx, 'white', 2, 70 + i), t, t + 0.3), filt(ctx, 'bandpass', 500 + 700 * hash(i * 1.3), 1.4), env(ctx, [[t, -120], [t + 0.01, g], [t + 0.22, -120]]), panner(ctx, -0.8 + 1.6 * hash(i * 5.3)), out); }
}
