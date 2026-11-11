// s11_end (film 35.0–38.0; after the return, τ 3400 s on). The quiet last image: Earth from orbit, scarred and dimmed,
// turning away from the Sun. The land scorched and scoured, the seas churned grey, embers glowing on the night side and
// most of the city lights gone; the sunlit crescent narrows as the planet turns into its own night. Slow pull-back.
// The last frame hard-cuts to frame 1 (the sunny plaza) on the loop's hit.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { tauAt } from './story.js';

const Q = new URLSearchParams(location.search);
const D2R = Math.PI / 180;
const S = createStudio({ samples: 2, near: 50, far: 3e6,
  post: { exposure: 1.0, bloom: 0.25, bloomThreshold: 1.0, bloomRadius: 0.6, vignette: 0.5, grain: 0.03, ca: 0.0006, sat: 1.0, contrast: 1.06 } });
const { camera } = S;
const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
const C = dirLL(+(Q.get('lon') ?? -50), +(Q.get('lat') ?? 12));
const EAST = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), C).normalize(), NORTH = new THREE.Vector3().crossVectors(C, EAST);
const SP = createSpace(S, { sunDir: [1, 0, 0], ring: false, stars: 0.36, sunI: 1.8, cityI: 1.0, sunGlare: 0 });
SP.EU.scar.value = 1; SP.EU.cloudsI.value = 0.35; SP.EU.atmI.value = 0.7; SP.EU.glowI.value = 0.035; SP.EU.glowCol.value.setRGB(1.0, 0.36, 0.1);
function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
const DUR = 3.0, Y = new THREE.Vector3(0, 1, 0);
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s11_end', tt), u = ease.inOutSine(clamp(tt / DUR));
  // the Sun swings round behind the planet (the visible face turns into night): the crescent on the left narrows
  const sa = lerp(+(Q.get('a0') ?? 92), +(Q.get('a1') ?? 116), u) * D2R;
  SP.sunDir.copy(C).multiplyScalar(Math.cos(sa)).addScaledVector(EAST, -Math.sin(sa) * 0.92).addScaledVector(NORTH, Math.sin(sa) * 0.39).normalize();
  SP.earth.rotation.y = (tau - 3400) * 0.004;                         // the planet turning (a little faster than true, slow on screen)
  SP.EU.cityI.value = 0.9; SP.EU.glowI.value = 0.03 * (1 - 0.3 * u);
  const mm = 35, pos = C.clone().multiplyScalar(lerp(21000, 23500, u));
  applyCam(camera, { pos, look: aimFor(pos, +(Q.get('sx') ?? 290), +(Q.get('sy') ?? 470), mm), mm, roll: lerp(-12, -14, u) }, shake(t, 0.015, 0.4, 9));
  SP.update(S, t);
});
