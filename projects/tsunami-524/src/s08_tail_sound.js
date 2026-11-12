// s08_tail: the riser has dropped to a single sub tone (score.json); a faint, fading drone.
function SOUND(ctx, out, dur) {
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 55; d.start(0); d.stop(dur);
  chain(d, env(ctx, [[0, -120], [0.4, -30], [dur, -120]]), out);
}
