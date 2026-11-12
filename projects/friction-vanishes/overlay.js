// friction-vanishes overlay (Studio v2, look 'v2' in tools/overlay/ov.html): title, captions and the live counter for the full
// 38 s film. Board: script.md. Every number is COMPUTED from the law (src/story.js) at each film time, and caption anchors come
// from the SHOT table, so a re-timed shot carries its type. No ticks anywhere (sound) — the counter pulses silently.
import { cap } from '../../tools/overlay/helpers.js';
import {
  SHOT, FILM_LEN, STEPS, V0, NORMAL_STOP, REPOSE_SAND, STREET_LEN, THETA,
  tauAt, slopeV, slopeX, coastV, V_QUAY, T_QUAY, T_GRIP1, T_GRIP2, T_LOOP,
} from './src/story.js';

// ---- the law at film time t, read through one shot's story clock
function S(name, t) { const s = SHOT[name], tt = t - s.t0; return { tt, tau: tauAt(name, tt), T: s.T }; }

// ---- formats
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const KMH = (ms) => n0(Math.abs(ms) * 3.6);
const COUNTDOWN = (s) => { const ms = Math.round(Math.max(0, s) * 1000); return `${String(Math.floor(ms / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
const MMSS_T = (s) => { s = Math.max(0, s); const d = Math.round(s * 10); const m = Math.floor(d / 600), r = d - m * 600; return `${String(m).padStart(2, '0')}:${String(Math.floor(r / 10)).padStart(2, '0')}.${r % 10}`; };
const CLOCK = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---- counter segment for one shot (label/value/fact: constants or functions of the story state)
const res = (v, s) => (typeof v === 'function' ? v(s) : v);
const seg = (name, o, t0 = SHOT[name].t0, t1 = SHOT[name].t0 + SHOT[name].dur) => ({
  t0, t1, format: (x) => x, band: o.band,
  label: (t) => res(o.label, S(name, t)), value: (t) => res(o.value, S(name, t)), fact: (t) => res(o.fact ?? '', S(name, t)),
});

// ---- facts from the law
const T1 = STEPS[0], T2 = STEPS[1], T3 = STEPS[2];
const STOP_M = Math.round(NORMAL_STOP);                                  // 14 m
const FACT_CAR = `Car at ${KMH(V0)} km/h · normal stop ${STOP_M} m`;
const SLID = slopeX(T1);                                                 // 21 m in 5 s on the 10 deg hill
const HILL_KMH = KMH(slopeV(T1));                                        // 31 km/h
const QUAY_KMH = KMH(V_QUAY);                                            // 126 km/h

// ---- bands where the picture is bright (A4 >= 3:1 after yuv420p): noon sky, sunlit concrete, spray, the sunlit Earth
const BRIGHT = { a: 0.7, padY: 64, plateau: [0.74, 0.9] };

// ---- captions: anchored to the picture; each starts at max(anchor, previous start + 2.8 s) and runs to the next one
const MIN = 2.8, frame = (t) => Math.round(t * 30) / 30;
function chain(items, end) {
  const out = [];
  for (const [anchor, text, extra] of items) {
    const prev = out[out.length - 1], t0 = frame(prev ? Math.max(anchor, prev.t0 + MIN) : anchor);
    if (prev) prev.t1 = t0 + 1e-6;
    out.push(cap(t0, end, text, [], extra));
  }
  return out;
}
const tTitleEnd = 2.9;                                                   // board: title 0.0-2.9, then C1
const s = (n) => SHOT[n].t0;

export default () => ({
  style: { look: 'v2' },
  titles: [cap(0, tTitleEnd, `What if friction *vanished* | for ${T1} seconds?`, [], { band: BRIGHT })],
  captions: chain([
    [tTitleEnd, 'Brakes do *nothing.*'],
    [5.7, 'Then the grip | *comes back.*'],                              // board: 5.7 (grip back at T_GRIP1 = 5.0, held to 2.8 s rule)
    [s('s03_minute'), 'Now make it | *one minute.*'],
    [11.5, 'Every street becomes | a *slide.*'],
    [14.3, `Into the harbour | at *${QUAY_KMH} km/h.*`, { band: BRIGHT }],   // over spray
    [s('s05_town'), 'The whole town | *slides into the sea.*'],
    [s('s06_hills'), 'Now make it | *ten minutes.*'],
    [24.8, 'Now the *hills* flow.'],
    [27.6, 'The bay is *full.*'],
    [s('s08_orbit'), 'Every coast | *turns brown.*', { band: BRIGHT }],
    [33.6, 'All from one | *missing* force.', { band: BRIGHT, fadeOut: 0 }],   // hard cut on the 37.0 hit; no type in the loop tail
  ], T_LOOP),
  counter: [
    seg('s01_crossing', { label: 'Friction back in', value: (st) => COUNTDOWN(st.T - st.tau), fact: FACT_CAR }),
    seg('s02_grip', {
      label: (st) => (st.tau < st.T ? 'Friction back in' : 'Slid in 5 s'),
      value: (st) => (st.tau < st.T ? COUNTDOWN(st.T - st.tau) : `${n0(SLID)} M`),
      fact: (st) => (st.tau < st.T ? `Hill cars at ${KMH(slopeV(st.tau))} km/h` : `Hill cars hit ${HILL_KMH} km/h in ${T1} s`),
    }),
    seg('s03_minute', { label: `Sliding · ${CLOCK(T2)} · speed`, value: (st) => `${KMH(slopeV(st.tau))} KM/H`, fact: 'Nothing can brake' }),
    seg('s04_quay', {
      band: BRIGHT, label: 'Quay speed', value: (st) => `${KMH(slopeV(Math.min(st.tau, T_QUAY)))} KM/H`,
      fact: `${STREET_LEN} m of ${THETA}° street in ${Math.round(T_QUAY)} s`,
    }),
    seg('s05_town', { label: 'Friction back in', value: (st) => MMSS_T(st.T - st.tau), fact: 'Every street ends in the sea' }),
    seg('s06_hills', {
      label: 'Slope that holds', value: (st) => `${Math.round(REPOSE_SAND * (1 - Math.min(1, Math.max(0, st.tt))))}°`,   // 34° -> 0° over the first second
      fact: `Dry sand, with friction: ${REPOSE_SAND}°`,
    }),
    seg('s07_after', { label: 'Friction back after', value: CLOCK(T3), fact: 'The hills slid into the bay' }),
    seg('s08_orbit', { band: BRIGHT, label: 'Steepest slope that held', value: '0°', fact: `For ${T3 / 60} minutes, everywhere` }),
    seg('s09_loop', { label: 'Friction back in', value: COUNTDOWN(T1), fact: FACT_CAR }),       // frozen at 05.000: matches frame 1
  ],
  tags: [{ t0: 0, t1: FILM_LEN, text: 'Dramatization · friction off' }],
  _debug: { T_GRIP1, T_GRIP2, T_QUAY, QUAY_KMH, SLID, HILL_KMH, STOP_M, cV5: KMH(coastV(V0, 5)) },
});
