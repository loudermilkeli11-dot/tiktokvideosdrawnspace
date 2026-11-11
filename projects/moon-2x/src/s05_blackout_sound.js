// s05_blackout sound (5.0 s + tail). Hit on the cut; the town's electrical hum, crackling as the grid flickers (0.5-1.2),
// then cut dead with the blackout sweep (1.2 -> 2.7); the crowd gasps at the dark; surf and a low rumble under it all.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3);
  const up = (t) => clamp(t / 5);
  hit(ctx, out, { t: 0.0, gain: -4 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  // mains hum (50 Hz + harmonics), unsteady during the flicker, choked off as the sweep crosses the town
  const T0 = 1.2, T1 = 2.7;
  for (const [f, g] of [[50, -20], [100, -22], [150, -27], [250, -31]]) {
    const o = ctx.createOscillator(); o.type = f === 50 ? 'sine' : 'sawtooth'; o.frequency.value = f; o.start(0); o.stop(T1 + 0.1);
    const e = ctx.createGain(); e.gain.setValueAtTime(0, 0); e.gain.linearRampToValueAtTime(db(g), 0.05);
    for (let t = 0.5; t < T0; t += 1 / 24) e.gain.setValueAtTime(db(g) * (hash(t * 97 + f) < 0.45 ? 0.15 : 1), t);       // flicker stutter
    e.gain.setValueAtTime(db(g), T0); e.gain.linearRampToValueAtTime(db(g) * 0.6, T1 - 0.15); e.gain.linearRampToValueAtTime(0, T1);
    chain(o, filt(ctx, 'lowpass', 900, 0.7), e, out);
  }
  // electrical crackle while it fails
  const cr = src(ctx, noiseBuf(ctx, 'white', 1, 200), 0.5, T1); const ce = ctx.createGain(); ce.gain.value = 0;
  for (let t = 0.5; t < T1; t += 0.03) ce.gain.setValueAtTime(hash(t * 51.3) < 0.3 ? db(-26) : 0, t);
  ce.gain.setValueAtTime(0, T1); chain(cr, filt(ctx, 'bandpass', 3200, 1.2), ce, panner(ctx, 0.2), out);
  // the dead thunk of the grid dropping, then the gasp
  hit(ctx, rv, { t: T1, gain: -15, sub: true });
  gasp(ctx, out, { t: T1 - 0.1, gain: -14, dur: 1.8, voices: 8 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -27, voices: 10, excite: (t) => (t < T1 ? 0.45 : 0.75), seed: 5 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -15, period: 3.3, swell: (t) => 0.6 + 0.3 * up(t) });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -16, level: (t) => 0.4 + 0.5 * up(t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -28, f: 600 });
}
