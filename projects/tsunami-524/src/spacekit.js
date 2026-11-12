// tsunami-524 orbit kit (s07–s09): Earth from orbit on the DAY side (space.js), the oceans lifting off as a shell (shell.js),
// the bare sea floor left behind (EU.seabed), the Sun. Units: km, Earth at the origin. Same set-up as gravity-flip's s09.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { createShell } from '@engine/shell.js';
import { lensFov } from '@engine/camera.js';
export { createStudio, THREE, RE };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(location.search);
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
// lat/lon -> unit vector in the Earth's frame (SphereGeometry UV parameterisation; Earth not rotated)
export const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
// the Sun over the North Pacific (towards Alaska's side of the planet): a day-side Earth full of ocean
export const SUN = dirLL(-150, 18);
export function makeSpace(S, o = {}) {
  const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: o.stars ?? 0.14, sunI: 1.45, seg: [512, 256], sunGlare: o.glare ?? 0.5 });
  SP.EU.cloudsI.value = o.clouds ?? 1; SP.EU.detail.value = 1;
  const SH = createShell(S, SP, { cloudH: 4, airH: 70, clear: 0 });
  SH.U.cloudI.value = 0; SH.U.airI.value = 0;          // only the water leaves; the clouds and the air stay home
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.0); sun.position.copy(SUN); S.scene.add(sun); S.scene.add(sun.target);
  return { SP, SH, sun };
}
// camera aim that puts Earth's centre at design pixel (sx, sy)
export function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
