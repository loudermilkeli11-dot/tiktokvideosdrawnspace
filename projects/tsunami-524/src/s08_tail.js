// s08_tail (film 24.0–27.5): "1.3 billion km³ of ocean. Gone." Wide orbit, slow dolly: a brown-grey Earth, its sea floors
// bare, inside the ocean shell that keeps flying outward at escape speed (shellKm, the same 60x time-lapse), thinning and
// glittering in the sunlight as it goes (its brightness follows oceanLeft: 100% -> 0%).
import { createStudio, THREE, makeSpace, aimFor, dirLL, qn, SUN } from './spacekit.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { SHOT, shellKm, oceanLeft } from './story.js';
const F0 = SHOT.s08_tail.t0, DUR = SHOT.s08_tail.dur;
const S = createStudio({ samples: 4, near: 50, far: 3e6,
  post: { exposure: 1.0, bloom: 0.2, bloomThreshold: 1.3, bloomRadius: 0.6, vignette: 0.38, grain: 0.022, ca: 0.0006, sat: 1.06, contrast: 1.05 } });
const { SP, SH, sun } = makeSpace(S, { clouds: 0.3, glare: 0.7 });
SP.EU.seabed.value = 1;
const CAMDIR = dirLL(qn('lon', -160), qn('lat', 16));
S.run((t) => {
  const tt = t - 4, ft = F0 + tt, u = ease.inOutSine(clamp(tt / DUR)), left = oceanLeft(ft);
  SH.update(S, t, { h: shellKm(ft), show: true });
  SH.U.fresh.value = 0; SH.U.waterI.value = 0.15 + 0.85 * left; SH.U.glint.value = 1.6; SH.U.time.value = ft * 3;
  const mm = qn('mm', 40), dist = lerp(qn('d0', 36000), qn('d1', 33000), u);
  const pos = CAMDIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.02, -0.04, u)).multiplyScalar(dist);
  applyCam(S.camera, { pos, look: aimFor(pos, 270, qn('sy', 470), mm), mm, roll: lerp(-8, -10, u) }, shake(t, 0.015, 0.4, 5));
  SP.earth.rotation.y = tt * 0.01;
  SP.update(S, t); sun.position.copy(S.camera.position).add(SUN); sun.target.position.copy(S.camera.position);
});
