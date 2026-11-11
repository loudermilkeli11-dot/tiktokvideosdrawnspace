// Camera language: lenses (mm), eased keyframe paths (Catmull-Rom), smoothed-noise shake, whip pans.
import * as THREE from 'three';
import { ease, clamp, fbm, lerp, smoother } from './util.js';
// vertical FOV for a 9:16 frame whose long (vertical) side is 36 mm (full-frame sensor turned sideways)
export const lensFov = (mm) => THREE.MathUtils.radToDeg(2 * Math.atan(18 / mm));
const v3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(...a));
function cr(p0, p1, p2, p3, u) { // uniform Catmull-Rom
  const u2 = u * u, u3 = u2 * u;
  return new THREE.Vector3().addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u).addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1).addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u).addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
}
// keys: [{t, pos:[x,y,z], look:[x,y,z], mm, roll(deg), ease:'inOutCubic'}] (ease applies to the segment ENDING at this key)
export class Path {
  constructor(keys) { this.k = keys.map((k) => ({ ...k, P: v3(k.pos), L: v3(k.look) })); }
  at(t) {
    const k = this.k; if (k.length === 1 || t <= k[0].t) return this._st(k[0], k[0], 0);
    if (t >= k[k.length - 1].t) return this._st(k[k.length - 1], k[k.length - 1], 0);
    let i = 0; while (t > k[i + 1].t) i++;
    const a = k[i], b = k[i + 1]; const u = (ease[b.ease || 'inOutCubic'])((t - a.t) / (b.t - a.t));
    const p0 = k[Math.max(0, i - 1)], p3 = k[Math.min(k.length - 1, i + 2)];
    return { pos: cr(p0.P, a.P, b.P, p3.P, u), look: cr(p0.L, a.L, b.L, p3.L, u), mm: lerp(a.mm ?? 35, b.mm ?? a.mm ?? 35, u), roll: lerp(a.roll ?? 0, b.roll ?? 0, u) };
  }
  _st(a) { return { pos: a.P.clone(), look: a.L.clone(), mm: a.mm ?? 35, roll: a.roll ?? 0 }; }
}
// smoothed handheld/impact shake -> [yaw, pitch, roll] in degrees
export function shake(t, amp = 0.3, freq = 1.2, seed = 1) {
  return [fbm(t * freq, seed) * amp, fbm(t * freq, seed + 31) * amp * 0.8, fbm(t * freq * 0.7, seed + 77) * amp * 0.5];
}
// impact shake envelope: kicks at t0, decays over dur
export const kick = (t, t0, dur = 1.2) => (t < t0 ? 0 : Math.exp(-3.5 * (t - t0) / dur) * smoother(0, 0.06, t - t0));
// whip-pan yaw offset (deg) from 0 to `deg` centered at t0 over dur (fast middle -> motion blur does the rest)
export const whip = (t, t0, dur, deg) => deg * ease.inOutQuint((t - (t0 - dur / 2)) / dur);
// apply state + shake to a THREE camera
export function applyCam(cam, st, sh = [0, 0, 0]) {
  cam.position.copy(st.pos); cam.up.set(0, 1, 0); cam.lookAt(st.look);
  cam.rotateY(THREE.MathUtils.degToRad(sh[0])); cam.rotateX(THREE.MathUtils.degToRad(sh[1])); cam.rotateZ(THREE.MathUtils.degToRad((st.roll || 0) + sh[2]));
  cam.fov = lensFov(st.mm); cam.updateProjectionMatrix();
}
