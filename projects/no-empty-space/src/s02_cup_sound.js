// s02_cup sound (dur = 5.5 + 0.6). Plain script: audio_core.js is prepended. t = shot time; film = t + 6.0.
// A quieter café close at the table: low chatter, water, the coffee pour (from 0.72), the cup INHALE (a tiny pop: 1.80 -> 2.05,
// hard stop; the score has the boom at 8.05), the espresso splash on his lap, one gasp, the pour running on into nothing and
// splashing the table, and a soft air move as the camera cranes up to the street (4.7 ->).
// Sync constants (story.js / groupA_terrace.js): SQZ.cup.T - SHOT.s02_cup.t0 = 1.80; + dur 0.25 -> 2.05; stream from film 6.72
// -> 0.72; the pour hits the table from TC + 0.12 -> 1.92; crane CRANE - 6.0 = 4.7.
const T_SQ = 1.8, T_DONE = 2.05, T_POUR = 0.72, T_SPILL = 1.92, T_CRANE = 4.7;

function inhale(ctx, out, t0, t1, peak, o = {}) {
  const n = src(ctx, noiseBuf(ctx, 'pink', 3, o.seed ?? 21), t0, t1 + 0.02), bp = filt(ctx, 'bandpass', o.f0 ?? 300, o.q ?? 1.4);
  bp.frequency.setValueAtTime(o.f0 ?? 300, t0); bp.frequency.exponentialRampToValueAtTime(o.f1 ?? 2000, t1);
  chain(n, bp, filt(ctx, 'lowpass', o.lp ?? 2600, 0.6), env(ctx, [[t0, -120], [t0 + 0.02, -40], [t1 - 0.004, peak], [t1, -120]]), panner(ctx, o.pan ?? 0), out);
}
// a liquid stream: band-passed noise with a slow wobble (gurgle), between t0 and t1
function pourSound(ctx, out, t0, t1, f, gain, pan, seed) {
  const n = src(ctx, noiseBuf(ctx, 'pink', 3, seed), t0, t1), bp = filt(ctx, 'bandpass', f, 2.2);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7.3; lg.gain.value = f * 0.18; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(t0); lfo.stop(t1);
  chain(n, bp, filt(ctx, 'lowpass', 2400, 0.6), env(ctx, [[t0, -120], [t0 + 0.08, gain], [t1 - 0.05, gain], [t1, -120]]), panner(ctx, pan), out);
}

function SOUND(ctx, out, dur) {
  const rv = verb(ctx, out, 2.0, 0.18);
  // the room, closer and quieter than s01
  surf(ctx, out, { t0: 0, t1: dur, gain: -30, period: 4.6, pan: -0.3 });
  crowd(ctx, out, { t0: 0, t1: dur, gain: -32, voices: 8, excite: (t) => 0.15 + 0.2 * sstep(1.9, 2.4, t), pan: 0.25, seed: 6 });
  // the napkin leaving the lens (s01's wipe exits right)
  whoosh(ctx, out, { t: 0.0, dur: 0.22, gain: -28, f0: 900, f1: 1600, pan0: 0.2, pan1: 0.8 });
  // the refill pours into the cup, then (cup gone) straight onto the tablecloth, a little brighter and splashier
  pourSound(ctx, out, T_POUR, T_SPILL, 900, -31, 0.2, 31);
  pourSound(ctx, out, T_SPILL, dur, 1250, -29, 0.2, 33);
  // the cup pop: a tiny inhale (0.25 s), hard stop
  inhale(ctx, out, T_SQ, T_DONE, -21, { f0: 450, f1: 2200, q: 1.8, pan: -0.15 });
  // the espresso splash on his lap (soft, wet, low)
  { const t = T_DONE + 0.06, n = src(ctx, noiseBuf(ctx, 'pink', 1, 37), t, t + 0.35); chain(n, filt(ctx, 'lowpass', 1100, 0.7), env(ctx, [[t, -120], [t + 0.01, -24], [t + 0.33, -120]]), panner(ctx, -0.15), out); }
  // the bead through the saucer: a small dull tick-less tock (one, low)
  { const t = 2.13, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.08); o.start(t); o.stop(t + 0.1);
    chain(o, env(ctx, [[t, -120], [t + 0.004, -28], [t + 0.09, -120]]), out); }
  // one startled gasp (the old man) and the table around him
  gasp(ctx, rv, { t: 2.2, gain: -19, dur: 0.9, voices: 2 });
  // the crane up to the street: a soft air move, the street's murmur opening up below
  whoosh(ctx, out, { t: T_CRANE + 0.05, dur: 0.7, gain: -27, f0: 250, f1: 900, pan0: -0.3, pan1: 0.2 });
  crowd(ctx, out, { t0: T_CRANE, t1: dur, gain: -30, voices: 10, excite: () => 0.3, pan: -0.2, seed: 8 });
}
