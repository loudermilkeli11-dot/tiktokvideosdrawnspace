// s02_cliff (film 1.5–4.5): the impact, then the RUN-UP. Low, near the water at the head of the fjord, looking along the head
// wall: the slab's splash erupts, and a torn white sheet of water races up the forested slope, snapping the conifers, to the
// real 524 m mark at T.runupTop (4.1 s), leaving the trimline (bare soil below, forest above). The camera tilts up with the
// front (50 -> 35 mm) and whip-pans out at the end.
import { createStudio, THREE, makeWorld, makeRockfall, SUN, qn } from './kit.js';
import { makeRunup, slopeZ } from './runup.js';
import { applyCam, shake, kick, whip } from '@engine/camera.js';
import { ease, clamp, lerp, sstep } from '@engine/util.js';
import { SHOT, T, runupAt } from './story.js';
const F0 = SHOT.s02_cliff.t0, DUR = SHOT.s02_cliff.dur;
const S = createStudio({ samples: 8, near: 1, far: 2e5,
  post: { exposure: 1.0, bloom: 0.07, bloomThreshold: 2.6, bloomRadius: 0.55, vignette: 0.22, grain: 0.014, ca: 0.0008, sat: 1.12, contrast: 1.07 } });
const W = makeWorld(S, { boats: 0 });
const RF = makeRockfall(S, W);
const IP = RF.posAt(T.impact);
const RU = makeRunup(S, W, { impact: { x: IP.x, z: Math.max(IP.z, -4230) }, film0: F0 });
const CAM = new THREE.Vector3(qn('cx', 1150), qn('cy', 45), qn('cz', -3250));
const XL = qn('xl', -200);
S.run((t) => {
  const tt = t - 4, ft = F0 + tt, h = Math.max(runupAt(ft), 0);
  const u = ease.inOutSine(clamp(tt / DUR));
  const lh = Math.min(h, 524) * 0.55 + 90, look = new THREE.Vector3(XL, lh, slopeZ(XL, Math.max(lh * 0.7, 5)));
  const mm = lerp(qn('mm0', 45), qn('mm1', 32), u);
  const st = { pos: CAM.clone().add(new THREE.Vector3(-30 * u, 10 * u, 0)), look, mm, roll: lerp(-1.5, 1.5, u) };
  const sh = shake(t, 0.08 + 0.9 * kick(ft, T.impact + 0.05, 1.8), 1.6, 4);
  sh[0] += whip(tt, DUR - 0.12, 0.36, qn('whip', 38));
  applyCam(S.camera, st, sh);
  W.update(t, { shadowCenter: CAM });
  RF.update(ft); RU.update(ft, t);
});
