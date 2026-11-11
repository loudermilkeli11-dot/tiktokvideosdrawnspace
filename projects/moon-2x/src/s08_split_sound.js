// s08_split: braaam (score, 33.0) + hit; the Moon tearing: huge low grinding, rock-on-rock crunches, a rising roar of
// rubble; the crowd far below; ends with a close whoosh for the fragment wipe.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.0, 0.38);
  hit(ctx, out, { t: 0, gain: -3 }); hit(ctx, rv, { t: 0, gain: -10, sub: false });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -10, level: () => 1 });
  for (const f of [36.7, 38.9, 55.0]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, 0); o.frequency.linearRampToValueAtTime(f * 0.85, dur); o.start(0); o.stop(dur);
    const lp = filt(ctx, 'lowpass', 300, 1.5); chain(o, lp, env(ctx, [[0, -120], [0.3, -19], [dur, -15]]), rv); }
  for (let k = 0; k < 26; k++) { const t = 0.2 + k * 0.17 + hash(k) * 0.1; const s = src(ctx, noiseBuf(ctx, 'brown', 2, 400 + k), t, t + 0.5);
    chain(s, filt(ctx, 'bandpass', 220 + hash(k * 5) * 500, 1.2), env(ctx, [[t, -120], [t + 0.01, -14], [t + 0.4, -120]]), panner(ctx, (hash(k * 3) - 0.5) * 1.6), rv); }
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -27, voices: 12, excite: () => 0.95 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -20, f: 650 });
  whoosh(ctx, out, { t: dur - 0.5, dur: 0.45, gain: -6, f0: 200, f1: 2600, pan0: 0.8, pan1: -0.8 });
}
