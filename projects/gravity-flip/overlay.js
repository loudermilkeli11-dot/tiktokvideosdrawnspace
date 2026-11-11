// gravity-flip overlay (Studio v2, type A, look 'v2' in tools/overlay/ov.html): title, captions and the live counter for the
// full 38 s film. Board: script.md. Every counter number is COMPUTED from the law (src/story.js) at each film time
// (tauAt -> heightAt / speedAt / landsAt / rateAt), and caption anchors come from the SHOT table, so a re-timed shot carries its type.
import { cap } from '../../tools/overlay/helpers.js';
import { SHOT, FILM_LEN, G0, tauAt, rateAt, heightAt, speedAt, landsAt } from './src/story.js';

// ---- the law at film time t, read through one shot's story clock
function S(name, t) {
  const s = SHOT[name], tt = t - s.t0, tau = tauAt(name, tt), land = landsAt(s.T);
  return { tt, tau, T: s.T, land, landed: tau >= land, h: heightAt(tau, s.T), v: speedAt(tau, s.T), rate: rateAt(name, tt) };
}
const vLand = (T) => Math.abs(speedAt(landsAt(T) - 1e-6, T));                 // impact speed (m/s)
function apex(T) { let m = 0; const L = landsAt(T); for (let i = 0; i <= 4000; i++) m = Math.max(m, heightAt(L * i / 4000, T)); return m; }
const filmAt = (name, tau) => SHOT[name].t0 + (tau - SHOT[name].tau0) / (SHOT[name].rate ?? 1);   // linear-clock shots only

