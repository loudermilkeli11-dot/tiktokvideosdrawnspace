// s07_strato sound (dur = 4.5 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Riser 2 (22.5 -> 31.5) and hit 3 (31.5) are in score.json: no cut hit here. Nothing repeating above ~3 kHz.
// GROWS = [0.0, 2.2]: SHOT.s07_strato.grows in src/story.js (6.3 -> 20 km, 20 -> 63 km; GROW_S = 0.8 s each).
// The hum drops an octave at each grow (board: "the hum drops an octave at each strato grow").
function SOUND(ctx, out, dur) {
  const G1 = 0.0, G2 = 2.2, GS = 0.8;
  const rv = verb(ctx, out, 3.6, 0.25);
  // thin high-altitude wind, the climb's rush tailing off as we slow near 70 km
  wind(ctx, out, { t0: 0, t1: dur, gain: -26, f: 420 });
  { const n = src(ctx, noiseBuf(ctx, 'pink', 6, 71), 0, dur);
    chain(n, filt(ctx, 'bandpass', 300, 0.6), filt(ctx, 'lowpass', 1800), env(ctx, [[0, -22], [0.8, -28], [dur - 0.6, -36], [dur, -44]]), out); }
  // the climb carried over from s06: a low whoosh trailing off
  whoosh(ctx, out, { t: 0, dur: 0.8, gain: -20, f0: 160, f1: 700, pan0: 0.2, pan1: -0.2 });
  // the beam hum drops at each grow: 55 -> 41 -> 30 Hz (with its 110 -> 82 -> 60 Hz harmonic): about an octave over the shot
  { const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(55, 0); o.frequency.exponentialRampToValueAtTime(41, G1 + GS); o.frequency.setValueAtTime(41, G2); o.frequency.exponentialRampToValueAtTime(30, G2 + GS);
    o.start(0); o.stop(dur); chain(o, env(ctx, [[0, -20], [dur - 0.4, -18], [dur, -120]]), out);
    const h = ctx.createOscillator(); h.type = 'triangle';
    h.frequency.setValueAtTime(110, 0); h.frequency.exponentialRampToValueAtTime(82, G1 + GS); h.frequency.setValueAtTime(82, G2); h.frequency.exponentialRampToValueAtTime(60, G2 + GS);
    h.start(0); h.stop(dur); chain(h, filt(ctx, 'lowpass', 300), env(ctx, [[0, -30], [dur - 0.4, -27], [dur, -120]]), out); }
  // lens-grow swells (40-120 Hz, 0.8 s) at each grow
  for (const [g, i] of [[G1, 0], [G2, 1]]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(40, g); o.frequency.exponentialRampToValueAtTime(100, g + GS);
    o.start(g); o.stop(g + 1.7); chain(o, filt(ctx, 'lowpass', 170), env(ctx, [[g, -60], [g + 0.55, -12 + 2 * i], [g + 0.85, -15], [g + 1.6, -120]]), out);
    const n = src(ctx, noiseBuf(ctx, 'brown', 3, 73 + i), g, g + 1.7);
    chain(n, filt(ctx, 'lowpass', 110), env(ctx, [[g, -60], [g + 0.6, -17 + 2 * i], [g + 1.6, -120]]), out);
    chain(n, filt(ctx, 'lowpass', 90), env(ctx, [[g, -60], [g + 0.7, -26], [g + 1.6, -120]]), rv);
  }
  // the scar burning far below: a deep roar that thickens as the beam widens
  rumble(ctx, out, { t0: 0, t1: dur, gain: -24, sub: 32, level: (t) => 0.5 + 0.25 * sstep(0, 0.8, t) + 0.25 * sstep(G2, G2 + GS, t) });
  // low crackle of the burning line, low-passed at 4 kHz, irregular
  { const n = src(ctx, noiseBuf(ctx, 'white', 6, 79), 0, dur);
    chain(n, filt(ctx, 'lowpass', 4000), filt(ctx, 'highpass', 700), env(ctx, [[0, -48], [G2, -44], [G2 + GS, -38], [dur - 0.3, -40], [dur, -120]]), out); }
}
