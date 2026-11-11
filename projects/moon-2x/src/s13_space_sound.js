// s13_space: the reveal after the silent second. Big hit (score adds big_hit at 58.0), then the hush of orbit: a deep drone,
// the faint hiss of the ring, slow swells; ends clean so the loop cut lands on the hook's own hit.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.5, 0.4);
  hit(ctx, out, { t: 0, gain: -3 }); hit(ctx, rv, { t: 0, gain: -8, sub: false });
  rumble(ctx, out, { t0: 0, t1: dur - 0.3, gain: -20, sub: 30, level: (t) => 0.9 - 0.5 * clamp(t / 6) });
  wind(ctx, rv, { t0: 0.2, t1: dur - 0.3, gain: -32, f: 2400 });                       // ring hiss
  const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = 55; os.start(0.3); os.stop(dur - 0.2);
  chain(os, env(ctx, [[0.3, -120], [2.5, -28], [dur - 1.0, -30], [dur - 0.2, -120]]), out);
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 82.4; o2.start(0.8); o2.stop(dur - 0.2);
  chain(o2, filt(ctx, 'lowpass', 600, 0.7), env(ctx, [[0.8, -120], [3.5, -34], [dur - 1.0, -36], [dur - 0.2, -120]]), rv);
}
