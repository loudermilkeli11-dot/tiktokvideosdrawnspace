// s01_plaza sound (dur = 8.0 + 0.6). Plain script (audio_core.js is prepended). t = shot time = film time (s01 starts at 0).
// Sync: T_STOP = 1.0 s (story.js: the ground stops at film 1.0). The boom + snap at 1.0 live in score.json (impacts/cracks),
// so this file has NO hit there: the plaza bed is cut under the boom and the low roar takes over.
// 0-1.0: the pre-stop bed (crowd murmur, fountain, distant traffic). s09_loop_sound.js plays the SAME bed at the SAME levels.
// 1.0-8.6: Mach 1.1 roar (low, continuous, no crack), rattles and scrapes moving left -> right (east), low-passed glass,
// a low whoosh into the 8.0 soft cut. Nothing above ~3 kHz repeats; no ticks.
function SOUND(ctx, out, dur) {
  const T_STOP = 1.0;
  const rv = verb(ctx, out, 2.4, 0.2);
  // ---- the pre-stop bed (identical in s09) ----
  crowd(ctx, out, { t0: 0, t1: T_STOP + 0.03, gain: -23, voices: 10, excite: () => 0.25, seed: 4 });
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 41), 0, T_STOP + 0.05), filt(ctx, 'bandpass', 1100, 0.5), filt(ctx, 'lowpass', 2600, 0.7), env(ctx, [[0, -31], [T_STOP, -31], [T_STOP + 0.05, -120]]), panner(ctx, 0.1), out);   // fountain
  chain(src(ctx, noiseBuf(ctx, 'brown', 5, 43), 0, T_STOP + 0.05), filt(ctx, 'lowpass', 420, 0.6), env(ctx, [[0, -27], [T_STOP, -27], [T_STOP + 0.05, -120]]), out);                                   // distant traffic
  // ---- the stop: the roar ----
  rumble(ctx, out, { t0: T_STOP, t1: dur, gain: -11, sub: 33, level: (t) => sstep(T_STOP, T_STOP + 0.25, t) * (0.85 + 0.15 * Math.sin(t * 1.3)) });
  chain(src(ctx, noiseBuf(ctx, 'brown', 6, 47), T_STOP, dur), filt(ctx, 'lowpass', 520, 0.6),
    env(ctx, [[T_STOP, -120], [T_STOP + 0.2, -12], [3, -13], [dur - 0.3, -12], [dur, -16]]), out);                                    // body of the roar
  wind(ctx, out, { t0: T_STOP + 0.1, t1: dur, gain: -20, f: 520 });
  chain(src(ctx, noiseBuf(ctx, 'pink', 5, 49), T_STOP, dur), filt(ctx, 'bandpass', 900, 0.8), filt(ctx, 'lowpass', 1800, 0.7),
    env(ctx, [[T_STOP, -120], [T_STOP + 0.4, -26], [5, -24], [dur, -25]]), panner(ctx, -0.3), out);                                  // rattle/scrape bed
  // scrapes and rattles crossing left -> right (benches, signs, umbrellas skidding east); deterministic times
  for (let i = 0; i < 9; i++) { const t0 = 1.6 + i * 0.72 + hash(i * 3.3) * 0.3, d = 0.9 + hash(i) * 0.6, f = 500 + hash(i * 5.1) * 700;
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.8, t0); p.pan.linearRampToValueAtTime(0.8, t0 + d);
    chain(src(ctx, noiseBuf(ctx, 'pink', 3, 60 + i), t0, t0 + d + 0.1), filt(ctx, 'bandpass', f, 2.5), filt(ctx, 'lowpass', 2200, 0.7),
      env(ctx, [[t0, -120], [t0 + 0.08, -27 - 4 * hash(i * 9)], [t0 + d, -120]]), p, out); }
  // glass: low-passed shatters off the north facades (t from groupA_plaza: panes go at e 0.01-0.26 -> film 1.1-4.1)
  for (let i = 0; i < 5; i++) { const t0 = 1.3 + i * 0.65 + hash(i * 7.7) * 0.2;
    chain(src(ctx, noiseBuf(ctx, 'white', 2, 80 + i), t0, t0 + 0.7), filt(ctx, 'highpass', 900, 0.7), filt(ctx, 'lowpass', 2800, 0.7),
      env(ctx, [[t0, -120], [t0 + 0.01, -30], [t0 + 0.5, -120]]), panner(ctx, -0.4 + 0.2 * i), rv); }
  // the soft cut at 8.0 -> s02: one low whoosh (f1 <= 2000, gain <= -16)
  whoosh(ctx, out, { t: 7.55, dur: 0.9, gain: -18, f0: 180, f1: 1500, pan0: -0.6, pan1: 0.6 });
}
