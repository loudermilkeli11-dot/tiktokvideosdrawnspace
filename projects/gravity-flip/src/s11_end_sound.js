// s11_end sound (3.0 s + tail). The returning shell lands on the cut: the hit, a deep slam and a low, long settle;
// then it thins out to silence well before the end card's last frame, so the loop's own hit on frame 1 lands in quiet.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.5, 0.4);
  hit(ctx, out, { t: 0, gain: -7 }); hit(ctx, rv, { t: 0, gain: -12, sub: false });
  const sb = ctx.createOscillator(); sb.frequency.setValueAtTime(64, 0); sb.frequency.exponentialRampToValueAtTime(22, 2.0); sb.start(0); sb.stop(2.3);
  chain(sb, env(ctx, [[0, -120], [0.02, -9], [2.1, -120]]), out);
  rumble(ctx, out, { t0: 0, t1: 2.2, gain: -15, sub: 28, level: (t) => Math.exp(-t / 0.8) });
  const d = ctx.createOscillator(); d.type = 'sine'; d.frequency.value = 49; d.start(0.3); d.stop(2.0);
  chain(d, env(ctx, [[0.3, -120], [0.8, -32], [1.9, -120]]), rv);
}
