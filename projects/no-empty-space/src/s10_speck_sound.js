// s10_speck sound (dur = 5.0 + 0.6). Plain script (audio_core.js is prepended). t = 0 is film 56.0.
// After the score's hit at 55.0: a single low tone (a soft fifth, slowly breathing) and a soft high shimmer (a band of
// filtered noise drifting, never periodic, never a tick). The score's own bed sits under it.
function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 4.0, 0.35);
  for (const [f, g, d] of [[55, -24, 0.0], [82.4, -31, 0.4], [110.3, -36, 0.8]]) {
    const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f; os.detune.setValueAtTime(-4, 0); os.detune.linearRampToValueAtTime(5, dur);
    os.start(0); os.stop(dur);
    chain(os, env(ctx, [[0, -120], [0.6 + d, g], [3.8, g - 2], [dur - 0.2, g - 10], [dur, -120]]), out);
    chain(os, env(ctx, [[0, -120], [1.0 + d, g - 8], [dur, -120]]), rv); }
  // the shimmer: pink noise through a narrow band that drifts 3.2 -> 2.6 kHz, very low
  const s = src(ctx, noiseBuf(ctx, 'pink', 5, 12), 0, dur), bp = filt(ctx, 'bandpass', 3200, 6), lp = filt(ctx, 'lowpass', 4200, 0.7);
  bp.frequency.setValueAtTime(3200, 0); bp.frequency.linearRampToValueAtTime(2600, dur);
  chain(s, bp, lp, env(ctx, [[0, -120], [1.2, -44], [3.5, -42], [dur, -120]]), panner(ctx, 0.25), rv);
}
