// s09_loop sound (dur = 1.5 + 0.6). The plaza's pre-stop bed, the SAME blocks, seeds and levels as s01_plaza_sound.js
// 0-1.0, so the loop back to s01 frame 0 is seamless. The hit-4 thud at 63.5 lives in score.json (no hit here).
function SOUND(ctx, out, dur) {
  verb(ctx, out, 2.4, 0.2);
  crowd(ctx, out, { t0: 0, t1: dur, gain: -23, voices: 10, excite: () => 0.25, seed: 4 });
  chain(src(ctx, noiseBuf(ctx, 'pink', 4, 41), 0, dur), filt(ctx, 'bandpass', 1100, 0.5), filt(ctx, 'lowpass', 2600, 0.7), env(ctx, [[0, -31], [dur, -31]]), panner(ctx, 0.1), out);   // fountain
  chain(src(ctx, noiseBuf(ctx, 'brown', 5, 43), 0, dur), filt(ctx, 'lowpass', 420, 0.6), env(ctx, [[0, -27], [dur, -27]]), out);                                                     // distant traffic
}
