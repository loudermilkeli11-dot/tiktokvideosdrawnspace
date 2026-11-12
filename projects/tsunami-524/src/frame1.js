// The frame-1 world, shared by s01_bay and s09_loop (so the loop's last second IS the second before frame 1).
// Noon fjord bay from behind the hero at the pier rail (FRAME1_CAM, 28 mm, locked). ft = film time: < 0 calm (the loop),
// 0..1.5 the crack opens and the slab slides down the head wall, gulls burst, the crowd points; impact at T.impact.
import { createStudio, THREE, makeWorld, makeRockfall, makePierPeople, frame1Cam, SUN } from './kit.js';
import { applyCam, shake } from '@engine/camera.js';

export function frame1World(o = {}) {
  const S = createStudio({ samples: o.samples ?? 4, shadows: true, near: 1.0, far: 2e5,
    post: { exposure: 1.0, bloom: 0.05, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.06 } });
  const W = makeWorld(S, { shadows: true, boats: 16 });
  const RF = makeRockfall(S, W);
  const PP = makePierPeople(S, W);
  const CAM = frame1Cam(W);
  const update = (ft, t) => {
    applyCam(S.camera, CAM, shake(t, 0.015, 0.6, 2));
    W.update(t, { shadowCenter: PP.hero.root.position.clone() });
    W.placeBoats(t);
    RF.update(ft); PP.update(ft, t);
  };
  return { S, W, RF, PP, CAM, update };
}
