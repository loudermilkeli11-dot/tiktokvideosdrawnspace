// s04_flood sound (5.0 s + tail). High over the rooftops: the sea roars in. Hit on the cut, heavy surf and flood roar,
// the first wave crashing over the seawall (~2.4 s) with water rushing into the streets, a distant siren, far crowd shouts.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3);
  const up = (t) => clamp(t / 5);                                // linear: the sea climbs at a constant rate
  hit(ctx, out, { t: 0.0, gain: -4 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  surf(ctx, out, { t0: 0, t1: dur, gain: -10, period: 2.6, swell: 1 });                    // heavy surf, swell 1
  surf(ctx, rv, { t0: 0, t1: dur, gain: -16, period: 3.7, swell: (t) => 0.6 + 0.4 * up(t), pan: 0.3 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -13, level: (t) => 0.55 + 0.45 * up(t) });       // flood roar underneath
  // the first wave: a rising roar as it rolls in, the crash over the seawall at 2.4, then water rushing through the streets
  whoosh(ctx, out, { t: 1.2, dur: 1.4, gain: -12, f0: 180, f1: 900, pan0: -0.2, pan1: 0.2 });
  hit(ctx, rv, { t: 2.4, gain: -16, sub: true });
  whoosh(ctx, out, { t: 2.35, dur: 2.4, gain: -13, f0: 1400, f1: 500, pan0: 0.1, pan1: -0.5 });
  whoosh(ctx, rv, { t: 2.5, dur: 2.2, gain: -16, f0: 900, f1: 350, pan0: -0.3, pan1: 0.6 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 500 });
  siren(ctx, rv, { t0: 0.0, t1: dur, gain: -30, pan: -0.5 });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -30, voices: 10, excite: (t) => 0.6 + 0.35 * up(t), seed: 4, pan: 0.2 });   // shouts, far
  gasp(ctx, rv, { t: 2.5, gain: -24, dur: 1.2, voices: 5 });
}
