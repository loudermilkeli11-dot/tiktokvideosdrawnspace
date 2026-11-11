// gravity-flip: the ONE law. Earth's gravity points outward for T seconds (inverse-square), the solid ground holds, and
// everything loose (people, cars, water, the air itself) falls up together. The air moves with everything, so there is no drag.
// heightAt(tau, T) -> metres above the start, speedAt(tau, T) -> m/s (+ up). Tabulated by integration (dt = 0.01 s).
export const G0 = 9.81, RE = 6371e3;
const cache = new Map();
function table(T) {
  if (cache.has(T)) return cache.get(T);
  const dt = T <= 10 ? 0.005 : T <= 120 ? 0.02 : 0.1; let r = RE, v = 0, t = 0; const H = [0], V = [0];
  const tEnd = T * 12 + 4000;
  while (t < tEnd) { const a = G0 * (RE / r) * (RE / r) * (t < T ? 1 : -1); v += a * dt; r += v * dt; t += dt; if (t > T && r <= RE) { H.push(0); V.push(v); break; } H.push(r - RE); V.push(v); }
  const tb = { dt, H, V, land: (H.length - 1) * dt }; cache.set(T, tb); return tb;
}
const lerp = (a, b, u) => a + (b - a) * u;
export function heightAt(tau, T = 5) { if (tau <= 0) return 0; const tb = table(T); const i = tau / tb.dt; if (i >= tb.H.length - 1) return 0; const k = Math.floor(i); return lerp(tb.H[k], tb.H[k + 1], i - k); }
export function speedAt(tau, T = 5) { if (tau <= 0) return 0; const tb = table(T); const i = tau / tb.dt; if (i >= tb.V.length - 1) return 0; const k = Math.floor(i); return lerp(tb.V[k], tb.V[k + 1], i - k); }
export const landsAt = (T = 5) => table(T).land;
// film start of each shot (s) and the story clock (step, tau at the shot's first frame); see script.md
export const SHOT = {
  s01_plaza: { t0: 0.0, dur: 3.0, T: 5, tau0: -3 },
  s02_flip: { t0: 3.0, dur: 3.0, T: 5, tau0: 0 },
  s03_pov: { t0: 6.0, dur: 2.5, T: 5, tau0: 3 },
  s04_seaup: { t0: 8.5, dur: 2.0, T: 5, tau0: 9 },
  s05_crash: { t0: 10.5, dur: 3.0, T: 5, tau0: 16 },
  s06_again: { t0: 13.5, dur: 1.5, T: 60, tau0: -1.5 },
  s07_clouds: { t0: 15.0, dur: 5.0, T: 60, tau0: 50 },
  s08_coasts: { t0: 20.0, dur: 4.0, T: 60, tau0: 204.75 },                // landing (205.76 s) at film 21.0 -> ~3 s of eruption
  s09_peel: { t0: 24.0, dur: 6.5, T: 600, keys: [[0, 0], [3.5, 286], [6.5, 288]] },   // speed ramp: time-lapse to ~286 s, then ~0.7x while a plane drifts past the station (labelled)
  s10_return: { t0: 30.5, dur: 4.5, T: 600, tau0: 3240, rate: 45 / 4.5 },  // the last 45 s before landing, 10x
  s11_end: { t0: 35.0, dur: 3.0, T: 600, tau0: 3400 },
};
export const FILM_LEN = 38.0;
// monotone cubic Hermite (Fritsch-Carlson) through [[x, y], ...]: C1, never overshoots, so story time never runs backwards
function keyed(K, x) {
  const n = K.length; if (x <= K[0][0]) return K[0][1]; if (x >= K[n - 1][0]) return K[n - 1][1];
  const d = [], m = []; for (let i = 0; i < n - 1; i++) d.push((K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])); m.push(d[n - 2]);
  let i = 0; while (x > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], u = (x - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * K[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * K[i + 1][1] + (u3 - u2) * h * m[i + 1];
}
// story seconds at shot-local time tt; rateAt = story seconds per film second there (for the on-screen time-lapse label)
export const tauAt = (shot, tt) => { const s = SHOT[shot]; return s.keys ? keyed(s.keys, tt) : s.tau0 + tt * (s.rate ?? 1); };
export const rateAt = (shot, tt, e = 1 / 60) => (tauAt(shot, tt + e) - tauAt(shot, tt - e)) / (2 * e);
