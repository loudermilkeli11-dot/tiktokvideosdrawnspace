// s09_loop sound (dur = 1.0 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 37.0 (tau -1).
// Soft city room tone; the red car approaching from the right (engine, low); the signal's relay click at tau -0.8 (t 0.2,
// low, brown noise); the brakes bite at tau -0.3 (t 0.7): the squeal starts and RISES to the end, flowing straight into
// s01's frame-1 squeal (same band, same pan). The score lays the soft 37.0 thud on the cut. No ticks, no dings.
function SOUND(ctx, out, dur) {
  wind(ctx, out, { t0: 0, t1: dur, gain: -34, f: 500 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -29, voices: 8, excite: () => 0.25, pan: 0.1, seed: 3 });
  // engine of the approaching car (60-140 Hz hum, panned from the right to centre-right)
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(62, 0); o.frequency.linearRampToValueAtTime(70, 0.7); o.frequency.linearRampToValueAtTime(55, 1.0); o.start(0); o.stop(dur);
  const p = panner(ctx, 0.9); p.pan.linearRampToValueAtTime(0.4, 1.0);
  chain(o, filt(ctx, 'lowpass', 220, 0.7), env(ctx, [[0, -36], [0.6, -27], [0.75, -31], [1.0, -33], [dur, -40]]), p, out);
  // the signal relay: a low muffled click
  const c = src(ctx, noiseBuf(ctx, 'brown', 1, 17), 0.2, 0.3);
  chain(c, filt(ctx, 'lowpass', 600, 1.0), env(ctx, [[0.2, -120], [0.203, -24], [0.24, -120]]), panner(ctx, -0.1), out);
  // the brakes bite: the squeal begins (same voice as s01, rising into frame 1)
  const n = src(ctx, noiseBuf(ctx, 'white', 2, 41), 0.7, dur);
  const bp = filt(ctx, 'bandpass', 1900, 7), bp2 = filt(ctx, 'bandpass', 2600, 9), m = ctx.createGain(); n.connect(bp); n.connect(bp2); bp.connect(m); bp2.connect(m);
  const sq = ctx.createOscillator(); sq.type = 'sawtooth'; sq.start(0.7); sq.stop(dur);
  for (let t = 0.7; t < dur; t += 0.01) sq.frequency.linearRampToValueAtTime(1750 + 90 * Math.sin(t * 61) + 40 * Math.sin(t * 23), t);
  const og = ctx.createGain(); og.gain.value = 0.12; chain(sq, filt(ctx, 'bandpass', 1800, 4), og, m);
  chain(m, env(ctx, [[0.7, -120], [0.78, -26], [1.0, -12], [1.03, -120]]), panner(ctx, 0.35), out);
}
