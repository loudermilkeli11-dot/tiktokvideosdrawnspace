// giant-lens overlay (Studio v2, look 'v2' in tools/overlay/ov.html): title, captions and the live counter for the full 38 s film.
// Board: script.md. Every number is COMPUTED from the law (src/story.js) at each film time: lens size and beam power from
// lensD/powerAt (they roll ×10 through each grow), the frame-1 spot temperature from focusC -> tempC, the sea boiled from boilKgS,
// the humanity ratio from WORLD_POWER. Caption anchors come from the SHOT table, so a re-timed shot carries its type.
import { cap } from '../../tools/overlay/helpers.js';
import { SHOT, FILM_LEN, T_LOOP, T_SHOW, T_SPOT, Q_SPOT, GLASS_MELT_S, STEPS, WORLD_POWER, C_FRAME1,
  lensD, powerAt, focusC, tempC, boilKgS } from './src/story.js';

// ---- the law at film time t, read through one shot's clock
function S(name, t) { const s = SHOT[name], tt = t - s.t0, D = lensD(name, tt), P = powerAt(name, tt); return { tt, D, P }; }

// ---- formats (2 significant figures, as the board: 0.31 MW, 3.1 MW, 31 MW, 314 MW...; lens 20 M, 630 M, 2 KM, 6.3 KM)
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const sig2 = (x) => { if (x < 10) return (+x.toPrecision(2)).toString(); const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return n0(Math.round(x / p) * p); };
function POWER(W) {
  const [v, u] = W < 1e9 ? [W / 1e6, 'MW'] : W < 1e12 ? [W / 1e9, 'GW'] : [W / 1e12, 'TW'];
  return `${v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : n0(v)} ${u}`;         // 314 keeps 3 figures (the board's "314 MW")
}
const LENS = (D) => (D < 999.5 ? `${sig2(D)} m` : `${sig2(D / 1000)} km`);
const TEMP = (c) => `${n0(Math.min(T_SHOW, Math.round(c / 5) * 5))} °C`;          // rounds to 5 °C; the 3,505 °C equilibrium reads 3,500
const BOIL = (P) => { const kg = boilKgS(P); return kg < 999.5 ? `${n0(kg)} kg` : `${(kg / 1000).toFixed(1)} t`; };

// ---- counter segment for one shot (label/value/fact: constants or functions of the shot state)
const res = (v, s) => (typeof v === 'function' ? v(s) : v);
const seg = (name, o, t0 = SHOT[name].t0, t1 = SHOT[name].t0 + SHOT[name].dur) => ({
  t0, t1, format: (x) => x, band: o.band,
  label: (t) => res(o.label, S(name, t)), value: (t) => res(o.value, S(name, t)), fact: (t) => res(o.fact ?? '', S(name, t)),
});

// ---- bands where the picture is bright (A4 >= 3:1 after yuv420p): noon sky + glass, the white cloud deck, the sunlit Earth
const BRIGHT = { a: 0.7, padY: 64, plateau: [0.74, 0.9] }, CLOUDS = { a: 0.78, padX: 130, padY: 64, plateau: [0.72, 0.9] };
const s = (n) => SHOT[n].t0;
const MW_M2 = (Q_SPOT / 1e6).toFixed(1);                                           // 11.6 MW on every m²
const BILLION = Math.floor(STEPS[4].P / 1e9);                                       // 3 (3.14 GW)
const GLASS_S = Math.ceil(GLASS_MELT_S);                                            // 1.53 s -> "under 2 seconds"
const T0 = tempC(C_FRAME1);                                                         // 375 °C at frame 1
const c = (t0, t1, text, extra) => cap(t0, t1 + 1e-6, text, [], extra);             // + 1 µs: a 2.8 s caption never reads 2.7999

export default () => ({
  style: { look: 'v2' },
  titles: [cap(0, 3.6, 'What if a *magnifying glass* | the size of a house | looked at a city?')],   // default title band: the lens (y ≈ 270-345) stays readable under it
  captions: [
    c(3.8, 6.8, `${n0(T_SHOW)} °C. A real | *solar furnace* does this.`, { band: BRIGHT }),
    c(6.9, 9.7, 'Now make the lens *bigger.*', { band: BRIGHT }),
    c(10.0, 13.3, `Window glass melts in | *under ${GLASS_S} seconds.*`, { band: BRIGHT }),
    c(14.0, 17.4, 'Wood catches *instantly.*', { band: BRIGHT }),
    c(18.4, 21.8, `${BILLION} billion watts. | One *burning line.*`, { band: BRIGHT }),
    c(22.8, 26.2, 'It cuts the clouds *open.*', { band: CLOUDS }),
    c(27.4, 31.0, `Bigger lens. Same ${n0(T_SHOW)} °C. | *Wider burn.*`, { band: BRIGHT }),
    c(31.8, 36.2, 'More power than all | *humanity uses.*', { band: BRIGHT }),
  ],
  counter: [
    seg('s01_plaza', { band: BRIGHT, label: 'Spot temp', value: (st) => TEMP(tempC(focusC(st.tt))), fact: (st) => `Lens ${LENS(st.D)} · ${POWER(st.P)}` }),
    seg('s02_street', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · spot ${n0(T_SHOW)} °C` }),
    seg('s03_tower', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · ${MW_M2} MW on every m²` }),
    seg('s04_bay', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · boils ${BOIL(st.P)} of sea/s` }),
    seg('s05_town', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · boils ${BOIL(st.P)} of sea/s` }),
    seg('s06_clouds', { band: CLOUDS, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · above the clouds` }),
    seg('s07_strato', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P), fact: (st) => `Lens ${LENS(st.D)} · spot still ${n0(T_SHOW)} °C` }),
    seg('s08_orbit', { band: BRIGHT, label: 'Beam power', value: (st) => POWER(st.P),
      fact: (st) => `Lens ${LENS(st.D)} · ${(st.P / WORLD_POWER).toFixed(1)}× all human power use` }, s('s08_orbit'), T_LOOP - 0.5),   // orbit tail 36.5-37.0: no type
    seg('s09_loop', { band: BRIGHT, label: 'Spot temp', value: TEMP(T0), fact: `Lens ${LENS(STEPS[0].D)} · ${POWER(STEPS[0].P)}` }),   // frozen = frame 1
  ],
  tags: [{ t0: 0, t1: FILM_LEN, text: 'Dramatization · perfect giant lens' }],
  _debug: { T_SPOT, T0, MW_M2, BILLION, GLASS_S, ratio: STEPS[8].P / WORLD_POWER },
});
