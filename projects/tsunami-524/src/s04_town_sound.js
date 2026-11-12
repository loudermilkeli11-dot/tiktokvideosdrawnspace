// s04_town sound (film 7.5–12.5; dur = 5.0 + 0.6). t = 0 is the shot's first frame. Times from story.js:
// T.roofs 9.0 -> 1.5 s (deep thud as the wave tops the roofs), T.x2 10.5–11.1 -> 3.0–3.6 s (swell + rock groan, rising).
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.8, 0.25);
  const bus = ctx.createGain(); bus.gain.value = db(-4); bus.connect(out);
  const ROOFS = 1.5, X2 = 3.0;
  // the freight-train roar of the wall approaching, then smothered as the water passes over (muffled below)
  const roar = src(ctx, noiseBuf(ctx, 'brown', 6, 41), 0, dur);
  chain(roar, filt(ctx, 'lowpass', 900, 0.6), env(ctx, [[0, -16], [ROOFS - 0.1, -8], [ROOFS + 0.3, -22], [dur, -26]]), bus);
  const hiss = src(ctx, noiseBuf(ctx, 'pink', 6, 42), 0, dur);
  chain(hiss, filt(ctx, 'bandpass', 2600, 0.8), env(ctx, [[0, -30], [ROOFS - 0.1, -20], [ROOFS + 0.15, -60], [dur, -70]]), bus);
  // car alarms in the street, drowned at the roofs
  for (let i = 0; i < 2; i++) { const o = ctx.createOscillator(); o.type = 'square';
    const f = o.frequency; for (let k = 0; k < 12; k++) f.setValueAtTime(k % 2 ? 1250 + 90 * i : 950 + 70 * i, 0.12 * k + 0.05 * i);
    o.start(0); o.stop(ROOFS + 0.2);
    chain(o, filt(ctx, 'bandpass', 1100, 1.2), env(ctx, [[0, -46], [0.3, -40], [ROOFS - 0.05, -38], [ROOFS + 0.1, -120]]), panner(ctx, i ? 0.5 : -0.4), rv); }
  // the thud as it tops the roofs (a mid-range hit so it reads on phones)
  hit(ctx, bus, { t: ROOFS, gain: -7, sub: true, pan: 0 });
  rumble(ctx, bus, { t0: ROOFS - 0.2, t1: dur, gain: -14, sub: 30, level: (t) => sstep(ROOFS - 0.2, ROOFS + 0.2, t) * (0.7 + 0.3 * sstep(X2, X2 + 0.6, t)) });
  // muffled underwater tone while the camera rises out of it
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 62; o.start(ROOFS); o.stop(dur);
  chain(o, env(ctx, [[ROOFS, -120], [ROOFS + 0.2, -24], [ROOFS + 1.6, -34], [dur, -50]]), bus);
  // the x2 swell and a rock groan, rising into the cut at 12.5 s
  whoosh(ctx, rv, { t: 1.2, dur: 1.2, gain: -20, f0: 180, f1: 900, pan0: -0.3, pan1: 0.3 });
  const groan = ctx.createOscillator(); groan.type = 'sawtooth'; groan.frequency.setValueAtTime(48, X2); groan.frequency.linearRampToValueAtTime(70, dur); groan.start(X2 - 0.2); groan.stop(dur);
  chain(groan, filt(ctx, 'lowpass', 300, 1.5), env(ctx, [[X2 - 0.2, -120], [X2 + 0.4, -30], [dur - 0.6, -22], [dur, -40]]), bus);
  surf(ctx, bus, { t0: X2 - 0.5, t1: dur, gain: -20, period: 2.2, swell: (t) => sstep(X2, dur - 0.5, t) });
}
