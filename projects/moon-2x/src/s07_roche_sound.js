// s07_roche: the braaam (score, 28.0) + hit; at the Roche crossing (0.96 s) the Moon groans: deep stone cracking,
// crackle bursts that multiply as the fractures spread; the crowd's gasp turns to shouting; rumble at full.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.6, 0.35);
  hit(ctx, out, { t: 0, gain: -3 }); hit(ctx, rv, { t: 0, gain: -10, sub: false });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -12, level: (t) => 0.8 + 0.2 * clamp(t / 5) });
  surf(ctx, out, { t0: 0, t1: dur, gain: -16, period: 2.4, swell: 1 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -22, voices: 14, excite: (t) => 0.6 + 0.4 * clamp((t - 1) / 3) });
  gasp(ctx, out, { t: 1.15, gain: -11, dur: 1.6, voices: 9 });
  // stone groan: low detuned saws through a slowly opening lowpass
  for (const f of [41, 43.5, 61.7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.start(0.9); o.stop(dur);
    const lp = filt(ctx, 'lowpass', 120, 2); lp.frequency.setValueAtTime(120, 0.9); lp.frequency.linearRampToValueAtTime(700, dur);
    chain(o, lp, env(ctx, [[0.9, -120], [1.3, -20], [dur, -16]]), rv); }
  // crackles: short band-passed noise ticks, density growing with the cracks (mid-range, phone-audible)
  for (let k = 0; k < 120; k++) { const u = k / 120, t = 0.96 + (dur - 1.0) * Math.pow(u, 0.75) + hash(k) * 0.05;
    const s = src(ctx, noiseBuf(ctx, 'white', 1, 300 + (k % 7)), t, t + 0.06);
    chain(s, filt(ctx, 'bandpass', 900 + hash(k * 3) * 2600, 3), env(ctx, [[t, -120], [t + 0.002, -24 + 6 * u], [t + 0.05, -120]]), panner(ctx, (hash(k * 7) - 0.5) * 1.4), rv); }
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 500 });
}
