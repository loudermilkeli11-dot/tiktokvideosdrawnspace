// s06_pier sound (5.0 s + tail). Hit on the match cut; the crowd murmurs and phone shutters click as everyone films,
// wind on the pier, gentle swell under the deck, a low rumble rising steadily. The crowd falls silent just before the cut
// (from ~4.3 s) so the score's braaam at film 28.0 lands in a held breath.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.8, 0.28);
  const up = (t) => clamp(t / 5);
  hit(ctx, out, { t: 0.0, gain: -4 }); hit(ctx, rv, { t: 0.0, gain: -12, sub: false });
  // crowd through a fader that pulls it to silence before the cut (4.1 -> 4.7 s)
  const fade = env(ctx, [[0, 0], [4.1, 0], [4.7, -120]]); fade.connect(out); const fadeR = env(ctx, [[0, 0], [4.1, 0], [4.7, -120]]); fadeR.connect(rv);
  crowd(ctx, fade, { t0: 0, t1: 4.8, gain: -23, voices: 12, seed: 7, excite: (t) => 0.35 + 0.35 * up(t) });
  crowd(ctx, fadeR, { t0: 0, t1: 4.8, gain: -30, voices: 8, seed: 8, excite: (t) => 0.3 + 0.3 * up(t) });
  shutters(ctx, out, { t0: 0.15, t1: 2.2, n: 9, gain: -25 });
  shutters(ctx, out, { t0: 2.2, t1: 3.9, n: 8, gain: -26 });
  gasp(ctx, fadeR, { t: 2.9, gain: -22, dur: 1.1, voices: 5 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -14, level: (t) => 0.3 + 0.7 * up(t) });          // rising steadily
  wind(ctx, out, { t0: 0, t1: dur, gain: -23, f: 650 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -17, period: 3.4, swell: (t) => 0.2 + 0.3 * up(t) });
  flutter(ctx, out, { t: 0.5, dur: 2.2, gain: -31, pan0: -0.6, pan1: 0.7 });
}
