// s13_space (film 58–66, 240 frames): the reveal from orbit. Earth wrapped in the Moon's debris ring.
// Ends with Earth's disc exactly where frame 1's Moon sits (centre ~(290,580) design px, radius ~200 px) -> loop cut.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
const D2R = Math.PI / 180;
const S = createStudio({ samples: 8, near: 50, far: 5e6, post: { exposure: 1.05, bloom: 0.28, bloomThreshold: 1.3, vignette: 0.45, grain: 0.03, sat: 1.05 } });
const SP = createSpace(S, { sunDir: [0.92, 0.34, 0.52], ringIn: 1.22, ringOut: 2.55, ringI: 1.1, earthYaw: 2.2, stars: 0.3, sunI: 1.7 });
SP.ring.rotation.set(-Math.PI / 2 + 0.62, 0.0, 0.28);
const MM = 50, DUR = 8;
// camera on a slow pull-back + orbit; aim keeps Earth's centre at a chosen screen point
function camAt(tt) {
  const u = ease.inOutCubic(clamp(tt / (DUR - 0.4)));               // camera moves may ease; the story law is unaffected
  const dist = lerp(26000, 44300, u);                                // ends: RE / sin(8.26 deg) = 44,330 km -> radius 200 px at 50 mm
  const az = lerp(0.5, 0.1, u), el = lerp(0.3, 0.42, u);
  const pos = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
  return { pos, u };
}
function aimFor(pos, sx, sy) { // look direction such that the Earth centre lands at design pixel (sx, sy)
  const toE = pos.clone().negate().normalize(); const vf = lensFov(MM) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
S.run((t) => {
  const tt = Math.max(t - 4, 0); const { pos, u } = camAt(tt);
  // screen target for the Earth centre: starts low-left (limb + sunrise fills the frame), settles on frame 1's Moon position
  const sx = lerp(330, 290, u), sy = lerp(800, 580, u);
  applyCam(S.camera, { pos, look: aimFor(pos, sx, sy), mm: MM, roll: lerp(-6, 0, u) }, shake(t, 0.04 * (1 - u), 0.6));
  SP.update(S, t);
});
