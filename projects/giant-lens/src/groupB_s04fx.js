// giant-lens group B (session 3c): s04_bay helpers. Pure functions of shot time (deterministic).
//   boilSpray(S, ocean, pathAt, ranges, o): N5 boil jet: where the spot is on water, crisp white droplets + small clumps rise from
//     the spot and a thin vertical jet of fine droplets climbs out of its centre (kinds 0/1 only, no fluffy veil). Hidden from the
//     ocean mirror by the caller (hideFromMirror). pathAt(tt) -> { p: Vector3, w: spot diameter }. ranges: [[tt0, tt1]] on water.
//   passTimes(pts, pathAt, t0, t1, r): for each point, the first shot time the spot (radius w/2 + r) covers it (else 99).
//   hideFromMirror(ocean, meshes)
import { createSpray } from '@engine/splash.js';
import { rng } from '@engine/util.js';
import { SUN } from './kit.js';

export function hideFromMirror(ocean, meshes) {
  const ob = ocean.refl.onBeforeRender;
  ocean.refl.onBeforeRender = (r, sc, cam) => { const v = meshes.map((m) => m.visible); meshes.forEach((m) => { m.visible = false; }); ob(r, sc, cam); meshes.forEach((m, i) => { m.visible = v[i]; }); };
}

// o: { seed, rate (emissions/s), per (parts per emission), jetV, scale, jetK (share of jet parts), sheetK (share of clumps), page 4 }
export function boilSpray(S, ocean, pathAt, ranges, o = {}) {
  const R = rng(o.seed ?? 404), parts = [], rate = o.rate ?? 60, per = o.per ?? 9, k = o.scale ?? 1, PAGE = o.page ?? 4, jetV = o.jetV ?? 24;
  const jK = o.jetK ?? 0.35, sK = o.sheetK ?? 0.15;
  for (const [a, b] of ranges) for (let tt = a; tt < b; tt += 1 / rate) {
    const { p, w } = pathAt(tt), r0 = w * 0.5;
    for (let i = 0; i < per; i++) {
      const an = R() * 6.283, rr = r0 * Math.sqrt(R()), x = p.x + Math.cos(an) * rr, z = p.z + Math.sin(an) * rr, u = R();
      if (u < jK) {            // the thin vertical jet: fine droplets, fast, narrow
        parts.push({ p: [p.x + (R() - 0.5) * r0 * 0.5, 0.2, p.z + (R() - 0.5) * r0 * 0.5], v: [(R() - 0.5) * 1.6 * k, jetV * k * (0.6 + 0.5 * R()), (R() - 0.5) * 1.6 * k],
          t0: tt + PAGE, size: (0.06 + R() * 0.1) * k, drag: 0.12, life: 2.4, kind: 0, shade: 1 });
      } else if (u < 1 - sK) { // boiling droplets thrown up from the whole spot
        parts.push({ p: [x, 0.15, z], v: [(R() - 0.5) * 5 * k, (4 + 12 * R()) * k, (R() - 0.5) * 5 * k], t0: tt + PAGE, size: (0.08 + R() * 0.16) * k, drag: 0.2, life: 2.2, kind: 0, shade: 0.95 });
      } else {                 // small crisp clumps at the surface
        parts.push({ p: [x, 0.2, z], v: [(R() - 0.5) * 3 * k, (2 + 5 * R()) * k, (R() - 0.5) * 3 * k], t0: tt + PAGE, size: (0.25 + R() * 0.4) * k, drag: 0.4, life: 1.2, kind: 1, shade: 1 });
      }
    }
  }
  const spray = createSpray(S, parts.length ? parts : [{ p: [0, -500, 0], v: [0, 0, 0], t0: 1e5, size: 1 }], { hazeD: o.hazeD ?? 6000 });
  spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 15;
  spray.count = parts.length;
  return spray;
}

export function passTimes(pts, pathAt, t0, t1, r = 0.5, dt = 1 / 120) {
  const out = pts.map(() => 99);
  for (let tt = t0; tt <= t1; tt += dt) { const { p, w } = pathAt(tt), R2 = (w / 2 + r) ** 2;
    pts.forEach((q, i) => { if (out[i] < 98) return; const dx = q.x - p.x, dz = q.z - p.z; if (dx * dx + dz * dz < R2) out[i] = tt; }); }
  return out;
}
