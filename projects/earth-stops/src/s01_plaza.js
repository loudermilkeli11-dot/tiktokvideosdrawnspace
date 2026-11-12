// s01_plaza (0.0-8.0 s, 240 fr, e 0 -> 0.583). The hero vantage: FRAME1_CAM on the 2nd-floor balcony, rail across the
// bottom. Frame 0 = the loop target (s09's last frame + 1/30 s). 1.0 s: the ground stops: a 4-frame jolt (kick, no flash),
// then every loose thing goes screen-right at V while trees and lamps stay. From 2.0 s a slow eased push-in on the lens
// (32 -> 35 mm: the rail sits 1.8 m ahead and near the bottom edge, so even a 0.3 m dolly drops it out); last 1.4 s an eased pan right
// (<= 9°) that is still moving at the cut, so the debris stream carries into s02 (match cut on motion).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { ease, clamp } from '@engine/util.js';
import { FRAME1_CAM, POST_DAY, SAMPLES, D2R } from './kit.js';
import { T_STOP } from './story.js';
import { plazaSet } from './groupA_plaza.js';

const S = createStudio({ samples: (t) => (t - 4 < T_STOP - 0.02 ? SAMPLES.s01_pre : SAMPLES.s01_plaza), shadows: true, post: { ...POST_DAY } });
const P = plazaSet(S);
const YAX = new THREE.Vector3(0, 1, 0);

export function camAt(tt) {
  const u = ease.inOutSine(clamp((tt - 2.0) / 6.0));
  const pos = FRAME1_CAM.pos.clone();
  const pan = 9 * Math.pow(clamp((tt - 6.6) / 1.4), 2);                             // eased in, still moving at 8.0
  const dir = FRAME1_CAM.look.clone().sub(FRAME1_CAM.pos).applyAxisAngle(YAX, -pan * D2R);
  return { pos, look: pos.clone().add(dir), mm: FRAME1_CAM.mm + 3 * u, roll: 0 };
}

S.run((t) => {
  const tt = t - 4, film = tt;                                                      // s01 starts at film 0 (no clamp: frame 0's blur sub-samples see film < 0, as s09's do)
  const k = kick(tt, T_STOP, 0.15);                                                 // 4 frames of jolt, nothing before 1.0
  applyCam(S.camera, camAt(tt), k > 0 ? shake(t, 0.9 * k, 14, 7) : [0, 0, 0]);
  P.update(film);
});
