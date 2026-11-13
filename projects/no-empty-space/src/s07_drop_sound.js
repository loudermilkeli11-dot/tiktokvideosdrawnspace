// s07_drop sound (dur = 6.0 + 0.6 s). Plain script: audio_core.js is prepended. t = 0 is the shot's first frame (film 37.0).
// No cut hit (37.0 is a soft push, not in HARD_CUTS) and no squeeze boom. Rock cracking, the cave-in, splashes, the sea
// pouring into the breach, the rumble sinking with the grain.
// Sync (groupB_fx.js CAVE, s07_drop.js): CAVE0 = CAVE.T_CAVE - 37.0 = 0.2 ; SLUMP = CAVE0 + 0.3 * CAVE.DUR = 1.34 ;
//                                        FLOOD = CAVE0 + 0.62 * CAVE.DUR = 2.56 ; END = CAVE0 + CAVE.DUR = 4.0.
const CAVE0 = 0.2, SLUMP = 1.34, FLOOD = 2.56, END = 4.0;
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 3.2, 0.3);
  // the last of the dust wind from s06, the sea around our boat
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 550 });
  surf(ctx, out, { t0: 0, t1: dur, gain: -25, period: 4.2, pan: -0.2 });
  // the ground: a deep groan that falls as the grain sinks, and the rumble of the hill letting go
  { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(52, 0); o.frequency.exponentialRampToValueAtTime(24, dur); o.start(0); o.stop(dur);
    chain(o, env(ctx, [[0, -26], [CAVE0 + 0.5, -16], [END, -18], [dur, -40]]), out); }
  rumble(ctx, out, { t0: 0, t1: dur, gain: -13, sub: 32, level: (t) => 0.3 + 0.7 * sstep(CAVE0, SLUMP, t) * (1 - 0.6 * sstep(END, dur, t)) });
  // the cracks running out across the plateau: low snaps and splits (mid-range, no ticks)
  [0.3, 0.55, 0.72, 0.95, 1.2, 1.5, 1.9].forEach((t, i) => hit(ctx, rv, { t, gain: -20 - (i % 3) * 2, sub: i % 2 === 0, pan: -0.5 + 0.17 * i }));
  for (let i = 0; i < 5; i++) { const t = 0.35 + i * 0.3, s = src(ctx, noiseBuf(ctx, 'brown', 0.6, 200 + i), t, t + 0.5);
    chain(s, filt(ctx, 'bandpass', 380 + 90 * i, 1.6), env(ctx, [[0, -120], [t, -120], [t + 0.02, -18], [t + 0.45, -40]]), panner(ctx, -0.4 + 0.2 * i), out); }
  // the cave-in: the wedge slumps out, a long tearing roar of rock and dust
  { const s = src(ctx, noiseBuf(ctx, 'brown', 4, 211), SLUMP - 0.1, dur); chain(s, filt(ctx, 'lowpass', 420, 0.8), env(ctx, [[0, -120], [SLUMP - 0.1, -120], [SLUMP + 0.3, -8], [END, -12], [dur, -26]]), out); }
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4, 213), SLUMP, dur); chain(s, filt(ctx, 'bandpass', 900, 0.8), env(ctx, [[0, -120], [SLUMP, -120], [SLUMP + 0.4, -20], [END, -22], [dur, -34]]), rv); }   // rock rattle
  // rocks hitting the sea: heavy wet thumps + splashes, staggered (deterministic)
  for (let i = 0; i < 16; i++) { const t = 1.7 + i * 0.26 + 0.12 * Math.sin(i * 4.1), g = -16 - (i % 4) * 2.5, p = -0.5 + ((i * 0.37) % 1);
    const s = src(ctx, noiseBuf(ctx, 'brown', 0.6, 230 + i), t, t + 0.5); chain(s, filt(ctx, 'lowpass', 600, 1), env(ctx, [[0, -120], [t, -120], [t + 0.015, g], [t + 0.4, -45]]), panner(ctx, p), out);
    const w = src(ctx, noiseBuf(ctx, 'pink', 1.2, 260 + i), t + 0.03, t + 1.1); chain(w, filt(ctx, 'bandpass', 1300, 0.7), env(ctx, [[0, -120], [t + 0.03, -120], [t + 0.12, g - 8], [t + 1.0, -50]]), panner(ctx, p), rv); }
  // the sea pours into the notch: a rising, sustained wash
  { const s = src(ctx, noiseBuf(ctx, 'pink', 4.5, 290), FLOOD - 0.2, dur); chain(s, filt(ctx, 'bandpass', 650, 0.6), env(ctx, [[0, -120], [FLOOD - 0.2, -120], [FLOOD + 0.6, -13], [dur, -17]]), out); }
  whoosh(ctx, out, { t: FLOOD - 0.1, dur: 1.2, gain: -17, f0: 200, f1: 1100, pan0: 0.3, pan1: -0.1 });
  // the people in the boat nearby
  gasp(ctx, rv, { t: 0.6, gain: -24, voices: 3 });
  gasp(ctx, rv, { t: SLUMP + 0.2, gain: -22, voices: 3 });
}
