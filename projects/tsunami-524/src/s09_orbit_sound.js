// s09_orbit: near silence (a breath of drone that dies away before the loop hit).
function SOUND(ctx, out, dur) {
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 41; d.start(0); d.stop(dur);
  chain(d, env(ctx, [[0, -120], [0.3, -40], [dur - 0.4, -120]]), out);
}
