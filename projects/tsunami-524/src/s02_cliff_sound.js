// s02_cliff: the impact (the big hit is in score.json), then rock roar, deep water slap and the hiss of the sheet racing up
// the slope, splintering trees; a whoosh on the whip-pan out.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.5, 0.3);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -12, sub: 31, level: (t) => 1 - 0.4 * sstep(0.5, dur, t) });
  surf(ctx, out, { t0: 0.1, t1: dur, gain: -14, period: 1.3, swell: (t) => 1 - sstep(1.5, dur, t) });
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, 'pink', 4, 13); s.loop = true; s.start(0.2); s.stop(dur);   // crest hiss
  chain(s, filt(ctx, 'highpass', 1800, 0.6), env(ctx, [[0.2, -120], [0.8, -22], [2.4, -20], [dur, -32]]), out);
  for (let k = 0; k < 7; k++) hit(ctx, rv, { t: 0.7 + k * 0.28 + hash(k) * 0.1, gain: -30, sub: false, pan: (hash(k * 3) - 0.5) });   // splintering trunks
  whoosh(ctx, out, { t: dur - 0.35, dur: 0.45, gain: -14, f0: 250, f1: 2600, pan0: 0.6, pan1: -0.6 });
}
