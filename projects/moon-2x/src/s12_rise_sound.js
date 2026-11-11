// s12_rise: hit at 0; the roar of entry overhead and a rising wind as the camera climbs; rocks rip past;
// everything stops dead at 4.0 s (film 57.0): the silent second (the score and assemble.sh enforce digital silence).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3), CUT = 3.98;
  hit(ctx, out, { t: 0, gain: -4 });
  rumble(ctx, out, { t0: 0, t1: CUT, gain: -11, level: (t) => 0.7 + 0.3 * clamp(t / CUT) });
  wind(ctx, out, { t0: 0, t1: CUT, gain: -17, f: 900 });
  const s = src(ctx, noiseBuf(ctx, 'pink', 4, 501), 0, CUT); const bp = filt(ctx, 'bandpass', 400, 0.8);
  bp.frequency.setValueAtTime(400, 0); bp.frequency.exponentialRampToValueAtTime(3200, CUT); chain(s, bp, env(ctx, [[0, -120], [0.5, -20], [CUT - 0.02, -10], [CUT, -120]]), out);
  for (let k = 0; k < 9; k++) { const t = 0.6 + k * 0.36 + hash(k) * 0.12; if (t > CUT - 0.4) break; whoosh(ctx, out, { t, dur: 0.35, gain: -10, f0: 300, f1: 3500, pan0: hash(k) > 0.5 ? -0.9 : 0.9, pan1: hash(k) > 0.5 ? 0.9 : -0.9 }); }
  crowd(ctx, out, { t0: 0, t1: 1.6, gain: -22, voices: 10, excite: () => 1 });
}
