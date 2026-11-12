// s06_hills sound (4.5 s + 0.6 tail). The score carries the 22.0 hit (braaam + impact): no hit() here (no snap, no ring).
// The ground flowing: a low, continuous grinding that swells with the flow speed flowV(tau) = 9 (1 - e^(-tau/2.5)) m/s
// (story.js FLOW_V = 9, tau = shot time here: SHOT.s06_hills.tau0 = 0); far muffled tree/house groans (brown noise < 500 Hz,
// no cracks); soft surf; a low whoosh on the crane up into s07 (shot 3.9 s).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.2, 0.3);
  const fv = (t) => 1 - Math.exp(-Math.max(t, 0) / 2.5);                                   // flowV / FLOW_V
  // the deep groan of the whole hillside letting go (under the score's braaam)
  const g = ctx.createOscillator(); g.type = 'sawtooth'; g.frequency.setValueAtTime(34, 0); g.frequency.linearRampToValueAtTime(27, 3.0); g.start(0); g.stop(dur);
  chain(g, filt(ctx, 'lowpass', 110, 0.8), env(ctx, [[0, -120], [0.15, -22], [2.5, -26], [dur, -40]]), out);
  rumble(ctx, out, { t0: 0, t1: dur, gain: -13, sub: 30, level: (t) => 0.35 + 0.65 * fv(t) });
  // grinding soil: brown noise, low-passed, slow amplitude churn; a pink layer at ~250 Hz for the scrape
  const b = src(ctx, noiseBuf(ctx, 'brown', dur, 61), 0, dur);
  chain(b, filt(ctx, 'lowpass', 420, 0.7), env(ctx, [[0, -120], [0.4, -30], [1.5, -22], [3.0, -17], [4.3, -16], [dur, -30]]), panner(ctx, -0.15), out);
  const p = src(ctx, noiseBuf(ctx, 'pink', dur, 62), 0, dur);
  chain(p, filt(ctx, 'bandpass', 260, 1.1), filt(ctx, 'lowpass', 700, 0.7), env(ctx, [[0, -120], [0.8, -40], [2.5, -30], [4.3, -27], [dur, -40]]), panner(ctx, 0.2), out);
  // far groans of trees and houses going with it: muffled thumps (no cracks)
  [[1.4, -0.5, -26], [2.3, 0.4, -24], [3.1, -0.2, -23], [3.7, 0.6, -25]].forEach(([t, pan, gdb], i) => {
    const s = src(ctx, noiseBuf(ctx, 'brown', 0.9, 70 + i), t, t + 0.9);
    chain(s, filt(ctx, 'lowpass', 380, 1.4), env(ctx, [[t, -120], [t + 0.04, gdb], [t + 0.85, -120]]), panner(ctx, pan), rv);
  });
  surf(ctx, out, { t0: 0, t1: dur, gain: -26, period: 5.5, swell: 0.3 });
  whoosh(ctx, out, { t: 3.9, dur: 0.75, gain: -19, f0: 90, f1: 700, pan0: -0.2, pan1: 0.3 });
}
