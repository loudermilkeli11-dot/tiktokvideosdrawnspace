// t01_light: wave test A (Gate 0, copied from projects/tsunami). Camera floats 28 m over the channel inside the bay, looking at the
// mouth: the wave rolls in from the open sea, swallows the lighthouse (crest passes it at tw ~2.2 s) and bears down on us.
import { createStudio, THREE, makeWorld, qn } from './tsukit.js';
import { applyCam, shake } from '@engine/camera.js';
import { dirB, D2R } from './tsukit.js';
const S = createStudio({ samples: 2, shadows: false, near: 0.5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.5, bloomRadius: 0.55, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const W = makeWorld(S, { boats: 12 });
const CAM = new THREE.Vector3(qn('cx', -40), qn('cy', 28), qn('cz', -1380));
const spray = W.makeSpray(0, 6);
S.run((t) => {
  const tt = Math.max(t - 4, 0), tw = tt;
  const dir = dirB(qn('b', 30)); dir.y = Math.tan(qn('pd', 4) * D2R); dir.normalize();
  applyCam(S.camera, { pos: CAM, look: CAM.clone().add(dir), mm: qn('mm', 28), roll: 0 }, shake(t, 0.08, 0.7, 4));
  W.update(t, tw, CAM); spray.update(t);
});
