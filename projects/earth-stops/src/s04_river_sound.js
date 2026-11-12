// s04_river sound (dur = 7.0 + 0.6). Plain script: audio_core.js is prepended. t = 0 = film 22.0. Soft cut in (one low
// whoosh); the HIT 1 cut at 29.0 (this shot's end) and riser 1 (22.0 -> 29.0) live in score.json, so this bed only builds.
// The roar at its thickest, the upwind river: gravel and shingle rattles across the stereo field left -> right, paper flutter,
// tumbling cars (low thuds) and the deck of tower floors passing behind the plaza (a long low scrape).
// Sync: the cars cross the frame centre at shot times CROSS = [0.8, 2.1, 3.3, 4.4, 5.6, 6.5] (s04_river.js).
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 3.0, 0.22);
  whoosh(ctx, out, { t: 0.0, dur: 0.8, gain: -18, f0: 140, f1: 1200, pan0: -0.6, pan1: 0.6 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -13, sub: 30, level: (t) => 0.8 + 0.2 * sstep(0, 7, t) });
  wind(ctx, out, { t0: 0, t1: dur, gain: -19, f: 380 });
  wind(ctx, rv, { t0: 0, t1: dur, gain: -26, f: 800 });
  // paper and leaves: a soft rustle band (NOT audio_core's flutter: its 55 ms clicks sit above 2.5 kHz)
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 88), 0.3, dur), filt(ctx, 'bandpass', 1100, 0.7), filt(ctx, 'lowpass', 2400, 0.7), env(ctx, [[0.3, -120], [1.2, -32], [dur, -30]]), panner(ctx, -0.2), out);
  // the river: grit and shingles skidding across the plaza, a band of rattles that pans left -> right in waves
  for (let w = 0; w < 5; w++) { const t = 0.2 + 1.35 * w;
    const s = src(ctx, noiseBuf(ctx, 'white', 3, 90 + w), t, t + 2.2), p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + 2.1);
    chain(s, filt(ctx, 'bandpass', 700 + 120 * w, 1.0), filt(ctx, 'lowpass', 2600, 0.7), env(ctx, [[t, -120], [t + 0.5, -27], [t + 1.6, -28], [t + 2.2, -120]]), p, out); }
  // tumbling cars: two soft low thuds each as a car rolls past (no mid-range snap: those belong to the cuts)
  [0.8, 2.1, 3.3, 4.4, 5.6, 6.5].forEach((tc, k) => { for (let j = 0; j < 2; j++) { const t = tc - 0.25 + 0.45 * j, g = -17 - 3 * j;
    chain(src(ctx, noiseBuf(ctx, 'brown', 2, 120 + k * 2 + j), t, t + 0.5), filt(ctx, 'lowpass', 180, 0.8), env(ctx, [[t, -120], [t + 0.015, g], [t + 0.4, -120]]), panner(ctx, -0.5 + 0.9 * j), out);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.3); o.start(t); o.stop(t + 0.4);
    chain(o, env(ctx, [[t, -120], [t + 0.01, g - 4], [t + 0.35, -120]]), out); } });
  // the deck of floors sliding behind the plaza: a long concrete scrape, slowly rising
  chain(src(ctx, noiseBuf(ctx, 'brown', 5, 140), 0.5, dur), filt(ctx, 'bandpass', 210, 0.9), env(ctx, [[0.5, -120], [2.0, -24], [6.8, -20], [dur, -26]]), panner(ctx, 0.1), out);
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 141), 0, dur), filt(ctx, 'bandpass', 1400, 0.8), filt(ctx, 'lowpass', 2800, 0.7), env(ctx, [[0, -36], [7, -29]]), panner(ctx, 0.3), rv);
}
