// s11_moon sound (dur = 5.0 + 0.6). Plain script (audio_core.js is prepended). t = 0 is film 61.0.
// Near silence: s10's low tone carried on as a faint pad that thins out and is gone by 65.5 (t 4.5), ahead of the end card's
// silence (66.0-69.0).
const T_GONE = 4.5;    // 65.5 - SHOT.s11_moon.t0 61.0
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.5, 0.4);
  for (const [f, g] of [[55, -30], [82.4, -38]]) {
    const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f; os.start(0); os.stop(T_GONE + 0.05);
    chain(os, env(ctx, [[0, g], [2.0, g - 4], [T_GONE, -120]]), out);
    chain(os, env(ctx, [[0, g - 6], [T_GONE, -120]]), rv); }
  const s = src(ctx, noiseBuf(ctx, 'pink', 5, 14), 0, T_GONE), lp = filt(ctx, 'lowpass', 220, 0.6);   // a breath of air under it
  chain(s, lp, env(ctx, [[0, -40], [T_GONE, -120]]), out);
}
