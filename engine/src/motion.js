// Smooth people: pose changes with NO snapping, plus constant small "alive" motion.
// Why: figure.js poses are polygonised meshes (cached per pose), so a blend can only move through precomputed in-between
// shapes. Few in-betweens (3) over short blends (0.1-0.15 s) read as twitching (no-empty-space s01/s02, Commander 2026-11-13).
// Here every blend gets ONE in-between per film frame, eased in and out, and blends are at least `minBlend` long.
//   import { posePlayer, alive } from '@engine/motion.js';
//   const pp = posePlayer(hero, [[-99, 'stand'], [2.0, 'handsHead', 0.4], [3.5, 'point', 0.5]]);  // [film t, pose, blend s]
//   update: pp.apply(film); alive(hero, film, { seed: 3 });           // alive: breathing, weight shift, head drift
// Load cost: one polygonisation per in-between (~blend x 30). Keep blends 0.3-0.7 s; a fast startle is 0.25 s at the least.
// Every person on screen should have alive() (or be walking): a frozen statue next to a moving one reads as a glitch.
import { POSES } from './figure.js';

const lerpDeep = (a, b, u) => {
  if (typeof a === 'number' && typeof b === 'number') return +(a + (b - a) * u).toFixed(4);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpDeep(v, b[i] ?? v, u));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (k in a && k in b) ? lerpDeep(a[k], b[k], u) : (u < 0.5 ? (a[k] ?? b[k]) : (b[k] ?? a[k])); return o; }
  return u < 0.5 ? a : b;
};
const full = (p) => ({ head: [0, 0], lean: 0, hip: 0, twist: 0, ...POSES.stand, ...(typeof p === 'string' ? POSES[p] : p) });
export const poseMix = (a, b, u) => lerpDeep(full(a), full(b), u);
const smooth = (x) => x * x * (3 - 2 * x);

// keys: [[film t, pose name | pose object, blend s]]; the blend starts at t and ends at t + blend.
// o: { fps 30, minBlend 0.25, phone (force a phone hand or null) }
export function posePlayer(h, keys, o = {}) {
  const fps = o.fps ?? 30, minBlend = o.minBlend ?? 0.25;
  keys = keys.map((k, i) => (i === 0 ? k : [k[0], k[1], Math.max(minBlend, k[2] ?? 0.4)]));
  const steps = keys.map((k, i) => (i === 0 ? 0 : Math.max(2, Math.ceil(k[2] * fps))));
  const cache = new Map();
  const mid = (i, s) => { const key = i + ':' + s; if (!cache.has(key)) { const p = poseMix(keys[i - 1][1], keys[i][1], smooth(s / steps[i]));
    if (o.phone !== undefined) p.phone = o.phone; cache.set(key, p); } return cache.get(key); };
  const at = (film) => {
    let i = 0; while (i + 1 < keys.length && film >= keys[i + 1][0]) i++;
    if (i === 0 || film >= keys[i][0] + keys[i][2]) return keys[i][1];
    const s = Math.round((film - keys[i][0]) / keys[i][2] * steps[i]);
    return s <= 0 ? keys[i - 1][1] : s >= steps[i] ? keys[i][1] : mid(i, s);
  };
  // precompute every pose and in-between at load, so frames only hit the cache
  for (let i = 0; i < keys.length; i++) { h.setPose(keys[i][1]); for (let s = 1; i > 0 && s < steps[i]; s++) h.setPose(mid(i, s)); }
  h.setPose(keys[0][1]);
  return { at, apply(film) { h.setPose(at(film)); } };
}

// Small continuous life on the whole body (no geometry rebuild): breathing bob, a slow weight shift (roll) and a
// little turn. Applied to h.mesh relative to its rest transform, so the shot keeps full control of h.root.
// o: { seed, amount 1 (0.5 calm, 1.5 agitated), sitting false (half the sway) }
export function alive(h, film, o = {}) {
  const m = h.mesh || h.root; if (!m) return;
  if (!m.userData._rest) m.userData._rest = { y: m.position.y, rz: m.rotation.z, ry: m.rotation.y };
  const r = m.userData._rest, s = (o.seed ?? 1) * 1.731, k = (o.amount ?? 1) * (o.sitting ? 0.5 : 1);
  m.position.y = r.y + 0.006 * k * Math.sin(film * 2 * Math.PI / (3.6 + (s % 1.3)) + s);
  m.rotation.z = r.rz + 0.018 * k * Math.sin(film * 2 * Math.PI / (5.5 + (s % 2.1)) + s * 2.3);
  m.rotation.y = r.ry + 0.04 * k * Math.sin(film * 2 * Math.PI / (7.9 + (s % 3.2)) + s * 0.7);
}
