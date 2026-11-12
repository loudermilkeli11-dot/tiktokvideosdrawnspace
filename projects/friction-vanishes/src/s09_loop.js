// s09_loop (film 37.0-38.0, tau -1 -> -1/30): the NORMAL world one second before frame 1. Same world, camera and clock as
// s01_crossing (groupA_crossing.js): the red car at 50 km/h (story.js brakeCarX, tau < 0), the signal turns red at tau -0.8,
// brake lights + squeal + skid marks from tau -0.3 (real grip). Its last frame differs from s01's frame 0 only by 1/30 s.
import { createStudio } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { POST_DAY } from './kit.js';
import { crossingA, camA } from './groupA_crossing.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: 12, shadows: true, post: POST_DAY });
const A = crossingA(S);
S.run((t) => {
  const tt = t - 4, tau = tauAt('s09_loop', tt);           // -1 -> 0 (unclamped like s01, so the blur matches at the loop)
  const { st, sh } = camA(tau, 0);                          // locked, no shake (s01's shake only builds from 0.5 s)
  applyCam(S.camera, st, sh);
  A.update(tau);
});
