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
  s08_coasts: { t0: 20.0, dur: 4.0, T: 60, tau0: 202 },
  s09_peel: { t0: 24.0, dur: 6.5, T: 600, tau0: 0, rate: 291 / 6.5 },     // time-lapse: 0 -> 291 s (ISS altitude) over 6.5 s, labelled
  s10_return: { t0: 30.5, dur: 4.5, T: 600, tau0: 3240, rate: 45 / 4.5 },  // the last 45 s before landing, 10x
  s11_end: { t0: 35.0, dur: 3.0, T: 600, tau0: 3400 },
};
export const FILM_LEN = 38.0;
// story seconds at shot-local time tt
export const tauAt = (shot, tt) => { const s = SHOT[shot]; return s.tau0 + tt * (s.rate ?? 1); };
