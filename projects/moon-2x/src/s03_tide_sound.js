// s03_tide sound (5.0 s + 0.6 s tail). Rung 1: the cut hit, then the surf swells hard and climbs toward us (swell 0.3 -> 1,
// constant rate like the picture), the pier crowd's murmur rises to a gasp at 2.5 s, loose boats creak and knock, gulls lift
// off, and a whoosh carries the whip-pan right at the end.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.8, 0.26);
  const up = (t) => clamp(t / 5);
  hit(ctx, out, { t: 0.0, gain: -5 }); hit(ctx, rv, { t: 0.0, gain: -13, sub: false });          // cut on rung 1
  surf(ctx, out, { t0: 0, t1: dur, gain: -14, period: 3.4, swell: (t) => 0.3 + 0.7 * up(t) });     // the surf swelling hard
  surf(ctx, rv, { t0: 0, t1: dur, gain: -20, period: 2.6, swell: (t) => 0.3 + 0.7 * up(t), pan: -0.4 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -22, level: (t) => 0.2 + 0.6 * up(t) });                // the sea's weight under it
  wind(ctx, out, { t0: 0, t1: dur, gain: -28, f: 520 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -26, voices: 10, excite: (t) => 0.25 + 0.6 * up(t), pan: 0.45 });   // the pier crowd (right)
  crowd(ctx, rv, { t0: 0, t1: dur, gain: -31, voices: 6, excite: (t) => 0.2 + 0.5 * up(t), pan: 0.3, seed: 4 });
  gasp(ctx, out, { t: 2.45, gain: -17, dur: 1.4 });                                                  // boats snap loose: "whoa"
  shutters(ctx, out, { t0: 0.6, t1: 4.4, n: 6, gain: -30 });
  flutter(ctx, out, { t: 0.7, dur: 2.2, gain: -31, pan0: 0.6, pan1: -0.6 });                        // gulls lifting off
  // boats creaking / knocking as they break loose: short resonant filtered-noise bursts, denser as the swell grows
  for (let k = 0; k < 16; k++) {
    const t = 1.1 + 3.6 * (k / 16) + hash(k * 3.3) * 0.18, f = 260 + 520 * hash(k * 7.1), g = -27 - 6 * hash(k * 5.7) + 4 * up(t);
    const s = src(ctx, noiseBuf(ctx, 'white', 1, 140 + k), t, t + 0.25);
    chain(s, filt(ctx, 'bandpass', f, 14), env(ctx, [[t, -120], [t + 0.012, g], [t + 0.07, g - 9], [t + 0.22, -120]]), panner(ctx, (hash(k * 2.1) - 0.5) * 1.2), k % 3 ? out : rv);
  }
  whoosh(ctx, out, { t: dur - 0.6 - 0.42, dur: 0.48, gain: -10, f0: 350, f1: 3600, pan0: -0.7, pan1: 0.8 });   // the whip-pan right
}
