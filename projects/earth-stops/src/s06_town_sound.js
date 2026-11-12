// s06_town sound (7.0 s shot; dur = 7.6). Plain script: audio_core.js is prepended. Names per engine/API.md §22.
// Soft cut in at 0.0 (same terrace, longer lens): ONE low whoosh (f1 <= 2000, gain <= -16), no hit. The wall climbs over the
// promenade and races into the east town: its roar (right) builds to the hard cut at 7.0 (HIT 2 lives in score.json at 43.5),
// timbers breaking low as each waterfront row goes (low-passed cracks, irregular), the sea's low suck under it, the air roar.
// Sync: houses are knocked down when the front reaches them: front sf = 34 + 0.8·V·(e - E6) m past the shore (groupC_bay.js),
// so a house s m inland goes at shot time ≈ 12·(s + 4 - 34)/(0.8·381) = 0.039·(s - 30) s: the first waterfront rows
// (s 40-60) at ~0.4-1.2 s, then a steady march to the end (s ~210 at 7.0 s). Cracks spread 0.4-6.8 s.
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 3.0, 0.2);
  whoosh(ctx, out, { t: 0.0, dur: 0.9, gain: -18, f0: 180, f1: 1400, pan0: -0.4, pan1: 0.5 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 380 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -15, sub: 30, level: (t) => 0.8 + 0.2 * sstep(2.0, 7.0, t) });
  // the wall's roar over the town, right of centre, building to the cut
  surf(ctx, out, { t0: 0, t1: dur, gain: -14, period: 2.6, swell: (t) => 0.7 + 0.3 * sstep(1.0, 7.0, t), pan: 0.45 });
  { const s = src(ctx, noiseBuf(ctx, 'pink', 8, 72), 0, dur);
    chain(s, filt(ctx, 'lowpass', 1100, 0.5), filt(ctx, 'highpass', 140, 0.5), env(ctx, [[0, -26], [3.5, -22], [6.9, -18], [dur, -20]]), panner(ctx, 0.5), out); }
  // the low suck underneath (left, fading as the bay empties)
  { const s = src(ctx, noiseBuf(ctx, 'brown', 8, 73), 0, dur);
    chain(s, filt(ctx, 'lowpass', 160, 0.9), env(ctx, [[0, -14], [4.0, -16], [dur, -19]]), panner(ctx, -0.4), out); }
  // timbers and walls breaking: low-passed noise cracks + a low body thump, irregular (never a ding, nothing above 3 kHz)
  for (let k = 0; k < 11; k++) { const t = 0.4 + k * 0.58 + 0.3 * hash(k * 4.7), g = -21 - 5 * hash(k * 2.3), pan = 0.1 + 0.6 * hash(k * 8.1);
    const s = src(ctx, noiseBuf(ctx, 'pink', 1, 80 + k), t, t + 0.6);
    chain(s, filt(ctx, 'lowpass', 1300 + 600 * hash(k), 0.8), env(ctx, [[t, -120], [t + 0.012, g], [t + 0.25, g - 18], [t + 0.55, -120]]), panner(ctx, pan), rv);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70 + 30 * hash(k * 1.9), t); o.frequency.exponentialRampToValueAtTime(38, t + 0.4); o.start(t); o.stop(t + 0.5);
    chain(o, env(ctx, [[t, -120], [t + 0.01, g - 2], [t + 0.45, -120]]), panner(ctx, pan), out); }
}
