// s05_bay sound (7.5 s shot; dur = 8.1). Plain script: audio_core.js is prepended. Names per engine/API.md §22 (t0/t1/gain dB).
// NO hit at 0.0: score.json carries HIT 1 (29.0). The bed: the Mach-1.1 air roar continuing from the plaza (low), the bay's
// huge low SUCK as the water slides off the west floor, the heaped water's roar against the east shore (right), hulls
// grinding on the drained floor (left), one gull cut off by the roar in the first half-second. Nothing repeats above 3 kHz.
// Sync: the drained edge passes the stranded fleet across the whole shot (x_d = -800 + V·e, groupC_bay.js), so the scrapes
// are spread over 0.4-7.0 s; the heap's front reaches the promenade at the shot's end (seaState sf = 34 at e = E6 = 2.958),
// so the east roar swells toward 7.5 s.
function SOUND(ctx, out, dur) {
  const bus = ctx.createGain(); bus.gain.value = db(-3); bus.connect(out); out = bus;
  const rv = verb(ctx, out, 3.0, 0.2);
  // the air roar (s01-s04's wind, here from the terrace: lower, wider)
  wind(ctx, out, { t0: 0, t1: dur, gain: -24, f: 380 });
  rumble(ctx, out, { t0: 0, t1: dur, gain: -17, sub: 31, level: (t) => 0.75 + 0.25 * sstep(5.0, 7.5, t) });
  // the gull, cut off (one call, 1.1-1.7 kHz glide, gone under the roar by 0.5 s)
  { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1700, 0.02); o.frequency.exponentialRampToValueAtTime(1100, 0.32); o.start(0.02); o.stop(0.5);
    chain(o, filt(ctx, 'bandpass', 1400, 2.5), env(ctx, [[0, -120], [0.05, -30], [0.22, -32], [0.3, -60], [0.36, -120]]), panner(ctx, -0.3), out); }
  // the SUCK: the bay's water sliding east off the floor (brown noise, low-pass sweeping up, panned left -> right)
  { const s = src(ctx, noiseBuf(ctx, 'brown', 8.5, 51), 0, dur), lp = filt(ctx, 'lowpass', 120, 0.9);
    lp.frequency.setValueAtTime(110, 0); lp.frequency.linearRampToValueAtTime(320, 3.5); lp.frequency.linearRampToValueAtTime(180, dur);
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.5, 0); p.pan.linearRampToValueAtTime(0.4, dur);
    chain(s, lp, env(ctx, [[0, -14], [1.5, -11], [4.0, -12], [dur, -16]]), p, out); }
  // the heap's roar against the east shore (right): low surf body, swelling to the end
  surf(ctx, out, { t0: 0, t1: dur, gain: -15, period: 3.2, swell: (t) => 0.6 + 0.4 * sstep(3.0, 7.5, t), pan: 0.55 });
  { const s = src(ctx, noiseBuf(ctx, 'pink', 8.5, 52), 0, dur);
    chain(s, filt(ctx, 'lowpass', 900, 0.5), filt(ctx, 'highpass', 160, 0.5), env(ctx, [[0, -32], [3.0, -28], [7.2, -22], [dur, -24]]), panner(ctx, 0.6), out); }
  // hulls grinding on the drained floor (left): low scrapes, irregular (deterministic hash), low-passed
  for (let k = 0; k < 7; k++) { const t0 = 0.4 + k * 0.95 + 0.4 * hash(k * 7.3), d = 0.5 + 0.6 * hash(k * 3.1), f = 180 + 160 * hash(k * 5.7);
    const s = src(ctx, noiseBuf(ctx, 'brown', 2, 60 + k), t0, t0 + d + 0.1);
    chain(s, filt(ctx, 'bandpass', f, 3), filt(ctx, 'lowpass', 900, 0.7), env(ctx, [[t0, -120], [t0 + 0.08, -24 - 4 * hash(k)], [t0 + d * 0.7, -27], [t0 + d, -120]]), panner(ctx, -0.6 + 0.4 * hash(k * 9.1)), rv); }
}
