// s07_peel (film 19.5–24.0): "The water leaves the planet." Earth's day side from orbit; the oceans peel off as one shimmering
// shell (shell.js) and speed up: its height is the water's travel at waterSpeed (1,032 km/h -> escape speed at 23.0 s, story.js)
// in a 60x time-lapse (LAPSE). Behind it the sea floor lies bare. Slow pull-back 35 -> 50 mm, the limb across the frame.
import { createStudio, THREE, makeSpace, aimFor, dirLL, qn, SUN } from './spacekit.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp, sstep } from '@engine/util.js';
import { SHOT, shellKm } from './story.js';
const F0 = SHOT.s07_peel.t0, DUR = SHOT.s07_peel.dur;
const S = createStudio({ samples: 8, near: 50, far: 3e6,
  post: { exposure: 1.0, bloom: 0.18, bloomThreshold: 1.4, bloomRadius: 0.6, vignette: 0.36, grain: 0.022, ca: 0.0006, sat: 1.08, contrast: 1.04 } });
const { SP, SH, sun } = makeSpace(S, { clouds: 0.4 });
const CAMDIR = dirLL(qn('lon', -165), qn('lat', 22));
S.run((t) => {
  const tt = t - 4, ft = F0 + tt, h = shellKm(ft), u = ease.inOutSine(clamp(tt / DUR));
  SH.update(S, t, { h: Math.max(h, 0.4), show: true });
  SH.U.fresh.value = 1 - sstep(0.5, 40, h); SH.U.waterI.value = 1; SH.U.time.value = ft * 3;
  SP.EU.seabed.value = sstep(0.3, 6, h);
  const mm = lerp(qn('mm0', 32), qn('mm1', 45), u), dist = lerp(qn('d0', 11500), qn('d1', 17500), u);
  const pos = CAMDIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0, 0.06, u)).multiplyScalar(dist);
  applyCam(S.camera, { pos, look: aimFor(pos, lerp(262, 270, u), qn('sy', 1060), mm), mm, roll: lerp(-6, -3, u) }, shake(t, 0.02, 0.5, 3));
  SP.update(S, t); sun.position.copy(S.camera.position).add(SUN); sun.target.position.copy(S.camera.position);
});
