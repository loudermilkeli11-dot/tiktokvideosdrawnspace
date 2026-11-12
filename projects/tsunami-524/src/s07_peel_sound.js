// s07_peel: space is silent: score only (riser 2 is in score.json). A low planetary groan under it.
function SOUND(ctx, out, dur) {
  const g = ctx.createOscillator(); g.type = 'sawtooth'; g.frequency.setValueAtTime(44, 0); g.frequency.linearRampToValueAtTime(58, 3.5); g.start(0.05); g.stop(dur);
  chain(g, filt(ctx, 'lowpass', 160, 0.8), env(ctx, [[0.05, -120], [0.8, -30], [3.4, -24], [dur, -120]]), out);
}
