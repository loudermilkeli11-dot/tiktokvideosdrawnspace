// giant-lens group B probe (dev only, not imported by any page): lists city.js buildings for seed 11 near a point.
// node engine/src/gl_groupB_probe.mjs [x] [z] [r]
function rng(seed) { let a = (seed * 2654435761) >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PERIOD = 120, STREET = 24, NB = 3, R = rng(11), B = [];
for (let bi = -NB; bi <= NB; bi++) for (let bj = -NB; bj <= NB; bj++) {
  if (bi === 0 && bj === 0) continue;
  const cx = bi * PERIOD, cz = bj * PERIOD, half = (PERIOD - STREET) / 2, d = Math.hypot(bi, bj);
  const nx = 1 + Math.floor(R() * 2), nz = 1 + Math.floor(R() * 2);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const w = (2 * half) / nx, dd = (2 * half) / nz; const x0 = cx - half + w * (i + 0.5), z0 = cz - half + dd * (j + 0.5);
    const tall = Math.max(0, 1 - d / (NB + 1.5)); const h = 22 + R() * 50 + tall * tall * (60 + R() * 170) * (R() < 0.75 ? 1 : 0.35);
    B.push({ i: B.length, bi, bj, x: x0, z: z0, w: w - 2 - R() * 3, d: dd - 2 - R() * 3, h, seed: R(), glass: R() < 0.55 + tall * 0.3 ? 1 : 0, hue: R() });
  }
}
const [px, pz, pr] = process.argv.slice(2).map(Number);
B.filter((b) => isNaN(px) || Math.hypot(b.x - px, b.z - pz) < pr).forEach((b) => console.log(JSON.stringify({ ...b, x: +b.x.toFixed(1), z: +b.z.toFixed(1), w: +b.w.toFixed(1), d: +b.d.toFixed(1), h: +b.h.toFixed(1), seed: +b.seed.toFixed(4),
  xr: +(b.x + b.w / 2).toFixed(1), zs: +(b.z + b.d / 2).toFixed(1) })));
