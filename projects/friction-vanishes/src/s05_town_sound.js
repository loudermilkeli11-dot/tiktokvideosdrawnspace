// s05_town sound (4.5 s + 0.6 s tail). The wide roar of a town draining into its bay: a low, continuous grind of metal and debris on
// stone, the bay churning, distant water slams (one every ~0.2-0.5 s: ~90 water entries during the shot from the s05 slide tables),
// the tail of the muddy wipe dripping off the lens at the start. It keeps building to the cut: the 22.0 hit (grip back) is the score's
// braaam + impact on the hard cut, so this bed must NOT end in its own hit; it just stops dead at 4.5 s. No ticks, no cracks.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.0, 0.3), END = 4.5;
  // the wipe's tail: heavy drops falling off the lens (low, wet)
  chain(src(ctx, noiseBuf(ctx, 'brown', 2, 81), 0, 0.6), filt(ctx, 'lowpass', 900, 0.7), env(ctx, [[0, -14], [0.15, -22], [0.5, -120]]), out);
  // the bay: churned surf, wide
  surf(ctx, out, { t0: 0, t1: END, gain: -17, period: 1.9, swell: 0.6, pan: -0.3 });
  surf(ctx, rv, { t0: 0, t1: END, gain: -21, period: 2.7, swell: 0.6, pan: 0.3 });
  // the town draining: far roar of metal and debris grinding down the streets, building to the cut
  chain(src(ctx, noiseBuf(ctx, 'brown', 4, 82), 0, END), filt(ctx, 'bandpass', 300, 0.7), env(ctx, [[0, -120], [0.3, -24], [END - 0.02, -16], [END, -120]]), panner(ctx, 0.25), out);
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 83), 0, END), filt(ctx, 'bandpass', 650, 1.0), env(ctx, [[0, -120], [0.4, -34], [END - 0.02, -26], [END, -120]]), panner(ctx, 0.3), rv);
  rumble(ctx, out, { t0: 0, t1: END, gain: -16, sub: 32, level: (t) => 0.55 + 0.45 * sstep(0, END, t) });
  wind(ctx, out, { t0: 0, t1: END, gain: -32, f: 450 });
  // distant water slams across the bay (low, soft, spread wide)
  for (let k = 0, t = 0.25; t < END - 0.15; k++, t += 0.18 + 0.32 * hash(k * 2.9)) {
    const g = -30 + 8 * hash(k * 1.3), pan = (hash(k * 4.1) - 0.3) * 1.2;
    chain(src(ctx, noiseBuf(ctx, 'brown', 1, 90 + k), t, t + 0.7), filt(ctx, 'lowpass', 600, 0.7), env(ctx, [[t, -120], [t + 0.02, g], [t + 0.5, -120]]), panner(ctx, pan), rv);
  }
}
