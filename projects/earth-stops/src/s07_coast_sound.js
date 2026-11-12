// s07_coast sound (dur = 8.5 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 43.5 (HIT 2: the cut hit and
// riser 2 (43.5 -> 52.0) are in score.json). From orbit there is no air to carry the roar, so the bed is felt, not heard:
// a deep planetary rumble under the riser, a far filtered roar like surf heard through a wall, swelling as the surge line
// pushes inland, and silence on top (no wind hiss, nothing above ~1.5 kHz). Ends under the HIT 3 cut at 52.0.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.2, 0.25);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -18, sub: 29, level: (t) => 0.6 + 0.4 * sstep(0, 8.5, t) });
  // the far roar of the surge along the whole coast: surf block, slowed and low-passed
  const lp = filt(ctx, 'lowpass', 520, 0.6); lp.connect(out);
  surf(ctx, lp, { t0: 0.2, t1: dur, gain: -21, period: 7.5, swell: (t) => 0.5 + 0.5 * sstep(0, 8, t), pan: -0.25 });
  chain(src(ctx, noiseBuf(ctx, 'brown', 6, 211), 0, dur), filt(ctx, 'bandpass', 95, 0.7), env(ctx, [[0, -32], [4, -27], [8.4, -24], [dur, -30]]), rv);
}
