// s10_return sound (4.5 s + tail): the return. Score-like and low: the cut-in hit, then a rising roar (filtered noise
// opening up and swelling), a deep rumble climbing underneath, and low crackle as thousands of streaks pile in. It peaks
// at the very end; the impact itself is s11's opening hit.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.5, 0.3);
  hit(ctx, out, { t: 0, gain: -7 }); hit(ctx, rv, { t: 0, gain: -14, sub: false });
  const up = (t) => clamp(t / 4.45);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -12, sub: 31, level: (t) => (0.35 + 0.65 * up(t) ** 1.6) * (t > 4.5 ? Math.max(0, 1 - (t - 4.5) / 0.5) : 1) });
  for (const [f, q, gn, seed, pan] of [[220, 0.7, -14, 71, -0.25], [520, 0.9, -19, 72, 0.25]]) {
    const s = src(ctx, noiseBuf(ctx, 'pink', 5, seed), 0, dur); const lp = filt(ctx, 'lowpass', f, q); const g = ctx.createGain(); g.gain.value = 0;
    for (let t = 0; t <= dur; t += 0.05) { const u = up(t), cr = 0.8 + 0.2 * hash(Math.floor(t * 18) + seed), end = t > 4.5 ? Math.max(0, 1 - (t - 4.5) / 0.4) : 1;
      g.gain.linearRampToValueAtTime(db(gn) * (0.15 + 0.95 * u ** 1.8) * cr * end, t); lp.frequency.linearRampToValueAtTime(f * (0.7 + 2.2 * u ** 1.5), t); }
    chain(s, lp, g, panner(ctx, pan), out);
  }
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(36, 0); o.frequency.linearRampToValueAtTime(52, 4.45); o.start(0.2); o.stop(dur);
  chain(o, filt(ctx, 'lowpass', 160, 0.9), env(ctx, [[0.2, -120], [1.5, -30], [4.4, -18], [4.6, -120]]), out);
  for (let k = 0; k < 7; k++) whoosh(ctx, out, { t: 1.2 + k * 0.45 + hash(k * 5.1) * 0.2, dur: 0.6, gain: -24 + 1.2 * k, f0: 90, f1: 380, pan0: (hash(k) - 0.5) * 1.4, pan1: (hash(k + 9) - 0.5) * 1.4 });
}
