// s08_orbit sound (6.5 s + 0.6 tail). Space is low only; the score carries the swell (30.5-36.0). Here: a faint sub hum under
// it, out by shot 5.5 = film 36.0 (the silent beat 36.0-37.0 is TRUE silence: score.json "silent"). No hit (the cut in is a
// push through the sky, not a hit).
function SOUND(ctx, out, dur) {
  const END = 5.5;                                        // film 36.0 - SHOT.s08_orbit.t0 30.5
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(38, 0); o.frequency.linearRampToValueAtTime(41, END); o.start(0); o.stop(END + 0.05);
  chain(o, env(ctx, [[0, -120], [0.8, -27], [4.6, -25], [END - 0.05, -40], [END, -120]]), out);
  const b = src(ctx, noiseBuf(ctx, 'brown', END, 91), 0, END);
  chain(b, filt(ctx, 'lowpass', 160, 0.7), env(ctx, [[0, -120], [1.0, -36], [4.6, -33], [END, -120]]), out);
}
