// s04_seaup sound (2.0 s + 0.6 s tail). The weightless apex: the cut hit at 0, then near silence (score is ~-57 dB at
// shot 0.5-1.9). Only a thin high wind through the empty bay and one distant metal creak from the pier's lamp post.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.2, 0.3);
  const duck = env(ctx, [[0, 0], [0.28, 0], [0.46, -120]]); duck.connect(out);                     // the cut (the only hit), choked
  hit(ctx, duck, { t: 0.0, gain: -9, sub: false });                                                  // by 0.46 s: the apex is silent
  // the hit's own air dies away; a faint high wind remains (no surf: the sea is overhead)
  const w = src(ctx, noiseBuf(ctx, 'pink', 4, 31), 0, dur); const bp = filt(ctx, 'bandpass', 2400, 0.9);
  chain(w, bp, env(ctx, [[0, -120], [0.15, -46], [0.5, -54], [1.9, -55], [dur, -58]]), panner(ctx, 0.3), out);
  // one distant metal creak (stick-slip pulses through a resonant band), far right, mostly reverb
  const t0 = 1.15, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t0); o.frequency.linearRampToValueAtTime(118, t0 + 0.42); o.start(t0); o.stop(t0 + 0.5);
  const am = ctx.createGain(); am.gain.value = 0;
  for (let k = 0; k < 20; k++) { const tk = t0 + k * 0.021 + hash(k * 3.3) * 0.008; am.gain.setValueAtTime(0.25 + 0.75 * hash(k * 1.7), tk); am.gain.setTargetAtTime(0.0, tk + 0.004, 0.006); }
  chain(o, filt(ctx, 'bandpass', 1350, 6), am, env(ctx, [[t0, -120], [t0 + 0.05, -50], [t0 + 0.35, -52], [t0 + 0.48, -120]]), panner(ctx, 0.55), rv);
}
