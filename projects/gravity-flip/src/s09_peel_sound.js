// s09_peel sound (6.5 s + tail). Space is score-like: low sounds only. The cut-in hit, then a deep planetary groan rising
// while the oceans and the air peel off (time-lapse) and a low riser into the cut to the station (3.5 s, a second hit);
// then the slow-motion hush: a low drone and a soft, low whoosh as the plane drifts up past the station (~5.2 s).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.0, 0.35);
  hit(ctx, out, { t: 0 }); hit(ctx, rv, { t: 0, gain: -12, sub: false });
  rumble(ctx, out, { t0: 0, t1: 3.6, gain: -13, sub: 30, level: (t) => 0.35 + 0.65 * sstep(0, 3.2, t) });
  const g = ctx.createOscillator(); g.type = 'sawtooth'; g.frequency.setValueAtTime(48, 0); g.frequency.linearRampToValueAtTime(37, 3.5); g.start(0.1); g.stop(3.6);
  chain(g, filt(ctx, 'lowpass', 170, 0.8), env(ctx, [[0.1, -120], [1.0, -27], [3.3, -20], [3.55, -120]]), out);
  whoosh(ctx, out, { t: 2.5, dur: 1.0, gain: -19, f0: 110, f1: 650, pan0: -0.3, pan1: 0.3 });
  hit(ctx, out, { t: 3.5, gain: -7 }); hit(ctx, rv, { t: 3.5, gain: -14, sub: false });
  rumble(ctx, out, { t0: 3.5, t1: dur, gain: -22, sub: 32, level: (t) => 1 - 0.6 * sstep(5.6, dur, t) });
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 55; d.start(3.6); d.stop(dur);
  chain(d, env(ctx, [[3.6, -120], [4.2, -30], [6.2, -31], [dur - 0.1, -120]]), out);
  const d2 = ctx.createOscillator(); d2.type = 'triangle'; d2.frequency.value = 82.4; d2.start(3.8); d2.stop(dur);
  chain(d2, filt(ctx, 'lowpass', 500, 0.7), env(ctx, [[3.8, -120], [4.6, -36], [6.4, -38], [dur - 0.1, -120]]), rv);
  whoosh(ctx, out, { t: 4.6, dur: 1.3, gain: -20, f0: 80, f1: 400, pan0: 0.5, pan1: -0.5 });
}
