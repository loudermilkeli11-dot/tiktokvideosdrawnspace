// s11_iss sound (5.0 s + tail): cut hit, then the tearing roar of rubble skimming overhead, rising to the crane-up;
// rocks rip past right to left, deep rumble underneath, the crowd small and far.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.2, 0.3);
  hit(ctx, out, { t: 0 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  const up = (t) => clamp(t / 5);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -12, level: (t) => 0.6 + 0.4 * up(t) });
  // tearing air: two noise bands, crackle-modulated, rising in level and pitch
  for (const [f, q, gn, seed, pan] of [[900, 0.8, -15, 61, -0.3], [2600, 1.2, -19, 62, 0.3]]) {
    const s = src(ctx, noiseBuf(ctx, 'white', 4, seed), 0, dur); const bp = filt(ctx, 'bandpass', f, q); const g = ctx.createGain(); g.gain.value = 0;
    for (let t = 0; t <= dur; t += 0.04) { const cr = 0.7 + 0.3 * hash(Math.floor(t * 25) + seed); g.gain.linearRampToValueAtTime(db(gn) * (0.45 + 0.75 * up(t) ** 1.5) * cr, t); bp.frequency.linearRampToValueAtTime(f * (0.85 + 0.45 * up(t)), t); }
    chain(s, bp, g, panner(ctx, pan), out);
  }
  for (let k = 0; k < 12; k++) whoosh(ctx, out, { t: 0.1 + k * 0.4 + hash(k * 3.3) * 0.2, dur: 0.5 + 0.3 * hash(k), gain: -20 + 5 * up(k * 0.4), f0: 500, f1: 5500, pan0: 0.8, pan1: -0.8 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -21, f: 800 });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -27, voices: 10, excite: () => 0.85, seed: 5 });
  gasp(ctx, rv, { t: 0.6, gain: -20, dur: 1.4 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -24, period: 3.4, swell: 0.6 });
}