// ---- formats
const n0 = (v) => Math.round(v).toLocaleString('en-US');
const KMH = (ms) => n0(Math.abs(ms) * 3.6);
const HEIGHT = (m) => (m < 999.95 ? `${m.toFixed(1)} M` : m < 99950 ? `${(m / 1000).toFixed(1)} KM` : `${n0(m / 1000)} KM`);
const COUNTDOWN = (s) => { const ms = Math.round(Math.max(0, s) * 1000); return `${String(Math.floor(ms / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
const CLOCK = (s) => { s = Math.max(0, Math.floor(s + 1e-6)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const MMSS = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const sig2 = (x) => { if (x < 10) return x.toFixed(1); const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return n0(Math.round(x / p) * p); };
// honest clock-rate label (story seconds per film second, from rateAt)
const RATE = (r) => (r >= 1.5 ? `TIME-LAPSE ×${sig2(r)}` : r >= 0.8 ? 'REAL TIME' : `SLOW-MO ×${r.toFixed(1)}`);

// ---- counter segment for one shot: label/value/fact are functions of the story state (or constants)
const res = (v, s) => (typeof v === 'function' ? v(s) : v);
const seg = (name, o, t0 = SHOT[name].t0, t1 = SHOT[name].t0 + SHOT[name].dur) => ({
  t0, t1, format: (x) => x,
  label: (t) => res(o.label, S(name, t)), value: (t) => res(o.value, S(name, t)), fact: (t) => res(o.fact ?? '', S(name, t)),
});

// ---- key film times, from the SHOT table
const T1 = SHOT.s02_flip.T, T2 = SHOT.s06_again.T, T3 = SHOT.s09_peel.T;
const tFlip = SHOT.s02_flip.t0;                                         // 3.0  gravity flips (step 1)
const tBack = filmAt('s03_pov', T1);                                    // 8.0  gravity returns (tau = T)
const tCrash = filmAt('s05_crash', landsAt(T1));                        // ~11.6 the sea lands
const tAgain = SHOT.s06_again.t0, tClouds = SHOT.s07_clouds.t0, tCoasts = SHOT.s08_coasts.t0;
const tPeel = SHOT.s09_peel.t0, tSlow = tPeel + SHOT.s09_peel.keys[1][0];   // 27.5: the speed ramp drops to ~real time
const tReturn = SHOT.s10_return.t0, tEnd = SHOT.s11_end.t0;
const A1 = apex(T1), A2 = apex(T2);

// ---- captions: anchored to the picture; each starts at max(anchor, previous start + 2.8 s) and runs to the next one
const MIN = 2.8, frame = (t) => Math.round(t * 30) / 30;
function chain(items, end) {
  const out = [];
  for (const [anchor, text, extra] of items) {
    const prev = out[out.length - 1], t0 = frame(prev ? Math.max(anchor, prev.t0 + MIN) : anchor);
    if (prev) prev.t1 = t0 + 1e-6;                                  // + 1 µs: same frame, no float 2.7999 s
    out.push(cap(t0, end, text, [], extra));
  }
  return out;
}

export default () => ({
  style: { look: 'v2' },
  titles: [cap(0, tFlip, `What if gravity *flipped* | for ${T1} seconds?`)],
  captions: chain([
    [tFlip, 'Everything loose falls *up*.'],
    [tBack, "Gravity's back. | The sea *fell up* too."],          // board: 8.0 "Gravity's back. Still rising." + 8.5 "The sea fell up too." (merged)
    [SHOT.s05_crash.t0, 'Then it all comes *back*.'],
    [tAgain, 'Now make it *one minute.*'],
    [tClouds, 'Above the clouds. | *Above the jets.*'],
    [tCoasts, 'Every coast. *At once.*'],
    [tPeel, 'Now make it *ten minutes.*'],
    [tSlow, 'Planes pass the *space station.*'],
    [tReturn, 'It all comes back | at *25,000 km/h.*'],
    [tEnd, "10 minutes. | *That's all it takes.*", { fadeOut: 0 }],   // hard cut into the loop
  ], FILM_LEN),
  counter: [
    seg('s01_plaza', { label: 'Gravity flips in', value: (s) => COUNTDOWN(-s.tau), fact: `Earth pulls at ${G0} m/s²` }),
    seg('s02_flip', { label: 'Falling up', value: (s) => HEIGHT(s.h), fact: (s) => `${KMH(s.v)} km/h · ${(s.T - s.tau).toFixed(1)} s of flip left` }),
    seg('s03_pov', {
      label: (s) => (s.tau < s.T ? 'Falling up' : 'Still rising'), value: (s) => HEIGHT(s.h),
      fact: (s) => (s.tau < s.T ? `${KMH(s.v)} km/h · ${(s.T - s.tau).toFixed(1)} s of flip left` : `${KMH(s.v)} km/h · gravity's back`),
    }),
    seg('s04_seaup', { label: 'Apex', value: (s) => HEIGHT(s.h), fact: (s) => `${KMH(s.v)} km/h · back down in ${(s.land - s.tau).toFixed(1)} s` }),
    seg('s05_crash', {
      label: 'Landing speed · km/h', value: (s) => KMH(s.landed ? vLand(s.T) : s.v),
      fact: (s) => (s.landed ? `${s.land.toFixed(1)} s after the flip` : `impact in ${(s.land - s.tau).toFixed(1)} s`),
    }),
    seg('s06_again', { label: `Flip · ${MMSS(T2)} · starts in`, value: (s) => COUNTDOWN(-s.tau), fact: `${T2 / T1}× longer than before` }),
    seg('s07_clouds', { label: 'Height', value: (s) => HEIGHT(s.h), fact: (s) => `${KMH(s.v)} km/h · ${(s.T - s.tau).toFixed(1)} s of flip left` }),
    seg('s08_coasts', {
      label: 'Landing speed · km/h', value: (s) => KMH(s.landed ? vLand(s.T) : s.v),
      fact: (s) => (s.landed ? `fell back from ${(A2 / 1000).toFixed(1)} km` : `impact in ${(s.land - s.tau).toFixed(1)} s`),
    }),
    seg('s09_peel', { label: `Flip · ${MMSS(T3)} · height`, value: (s) => HEIGHT(s.h), fact: (s) => `T+${CLOCK(s.tau)} · ${RATE(s.rate)}` }),
    seg('s10_return', {
      label: 'Re-entry · km/h', value: (s) => KMH(s.landed ? vLand(s.T) : s.v), fact: (s) => `T+${CLOCK(s.tau)} · ${RATE(s.rate)}`,
    }, tReturn, tEnd + 0.15),                                    // the landing value holds through the cut, then fades
  ],
  tags: [{ t0: 0, t1: FILM_LEN, text: 'Dramatization' }],
  _debug: { tFlip, tBack, tCrash, A1, A2 },
});
