// s01_plaza: FRAME 1. A busy lunchtime plaza: fountain, traffic on the north avenue, pigeons, towers. Slow push-in.
// The countdown runs 03.000 -> 0 over this shot (counter in overlay.js); the world is calm, with small signs of life.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { cityWorld, D2R } from './citykit.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: 2, shadows: true, post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const CAM0 = new THREE.Vector3(-5, 1.75, 27);
const W = cityWorld(S, { shadows: true, keepOut: [[-5, 27, 7.5]] });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s01_plaza', tt);
  const pos = CAM0.clone().add(new THREE.Vector3(0.2 * tt, 0, -0.8 * tt));          // steady push toward the fountain
  applyCam(S.camera, { pos, look: new THREE.Vector3(5, 9, -90), mm: 24, roll: 0 }, shake(t, 0.02, 0.7, 2));
  W.update(t, { tau, T: 5, focus: new THREE.Vector3(0, 0, 0) });
});
