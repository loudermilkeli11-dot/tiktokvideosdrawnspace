// s01_bay: noon bay. Gulls burst off the pier, the crowd gasps and murmurs, gentle surf, a far rock-roar rising under the
// countdown (the stone crack at 0.0 and the ticks are in score.json).
function SOUND(ctx, out, dur) {
  surf(ctx, out, { t0: 0, t1: dur, gain: -22, period: 4.5 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -30 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -22, voices: 10, excite: (t) => 0.5 + 0.4 * t / dur });
  gasp(ctx, out, { t: 0.05, gain: -16, dur: 1.2 });
  flutter(ctx, out, { t: 0.0, dur: 1.4, gain: -22, pan0: -0.5, pan1: -0.9 });
  shutters(ctx, out, { t0: 0.2, t1: dur, n: 5, gain: -28 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -20, sub: 30, level: (t) => 0.3 + 0.7 * t / dur });
}
