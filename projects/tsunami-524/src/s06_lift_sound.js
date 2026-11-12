// s06_lift: thin high wind above the clouds, the hiss of spray off the lip, a tearing bass under it.
function SOUND(ctx, out, dur) {
  wind(ctx, out, { t0: 0, t1: dur, gain: -18, f: 1400 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -14, sub: 27, level: (t) => 0.8 + 0.2 * Math.sin(t * 3) });
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, 'pink', 4, 17); s.loop = true; s.start(0); s.stop(dur);
  chain(s, filt(ctx, 'highpass', 2500, 0.6), env(ctx, [[0, -120], [0.6, -24], [dur - 0.4, -22], [dur, -120]]), out);
  whoosh(ctx, out, { t: dur - 0.6, dur: 0.6, gain: -16, f0: 120, f1: 900, pan0: 0, pan1: 0 });
}
