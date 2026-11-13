// s12_loop sound (dur = 4.0 + 0.6). Plain script: audio_core.js is prepended. t = shot time; film = t + 66.0.
// 0.0-3.0 (film 66.0-69.0): TRUE SILENCE under the end card (the score lands the cut hit at 69.0; no hit here).
// 3.0- (film 69.0 -> the loop): s01's pre-squeeze café bed, played in s01's FILM time: loopFilm = t - 4.0 (story.js), so the bed
// at t 3.0 is s01's bed at film -1.0 and the loop into s01 frame 0 continues the same waltz phrase.
const T_CUT = 3.0, OFF = -4.0;                                     // T_LOOP - SHOT.s12_loop.t0 = 3.0; loopFilm(tt) = tt - SHOT.s12_loop.dur

// ---- the café bed in FILM time (verbatim from s01_phone_sound.js: film = t + OFF)
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

function SOUND(ctx, out, dur) {
  cafeBed(ctx, out, T_CUT, dur, OFF, 1.6);
}
