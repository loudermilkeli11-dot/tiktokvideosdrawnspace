// s08_coasts sound (4.0 s + tail). Space is score-like: low only. The cut-in hit; a low, tense swell while the oceans
// fall the last kilometre (counter racing to 0 m); then the landing at LAND = 1.01 s (= landsAt(60) - SHOT.s08_coasts.tau0
// in story.js; update it if tau0 changes): a deep planetary slam (sub drop + low thud + a mid-range crack for phones),
// and a long rolling rumble with low surf-like noise surges as the white spreads.
function SOUND(ctx, out, dur) {
  const LAND = 1.01, rv = verb(ctx, out, 4.0, 0.35);
  hit(ctx, out, { t: 0, gain: -8 }); hit(ctx, rv, { t: 0, gain: -15, sub: false });
  const sw = ctx.createOscillator(); sw.type = 'sawtooth'; sw.frequency.setValueAtTime(40, 0); sw.frequency.linearRampToValueAtTime(58, LAND); sw.start(0.05); sw.stop(LAND + 0.05);
  chain(sw, filt(ctx, 'lowpass', 150, 0.9), env(ctx, [[0.05, -120], [0.5, -30], [LAND - 0.02, -22], [LAND + 0.03, -120]]), out);
  whoosh(ctx, out, { t: LAND - 0.7, dur: 0.75, gain: -20, f0: 90, f1: 500, pan0: -0.2, pan1: 0.2 });
  hit(ctx, out, { t: LAND, gain: -8 }); hit(ctx, rv, { t: LAND, gain: -14, sub: false });
  const sb = ctx.createOscillator(); sb.frequency.setValueAtTime(70, LAND); sb.frequency.exponentialRampToValueAtTime(24, LAND + 2.2); sb.start(LAND); sb.stop(LAND + 2.6);
  chain(sb, env(ctx, [[LAND, -120], [LAND + 0.02, -11], [LAND + 2.4, -120]]), out);
  rumble(ctx, out, { t0: LAND, t1: dur, gain: -14, sub: 29, level: (t) => Math.exp(-(t - LAND) / 2.6) * sstep(LAND, LAND + 0.05, t) });
  surf(ctx, out, { t0: LAND + 0.05, t1: dur, gain: -17, period: 1.3, swell: 0.8 });
}
