// s01_phone sound (dur = 6.0 + 0.6). Plain script: audio_core.js is prepended (no imports). t = shot time = film time.
// The café: harbour water, chatter, a soft cup clack now and then, gulls far off, and an accordion waltz that STOPS mid-note at
// the squeeze (1.60). The phone INHALE: a rising sucking sweep 1.60 -> 1.95 with a hard stop (score.json lands the boom at 1.95;
// no hits or booms here). Then gasps, chairs scraping, the crowd murmur up, the napkin whoosh across the lens at 5.72.
// Sync constants from story.js: SQZ.phone.T = 1.60, SQZ.phone.dur = 0.35 -> stop at 1.95; the wipe 5.72-6.0 (groupA_terrace).
const T_SQ = 1.6, T_DONE = 1.95, T_WIPE = 5.72;

// ---- the café bed in FILM time (shared verbatim with s12_loop_sound.js: film = t + OFF)
function cafeBed(ctx, out, t0, t1, OFF, stopAcc) {
  const F = (film) => film - OFF;                                  // film time -> this page's time
  // water lapping against the quay (low, slow swell) + the harbour air
  surf(ctx, out, { t0, t1, gain: -27, period: 4.2, pan: -0.2 });
  const air = src(ctx, noiseBuf(ctx, 'brown', 6, 11), t0, t1); chain(air, filt(ctx, 'lowpass', 420, 0.5), env(ctx, [[t0, -120], [t0 + 0.05, -34], [t1, -34]]), out);
  // café chatter (warm, low)
  crowd(ctx, out, { t0, t1, gain: -29, voices: 8, excite: () => 0.18, pan: 0.15, seed: 4 });
  // a soft clack of cup on saucer now and then (low-mid, never a ding)
  for (const f of [-0.85, -0.3, 0.55, 1.2]) { const t = F(f); if (t < t0 || t > t1) continue; const n = src(ctx, noiseBuf(ctx, 'white', 1, 7), t, t + 0.05);
    chain(n, filt(ctx, 'bandpass', 1300, 2.5), env(ctx, [[t, -120], [t + 0.004, -30], [t + 0.045, -120]]), panner(ctx, 0.35), out); }
  // gulls far off (a short falling cry, ~1-1.5 kHz, through the reverb)
  const rv = verb(ctx, out, 2.4, 0.22);
  for (const [f, p] of [[-0.6, -0.5], [0.4, 0.6], [3.1, -0.4], [4.8, 0.5]]) { const t = F(f); if (t < t0 || t > t1 - 0.5) continue;
    for (const [d, a, b] of [[0, 1500, 1150], [0.22, 1350, 980]]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(a, t + d); o.frequency.exponentialRampToValueAtTime(b, t + d + 0.2);
      o.start(t + d); o.stop(t + d + 0.22); chain(o, filt(ctx, 'bandpass', 1250, 1.2), env(ctx, [[t + d, -120], [t + d + 0.03, -40], [t + d + 0.2, -120]]), panner(ctx, p), rv); } }
  // the accordion: a slow waltz (two detuned reeds per note, warm low-pass, a little bellows swell), cut dead at stopAcc
  const NOTES = [[-1.0, 392], [-0.6, 440], [-0.2, 494], [0.2, 523], [0.6, 494], [1.0, 440], [1.33, 392], [1.5, 523]];   // G A B C B A G C (C cut mid-note)
  const CH = [[-1.0, [196, 247, 294]], [0.2, [175, 220, 262]], [1.0, [196, 247, 294]]];
  const reed = (t, t1n, f, g, pan) => { for (const det of [-0.0025, 0.0025]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * (1 + det); o.start(t); o.stop(t1n);
    chain(o, filt(ctx, 'lowpass', 1700, 0.6), env(ctx, [[t, -120], [t + 0.04, g], [t1n - 0.006, g - 2], [t1n, -120]]), panner(ctx, pan), out); } };
  NOTES.forEach(([f, hz], i) => { const a = F(f), b = Math.min(F(NOTES[i + 1]?.[0] ?? stopAcc), F(stopAcc)); if (b <= t0 || a >= t1) return; reed(Math.max(a, t0), Math.min(b, t1), hz, -31, -0.35); });
  CH.forEach(([f, ch], i) => { const a = F(f), b = Math.min(F(CH[i + 1]?.[0] ?? stopAcc), F(stopAcc)); if (b <= t0 || a >= t1) return; ch.forEach((hz) => reed(Math.max(a, t0), Math.min(b, t1), hz, -37, -0.35)); });
}

// ---- the squeeze INHALE (BUILDERS recipe): pink noise -> band-pass swept 300 -> 2,000 Hz, -40 -> peak dB, HARD stop at t1
function inhale(ctx, out, t0, t1, peak, o = {}) {
  const n = src(ctx, noiseBuf(ctx, 'pink', 3, o.seed ?? 21), t0, t1 + 0.02), bp = filt(ctx, 'bandpass', o.f0 ?? 300, o.q ?? 1.4);
  bp.frequency.setValueAtTime(o.f0 ?? 300, t0); bp.frequency.exponentialRampToValueAtTime(o.f1 ?? 2000, t1);
  chain(n, bp, filt(ctx, 'lowpass', o.lp ?? 2600, 0.6), env(ctx, [[t0, -120], [t0 + 0.02, -40], [t1 - 0.004, peak], [t1, -120]]), panner(ctx, o.pan ?? 0), out);
}

function SOUND(ctx, out, dur) {
  cafeBed(ctx, out, 0, dur, 0, T_SQ);
  inhale(ctx, out, T_SQ, T_DONE, -20, { pan: 0.25, f1: 1800 });
  // the air snap pulls past the ear: a short reversed-feel whoosh into the hand
  whoosh(ctx, out, { t: T_SQ + 0.05, dur: 0.3, gain: -26, f0: 500, f1: 1600, pan0: -0.5, pan1: 0.3 });
  // reactions: gasps (2.0), chairs scraping (low noise drags), the murmur swells and stays up
  gasp(ctx, out, { t: 2.02, gain: -17, dur: 1.2, voices: 6 });
  for (const [t, p] of [[2.05, -0.4], [2.15, 0.3]]) { const n = src(ctx, noiseBuf(ctx, 'white', 1, 13), t, t + 0.25); chain(n, filt(ctx, 'bandpass', 520, 3), env(ctx, [[t, -120], [t + 0.03, -30], [t + 0.24, -120]]), panner(ctx, p), out); }
  crowd(ctx, out, { t0: 2.0, t1: dur, gain: -25, voices: 10, excite: (t) => 0.35 + 0.35 * sstep(2.0, 2.6, t) * (1 - 0.4 * sstep(4.0, 6.0, t)), pan: -0.1, seed: 9 });
  // the bead's tiny thud through the deck (2.23 = ½gt² from the hand) and the glass table crack (1.85) are low, short
  { const t = 1.85, n = src(ctx, noiseBuf(ctx, 'white', 1, 17), t, t + 0.12); chain(n, filt(ctx, 'highpass', 900, 0.7), filt(ctx, 'lowpass', 2800, 0.7), env(ctx, [[t, -120], [t + 0.003, -24], [t + 0.1, -120]]), panner(ctx, 0.2), out); }
  // the napkin across the lens (5.72-6.0): a soft paper whoosh left -> right
  whoosh(ctx, out, { t: T_WIPE + 0.02, dur: 0.3, gain: -24, f0: 400, f1: 1500, pan0: -0.7, pan1: 0.7 });
}
