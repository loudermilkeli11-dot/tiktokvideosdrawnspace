// s09_loop sound (dur = 1.0 + 0.6 s). Plain script (audio_core.js is prepended): t / t0 / t1 in shot seconds, gain in dB.
// Hit 4 (the soft loop thud at 37.0) is in score.json. 37.0-38.0 = plaza room tone only, and the low beam hum restarting so the
// loop lands on s01's frame-1 sound: s01 opens with the crowd at -24, the fountain at -36 and the hum at -22 / -32 (62 / 124 Hz).
function SOUND(ctx, out, dur) {
  const END = 1.0;                                                     // shot length: s09_loop dur in src/story.js
  crowd(ctx, out, { t0: 0, t1: dur, gain: -24, voices: 10, excite: () => 0.2, seed: 3 });
  { const n = src(ctx, noiseBuf(ctx, 'pink', 3, 11), 0, dur); chain(n, filt(ctx, 'bandpass', 900, 0.5), filt(ctx, 'lowpass', 3000), env(ctx, [[0, -36], [dur, -36]]), panner(ctx, -0.5), out); }
  // the hum restarts: from silence to s01's level by the loop point
  for (const [f, g] of [[62, -22], [124, -32]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, 0); o.start(0); o.stop(dur);
    chain(o, env(ctx, [[0, -120], [0.35, -70], [END, g], [dur, g]]), out); }
}
