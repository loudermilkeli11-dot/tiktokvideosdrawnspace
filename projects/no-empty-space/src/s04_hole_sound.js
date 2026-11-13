// s04_hole sound (dur = 5.5 + 0.6). Plain script: audio_core.js is prepended. t = shot time; film = t + 18.0.
// Close and quiet at the hole: a hollow wind tone breathing out of it, a falling-pitch rumble sinking away (the 1.5 t speck, 99 ->
// 490 m down), his knees on the cobbles, a dog sniffing (2.6-3.3), the Vespa rolling in and idling, the crowd's murmur gathering,
// distant alarms fading; the whip-pan whoosh at the end (5.18 -> 5.5) into s05. No hits (the score owns the cuts).
// Sync (s04_hole.js): kneel film 19.35-19.8 -> 1.35-1.8; dog arrives film 20.4 -> 2.4; Vespa film 18.4-20.6 -> 0.4-2.6; whip W0 - 18.0 = 5.18.
const T_WHIP = 5.18;

function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.2, 0.2);
  surf(ctx, out, { t0: 0, t1: dur, gain: -28, period: 5.0, pan: 0.3 });
  // the hollow tone out of the hole: a resonant band of brown noise around 170 Hz, slowly breathing
  { const n = src(ctx, noiseBuf(ctx, 'brown', 4, 51), 0, dur), bp = filt(ctx, 'bandpass', 170, 9); const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.35; lg.gain.value = 25; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(0); lfo.stop(dur);
    chain(n, bp, env(ctx, [[0, -120], [0.1, -27], [dur - 0.4, -29], [dur, -36]]), out); }
  // the speck sinking: a low tone falling in pitch and fading (depth 99 -> 490 m)
  { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, 0); o.frequency.exponentialRampToValueAtTime(30, T_WHIP); o.start(0); o.stop(T_WHIP + 0.1);
    chain(o, env(ctx, [[0, -120], [0.3, -22], [T_WHIP, -40], [T_WHIP + 0.1, -120]]), out); }
  rumble(ctx, out, { t0: 0, t1: T_WHIP, gain: -26, sub: 32, level: (t) => 1 - 0.7 * (t / T_WHIP) });
  // knees on the cobbles
  { const t = 1.6, n = src(ctx, noiseBuf(ctx, 'brown', 1, 53), t, t + 0.12); chain(n, filt(ctx, 'lowpass', 300, 0.8), env(ctx, [[t, -120], [t + 0.01, -26], [t + 0.1, -120]]), panner(ctx, -0.3), out); }
  // the dog sniffing (short, soft, mid-high puffs, a few in quick runs)
  [2.6, 2.68, 2.76, 3.05, 3.12, 3.2, 3.6, 3.67].forEach((t, i) => { const n = src(ctx, noiseBuf(ctx, 'white', 1, 57 + i), t, t + 0.05);
    chain(n, filt(ctx, 'bandpass', 2100, 2.2), env(ctx, [[t, -120], [t + 0.008, -31], [t + 0.045, -120]]), panner(ctx, 0.35), out); });
  // the Vespa rolls in (engine low, decelerating) and idles
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, 0.4); o.frequency.exponentialRampToValueAtTime(48, 2.6); o.start(0.4); o.stop(dur);
    const am = ctx.createOscillator(), ag = ctx.createGain(); am.frequency.value = 23; ag.gain.value = 0.35 * db(-34);   // AM depth relative to the engine's own level am.connect(ag); am.start(0.4); am.stop(dur);
    const g = env(ctx, [[0.4, -120], [0.9, -33], [2.6, -35], [dur, -38]]); ag.connect(g.gain);
    chain(o, filt(ctx, 'lowpass', 500, 0.8), g, panner(ctx, 0.55), out); }
  // the crowd gathering (murmur building), alarms far away, fading
  crowd(ctx, out, { t0: 0, t1: dur, gain: -26, voices: 12, excite: (t) => 0.2 + 0.25 * sstep(0.5, 3.0, t), pan: 0, seed: 14 });
  { const o = ctx.createOscillator(); o.type = 'square'; for (let t = 0; t < dur; t += 0.42) { o.frequency.setValueAtTime(500, t); o.frequency.setValueAtTime(400, t + 0.21); }
    o.start(0); o.stop(dur); chain(o, filt(ctx, 'lowpass', 800, 0.7), env(ctx, [[0, -120], [0.05, -46], [3.0, -54], [dur, -120]]), panner(ctx, -0.7), rv); }
  // the whip-pan into the harbour
  whoosh(ctx, out, { t: T_WHIP, dur: 0.34, gain: -19, f0: 300, f1: 2400, pan0: -0.6, pan1: 0.7 });
}
