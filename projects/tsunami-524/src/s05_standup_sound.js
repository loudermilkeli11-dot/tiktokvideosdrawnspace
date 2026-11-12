// s05_standup: the braaam at the cut is in score.json. The drained bay: dripping hush, then a roar that grows as the wall
// stands up over the mountains, deep rumble, a low groan of water rising.
function SOUND(ctx, out, dur) {
  rumble(ctx, out, { t0: 0, t1: dur, gain: -11, sub: 29, level: (t) => 0.4 + 0.6 * sstep(0, dur, t) });
  surf(ctx, out, { t0: 0.3, t1: dur, gain: -20, period: 2.2, swell: (t) => sstep(0.5, dur, t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -26, f: 400 });
  const g = ctx.createOscillator(); g.type = 'sawtooth'; g.frequency.setValueAtTime(55, 0); g.frequency.linearRampToValueAtTime(41, dur); g.start(0.2); g.stop(dur);
  chain(g, filt(ctx, 'lowpass', 180, 0.8), env(ctx, [[0.2, -120], [1.2, -26], [dur - 0.2, -18], [dur, -120]]), out);
  whoosh(ctx, out, { t: dur - 0.5, dur: 0.55, gain: -14, f0: 150, f1: 1200, pan0: 0, pan1: 0 });
}
