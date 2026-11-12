// s03_wall: a freight-train roar growing as the wall comes in, one boat horn, splintering wood as the lighthouse goes (3.0 film
// = 2.0 here), spray slapping the lens at the end.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -10, sub: 33, level: (t) => 0.5 + 0.5 * sstep(0, dur, t) });
  surf(ctx, out, { t0: 0, t1: dur, gain: -16, period: 0.9, swell: (t) => sstep(0, dur, t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -22, f: 500 });
  const h = ctx.createOscillator(); h.type = 'sawtooth'; h.frequency.value = 196; h.start(0.5); h.stop(1.6);                   // a boat horn
  chain(h, filt(ctx, 'lowpass', 900, 0.8), env(ctx, [[0.5, -120], [0.6, -26], [1.4, -27], [1.6, -120]]), panner(ctx, 0.4), rv);
  for (let k = 0; k < 5; k++) hit(ctx, rv, { t: 1.9 + k * 0.12, gain: -24, sub: false, pan: 0.3 });
  whoosh(ctx, out, { t: dur - 0.4, dur: 0.4, gain: -12, f0: 400, f1: 4000, pan0: -0.7, pan1: 0.7 });
}
