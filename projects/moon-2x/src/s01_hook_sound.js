// s01_hook sound (3.0 s + tail). Mid-chaos: the frame-0 hit, the sea swelling, the crowd rising to a gasp, a rumble that grows.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.8, 0.28);
  const up = (t) => clamp(t / 3);                               // linear, matches the picture's steady approach
  hit(ctx, out, { t: 0.0, gain: -4 }); hit(ctx, rv, { t: 0.0, gain: -10, sub: false });   // frame-0 hit (mid-range + sub)
  surf(ctx, out, { t0: 0, t1: dur, gain: -13, period: 3.1, swell: (t) => 0.3 + 0.7 * up(t) });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -15, level: (t) => 0.35 + 0.65 * up(t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -26 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -24, voices: 12, excite: (t) => 0.35 + 0.55 * up(t) });
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -30, voices: 8, excite: (t) => 0.3 + 0.5 * up(t), seed: 2 });
  gasp(ctx, out, { t: 1.6, gain: -15, dur: 1.5 });
  shutters(ctx, out, { t0: 0.2, t1: 2.8, n: 7, gain: -27 });
  flutter(ctx, out, { t: 0.4, dur: 2.4, gain: -30, pan0: -0.8, pan1: 0.5 });
  siren(ctx, rv, { t0: 0.3, t1: dur, gain: -34 });
}
