// gravity-flip city kit (lead-owned): one consistent sunny downtown for s01/s02/s03/s06. Everything loose follows the law.
//   const W = cityWorld(S, { seed });  S.run((t) => { ...camera...; W.update(t, { tau, T }); });
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity, PERIOD, SL } from '@engine/city.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { rng } from '@engine/util.js';
import { heightAt } from './story.js';
export const D2R = Math.PI / 180;
// daywear (PALETTE is read when the crowd is built)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a, 0x4e8f3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22, 0x7a2e2e);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a, 0x3a3a3a);
export const SUN = new THREE.Vector3(0.55, 0.72, 0.42).normalize();
export function cityWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.7);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa9cff0);
  const sun = new THREE.DirectionalLight(0xfff1df, 3.2); sun.castShadow = !!o.shadows; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 1200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xb8d4f0, 0x8a8070, 1.0); scene.add(hemi);
  const C = createCity(S, { blocks: 3, seed: o.seed ?? 11, cars: 170 });
  // crowd: the plaza (not too near any lead camera; cameras keep >= 9 m from people) + the pavements of the north avenue
  const R = rng(31), people = [];
  for (let i = 0; i < 2000 && people.length < 320; i++) {
    const a = R() * Math.PI * 2, r = 8 + Math.pow(R(), 0.6) * 38; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > PERIOD / 2 - 13 || Math.abs(z) > PERIOD / 2 - 13) continue;
    if (o.keepOut && o.keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
    people.push({ x, z, y: 0, yaw: R() * 6.28 });
  }
  for (let i = 0; i < 60; i++) { const side = R() < 0.5 ? -1 : 1; people.push({ x: (R() - 0.5) * 300, z: SL(-1) + side * (12 - 2.5 - R() * 2), y: 0, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 }); }
  const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'filming', 'handsHead', 'stand', 'pocket', 'arms'], rimI: 0.25, seed: 9 });
  const birds = createBirds(S, 26, { flap: 10, seed: 5 });
  // props too close to a lead camera are cleared away (they would fill the lens)
  if (o.keepOut) C.props.forEach((p) => { if (o.keepOut.some(([kx, kz, kr]) => Math.hypot(p.x - kx, p.z - kz) < kr + 3)) p.y = -60; });
  // per-object tumble axes (deterministic) and traffic memory
  C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; c.x0 = c.x; c.z0 = c.z; });
  C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; });
  const W = { sky, sun, hemi, C, crowd, birds, people,
    // st: { tau (story s since the flip), T (flip length s), focus: Vector3 for the shadow box }
    update(t, st) {
      const tau = st.tau, T = st.T ?? 5, L = heightAt(tau, T), spin = tau > 0 ? Math.min(1, tau / 4) * (1 + 0.12 * Math.min(tau, 20)) : 0;
      // traffic drives until the flip; afterwards each car keeps its horizontal speed while it rises (momentum)
      const drive = (c) => c.v * c.lane.dir * (Math.min(tau, 0) + (tau > 0 ? tau : 0) + 30);
      C.cars.forEach((c) => { if (c.lane.axis === 'x') c.x = c.x0 + drive(c) - c.v * c.lane.dir * 30; else c.z = c.z0 + drive(c) - c.v * c.lane.dir * 30; });
      C.update(t, { lift: L, tumble: spin, waterLift: L });
      crowd.update(t, { agitation: tau > -1.2 ? 0.55 : 0.18, lift: L, tumble: spin * 1.3 });
      birds.update(t, (x) => new THREE.Vector3(-40 + x * 8, 24 + Math.sin(x) * 3 + L, -30 + Math.sin(x * 0.7) * 10), 9, 1.0);
      const f = st.focus || new THREE.Vector3(0, L, 0);
      sun.position.copy(SUN).multiplyScalar(500).add(f); sun.target.position.copy(f);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
      return { L, spin };
    } };
  return W;
}
