// s03_car sound (dur = 6.5 + 0.6). Plain script: audio_core.js is prepended. t = shot time; film = t + 11.5.
// The quay: water, gulls, street murmur, his footsteps on the cobbles (0.12-1.0), ONE low fob chirp-chirp (1.40), the car INHALE
// (2.00 -> 2.50: a metal groan pulled inward with a rising suck, HARD stop; the score has the boom at 14.0 = 2.5), debris and
// lemons pattering down, gasps; the second fob clicks (2.95, 3.2) into near silence; distant car alarms, low.
// Sync (story.js / groupA_quay.js): SQZ.car.T - SHOT.s03_car.t0 = 2.0; + dur 0.5 = 2.5; fob blink film 12.9 -> 1.4; re-clicks film
// 14.45 / 14.7 -> 2.95 / 3.2; strides film 11.62.. -> 0.12..; bench shuffle 16.4-16.9 -> 4.9-5.4.
const T_SQ = 2.0, T_DONE = 2.5, T_FOB = 1.4;

function inhale(ctx, out, t0, t1, peak, o = {}) {
  const n = src(ctx, noiseBuf(ctx, 'pink', 3, o.seed ?? 21), t0, t1 + 0.02), bp = filt(ctx, 'bandpass', o.f0 ?? 300, o.q ?? 1.4);
  bp.frequency.setValueAtTime(o.f0 ?? 300, t0); bp.frequency.exponentialRampToValueAtTime(o.f1 ?? 2000, t1);
  chain(n, bp, filt(ctx, 'lowpass', o.lp ?? 2600, 0.6), env(ctx, [[t0, -120], [t0 + 0.02, -40], [t1 - 0.004, peak], [t1, -120]]), panner(ctx, o.pan ?? 0), out);
}
const step = (ctx, out, t, g, pan) => { const n = src(ctx, noiseBuf(ctx, 'brown', 1, 41), t, t + 0.09); chain(n, filt(ctx, 'lowpass', 380, 0.8), env(ctx, [[t, -120], [t + 0.005, g], [t + 0.08, -120]]), panner(ctx, pan), out); };
const click = (ctx, out, t, g) => { const n = src(ctx, noiseBuf(ctx, 'white', 1, 43), t, t + 0.03); chain(n, filt(ctx, 'bandpass', 1500, 3), env(ctx, [[t, -120], [t + 0.002, g], [t + 0.025, -120]]), out); };

function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.4, 0.22);
  surf(ctx, out, { t0: 0, t1: dur, gain: -24, period: 5.0, pan: 0.3 });
  wind(ctx, out, { t0: 0, t1: dur, gain: -34, f: 500 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -27, voices: 10, excite: (t) => 0.22 + 0.45 * sstep(2.45, 2.9, t) * (1 - 0.6 * sstep(3.0, 3.6, t)), pan: 0.1, seed: 12 });
  // gulls over the quay (two, far)
  for (const [t, p] of [[0.5, 0.6], [5.6, -0.5]]) for (const [d, a, b] of [[0, 1450, 1100], [0.24, 1300, 950]]) { const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(a, t + d); o.frequency.exponentialRampToValueAtTime(b, t + d + 0.2); o.start(t + d); o.stop(t + d + 0.22);
    chain(o, filt(ctx, 'bandpass', 1200, 1.2), env(ctx, [[t + d, -120], [t + d + 0.03, -38], [t + d + 0.2, -120]]), panner(ctx, p), rv); }
  // his footsteps (stroll), and the hurried shuffle to the bench later
  [0.12, 0.37, 0.62, 0.87].forEach((t, i) => step(ctx, out, t, -24, i % 2 ? 0.1 : -0.1));
  [4.95, 5.12, 5.3].forEach((t, i) => step(ctx, out, t, -25, i % 2 ? -0.2 : 0));
  // the fob: chirp-chirp, low-pitched, once (with the indicator blinks)
  for (const d of [0, 0.17]) { const t = T_FOB + d, o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(760, t); o.frequency.linearRampToValueAtTime(880, t + 0.07); o.start(t); o.stop(t + 0.08);
    chain(o, filt(ctx, 'lowpass', 1400, 0.7), env(ctx, [[t, -120], [t + 0.005, -31], [t + 0.07, -120]]), panner(ctx, 0.3), out); }
  // THE CAR INHALE: the suck (noise sweep) + a metal groan dragged inward (saw 70 -> 190 Hz, low-passed), hard stop at 2.5
  inhale(ctx, out, T_SQ, T_DONE, -15, { f0: 250, f1: 1900, pan: 0.25 });
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, T_SQ); o.frequency.exponentialRampToValueAtTime(190, T_DONE); o.start(T_SQ); o.stop(T_DONE + 0.01);
    chain(o, filt(ctx, 'lowpass', 700, 1.2), env(ctx, [[T_SQ, -120], [T_SQ + 0.05, -30], [T_DONE - 0.004, -18], [T_DONE, -120]]), panner(ctx, 0.25), out); }
  // his hat whipping off past the ear
  whoosh(ctx, out, { t: T_SQ + 0.05, dur: 0.35, gain: -27, f0: 600, f1: 1500, pan0: -0.3, pan1: 0.35 });
  // aftermath: grit and lemons patter down round the hole (low, scattered, decaying), gasps
  for (let i = 0; i < 18; i++) { const t = T_DONE + 0.08 + Math.pow(hash(i + 3), 1.6) * 1.6, g = -27 - 10 * (t - T_DONE) / 1.7, n = src(ctx, noiseBuf(ctx, 'white', 1, 47 + i), t, t + 0.05);
    chain(n, filt(ctx, 'bandpass', 700 + 900 * hash(i), 1.5), env(ctx, [[t, -120], [t + 0.003, g], [t + 0.04, -120]]), panner(ctx, (hash(i * 3.1) - 0.5) * 1.2), out); }
  gasp(ctx, rv, { t: 2.55, gain: -16, dur: 1.3, voices: 6 });
  // the gag: two more fob clicks into near silence (no chirp, no car)
  click(ctx, out, 2.95, -26); click(ctx, out, 3.2, -26); click(ctx, out, 3.42, -28);
  // distant car alarms set off by the boom (low two-tone, far, filtered; never above ~1 kHz)
  for (const [pan, f1, f2, ph] of [[-0.7, 520, 410, 0], [0.6, 470, 370, 0.21]]) { const o = ctx.createOscillator(); o.type = 'square'; const t0 = 2.7 + ph;
    for (let t = t0; t < dur; t += 0.42) { o.frequency.setValueAtTime(f1, t); o.frequency.setValueAtTime(f2, t + 0.21); }
    o.start(t0); o.stop(dur); chain(o, filt(ctx, 'lowpass', 900, 0.7), env(ctx, [[t0, -120], [t0 + 0.4, -42], [dur, -44]]), panner(ctx, pan), rv); }
}
