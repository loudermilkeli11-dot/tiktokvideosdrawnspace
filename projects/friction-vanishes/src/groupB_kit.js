// friction-vanishes GROUP B helpers (s03_minute, s04_quay, s05_town). Builder B owns this file; the shared kit stays untouched.
//   slideS / slideV:  the story.js slope law (a = g sin10 - (k/m) v|v|) from ANY initial speed along the fall line (closed form),
//                     so a car already driving up or down the hill when friction goes obeys the same law as a parked one.
//   gridSlide:        a loose object in the tilted street grid (kit hillWorld): free along the downhill (Z) streets, pressed against
//                     the downhill facade in the level cross (X) streets, released into a Z street when it drifts into one.
//   darkSpray:        a spray layer lit as shadowed muddy harbour water (the 17.5 s wipe must darken, never flash white).
import { THREE } from '@engine/engine.js';
import { createSpray } from '@engine/splash.js';
import { VT, TC, slopeX, slopeV, slopeTimeTo } from './story.js';
import { SL } from './kit.js';

// ---- the slope law from an initial speed v0 (m/s along the fall line, + = downhill). tau >= 0.
export function slideS(v0, tau) {
  if (tau <= 0) return 0;
  if (v0 >= 0) { const a = Math.atanh(Math.min(v0 / VT, 0.999999)); return VT * TC * (Math.log(Math.cosh(tau / TC + a)) - Math.log(Math.cosh(a))); }
  const b = Math.atan(-v0 / VT), ts = b * TC;                         // moving uphill: gravity AND drag slow it; stops at ts
  if (tau <= ts) return -VT * TC * (Math.log(Math.cos(b - tau / TC)) - Math.log(Math.cos(b)));
  return VT * TC * Math.log(Math.cos(b)) + slopeX(tau - ts);
}
export function slideV(v0, tau) {
  if (tau <= 0) return v0;
  if (v0 >= 0) return VT * Math.tanh(tau / TC + Math.atanh(Math.min(v0 / VT, 0.999999)));
  const b = Math.atan(-v0 / VT), ts = b * TC;
  return tau <= ts ? -VT * Math.tan(b - tau / TC) : slopeV(tau - ts);
}

// ---- the street grid of hillWorld (city.js: streets every 120 m, 24 m kerb-to-facade incl. pavements; roadway +-7 m)
const streetC = (v) => 60 + 120 * Math.round((v - 60) / 120);     // nearest street centre line SL(k)
export const inZStreet = (x) => Math.abs(x - streetC(x)) < 12;
// o: { x0, z0, vx (m/s along X, level), vz (m/s along Z at tau 0, + downhill), hx, hz (half extents along X/Z), kerb (true: cars stay
// on the roadway, +-7 m; false: may use the pavement, +-12 m) }  -> { x, z, vx, vz }
export function gridSlide(o, tau) {
  const lim = o.kerb === false ? 12 : 7;
  if (inZStreet(o.x0)) {
    const cx = streetC(o.x0);
    return { x: THREE.MathUtils.clamp(o.x0 + (o.vx || 0) * tau, cx - lim + o.hx, cx + lim - o.hx), z: o.z0 + slideS(o.vz || 0, tau), vz: slideV(o.vz || 0, tau) };
  }
  // level cross street: slides sideways (+Z) until it presses on the downhill facade, keeps any X speed (nothing to stop it)
  const cz = streetC(o.z0), zc = Math.max(o.z0, cz + 12 - o.hz), vx = o.vx || 0;
  let tr = Infinity, cx = 0;
  if (vx !== 0) { const cn = vx > 0 ? streetC(o.x0 + 60) : streetC(o.x0 - 60); cx = cn; tr = ((vx > 0 ? cn - 12 : cn + 12) - o.x0) / vx; if (tr < 0) tr = Infinity; }
  const th = zc > o.z0 ? slopeTimeTo(zc - o.z0) : 0;
  const zAt = (t) => o.z0 + Math.min(slopeX(t), zc - o.z0);
  if (tau < tr) return { x: o.x0 + vx * tau, z: zAt(tau), vz: tau < th ? slopeV(tau) : 0 };
  const zr = zAt(tr), vr = tr < th ? slopeV(tr) : 0;
  return { x: THREE.MathUtils.clamp(o.x0 + vx * tau, cx - lim + o.hx, cx + lim - o.hx), z: zr + slideS(vr, tau - tr), vz: slideV(vr, tau - tr) };
}

// ---- dark wet spray (droplets/sheets) for the spray wipe: same particles as splash.createSpray, lit as the shadow side
export function darkSpray(S, parts, o = {}) {
  const sp = createSpray(S, parts.length ? parts : [{ p: [0, -500, 0], v: [0, 0, 0], t0: 1e5, size: 1 }], { renderOrder: o.renderOrder ?? 40, hazeD: 4000 });
  sp.U.amb.value.set(o.amb ?? 0x2a2a22); sp.U.sunI.value = o.sunI ?? 0.22; sp.U.sunCol.value.set(0xd8c8a8); sp.U.streak.value = o.streak ?? 1 / 20;
  return sp;
}
// hide a list of meshes from the ocean mirror (API R10)
export function hideFromMirror(ocean, meshes) {
  const ob = ocean.refl.onBeforeRender;
  ocean.refl.onBeforeRender = (r, sc, cam) => { const vis = meshes.map((m) => m.visible); meshes.forEach((m) => { m.visible = false; }); ob(r, sc, cam); meshes.forEach((m, i) => { m.visible = vis[i]; }); };
}
export { SL };
