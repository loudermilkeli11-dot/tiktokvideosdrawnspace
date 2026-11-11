// Deterministic math helpers. Everything in a shot must be a pure function of t.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const smoother = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * u * (u * (u * 6 - 15) + 10); };
export const fract = (x) => x - Math.floor(x);
export function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
export function hash2(a, b) { return hash(a * 157.31 + b * 113.97); }
export function rng(seed) { // mulberry32
  let a = (seed * 2654435761) >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// smooth 1D value noise in [-1,1] (quintic interp) and fbm
export function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  return lerp(hash(i + seed * 17.13), hash(i + 1 + seed * 17.13), u) * 2 - 1;
}
export function fbm(x, seed = 0, oct = 3) { let s = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { s += a * vnoise(x, seed + o * 7.7); n += a; x *= 2.03; a *= 0.5; } return s / n; }
export function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
// easing
export const ease = {
  linear: (u) => u,
  inOutSine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u)),
  inOutCubic: (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
  inOutQuint: (u) => { u = clamp(u); return u < 0.5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2; },
  outCubic: (u) => 1 - Math.pow(1 - clamp(u), 3),
  inCubic: (u) => clamp(u) ** 3,
  outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u))),
  inExpo: (u) => (u <= 0 ? 0 : Math.pow(2, 10 * clamp(u) - 10)),
  outBack: (u) => { u = clamp(u); const c = 1.70158; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; },
  smooth: (u) => smoother(0, 1, u),
};
// piecewise keyed value: keys = [[t, v, easeName?], ...] ; eases into each key
export function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) { const [t0, v0] = keys[i - 1]; const u = (ease[e || 'inOutCubic'])((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], u)) : lerp(v0, v1, u); }
  }
  return keys[keys.length - 1][1];
}
