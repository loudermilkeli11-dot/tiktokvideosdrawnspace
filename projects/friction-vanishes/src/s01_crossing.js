// s01_crossing (film 0.0-4.0, tau 0 -> 4, step 1: T = 5 s). FRAME 1 IS ALREADY MOVING: the red car at 50 km/h, brake lights
// on, skid marks behind it, right at the stop line under a red light; the grip is gone, so it does not slow (story.js
// brakeCarX: 13.89 -> 13.63 m/s in 5 s, drag only) and slides through the zebra and the empty junction. A second braking car
// does the same; a taxi caught mid-turn goes dead straight and keeps spinning (kit spinCar). Walkers glide on, their feet go,
// they sit down hard. Cafe tables drift. The hero stands on the kerb. Last 0.35 s: whip-pan LEFT (yaw +70 deg) into s02.
// Shared frame-1 logic: groupA_crossing.js (s09_loop uses the same world, camera and clock).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, whip } from '@engine/camera.js';
import { sstep } from '@engine/util.js';
import { POST_DAY, D2R } from './kit.js';
import { crossingA, camA } from './groupA_crossing.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: 12, shadows: true, post: POST_DAY });
const A = crossingA(S);
// the whip into s02 is ONE move across the cut: yaw = whip(film t, 4.0, 0.7, 70) (s01 shows 0 -> 35 deg, s02 35 -> 70)
export const WHIP = { t0: 4.0, dur: 0.7, deg: 70 };
S.run((t) => {
  const tt = t - 4, tau = tauAt('s01_crossing', tt);        // unclamped: frame 0's blur sub-samples straddle tau 0 like s09's
  const { st, sh } = camA(tau, 0.035 * sstep(0.5, 1.6, tt));
  const w = whip(tt, WHIP.t0, WHIP.dur, WHIP.deg), up = 6 * (w / WHIP.deg);   // a little sky as it whips
  if (w > 0.001) { const dir = st.look.clone().sub(st.pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), w * D2R); dir.y += Math.tan(up * D2R); st.look = st.pos.clone().add(dir); }
  applyCam(S.camera, st, sh);
  A.update(tau);
});
