// s07_after sound (4.0 s + 0.6 tail). The aftermath breathes: NEAR SILENCE (no score cues here). Soft air, a still sea far
// off, slow low drips/plops from the mud (sine plops 260-420 Hz, fast decay, quiet: no high dings), ONE distant car alarm
// (low-passed, far in the reverb), two faint gulls (band-limited glides, very low level), and a low whoosh on the tilt up into
// the sky at the end (shot 3.35 = TILT0 in s07_after.js).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 3.6, 0.45);
  wind(ctx, out, { t0: 0, t1: dur, gain: -31, f: 500 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -33, period: 7, swell: 0.2 });
  // the tail of the crane move from s06 (continuity), fading
  const w = src(ctx, noiseBuf(ctx, 'brown', 1.2, 81), 0, 1.0);
  chain(w, filt(ctx, 'lowpass', 500, 0.7), env(ctx, [[0, -24], [0.9, -120]]), out);
  // mud plops
  [[0.7, 300, 0.3], [1.55, 360, -0.4], [2.2, 270, 0.1], [2.9, 410, -0.2], [3.5, 320, 0.5]].forEach(([t, f, pan]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.09); o.start(t); o.stop(t + 0.16);
    chain(o, env(ctx, [[t, -120], [t + 0.006, -33], [t + 0.15, -120]]), panner(ctx, pan), out);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(f, t); o2.start(t); o2.stop(t + 0.16);
    chain(o2, env(ctx, [[t, -120], [t + 0.006, -38], [t + 0.15, -120]]), rv);
  });
  // one distant car alarm: two-tone square, heavily low-passed, mostly reverb
  const al = ctx.createOscillator(); al.type = 'square'; for (let t = 0.3; t < dur; t += 0.5) { al.frequency.setValueAtTime(620, t); al.frequency.setValueAtTime(470, t + 0.25); }
  al.start(0.3); al.stop(dur);
  chain(al, filt(ctx, 'lowpass', 900, 0.7), env(ctx, [[0.3, -120], [0.5, -40], [dur - 0.4, -40], [dur, -120]]), panner(ctx, -0.6), rv);
  // two faint gulls far off
  [[1.2, 0.6], [2.6, -0.5]].forEach(([t, pan]) => {
    const g = ctx.createOscillator(); g.type = 'sawtooth'; g.frequency.setValueAtTime(1150, t); g.frequency.linearRampToValueAtTime(820, t + 0.32); g.start(t); g.stop(t + 0.4);
    chain(g, filt(ctx, 'bandpass', 1000, 2.0), filt(ctx, 'lowpass', 1600, 0.7), env(ctx, [[t, -120], [t + 0.05, -40], [t + 0.36, -120]]), panner(ctx, pan), rv);
  });
  whoosh(ctx, out, { t: 3.3, dur: 0.75, gain: -20, f0: 80, f1: 600, pan0: 0, pan1: 0 });
}
