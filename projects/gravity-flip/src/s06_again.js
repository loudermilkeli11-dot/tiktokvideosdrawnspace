// s06_again: "Now make it one minute." A whip-pan rewind lands back on the calm plaza (frame-1 framing); the counter re-arms
// for step 2 (T = 60 s). τ −1.5 → 0. The first 0.35 s is a fast blurred whip.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip } from '@engine/camera.js';
import { cityWorld, D2R } from './citykit.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: (t) => (t - 4 < 0.4 ? 12 : 2), shadows: true, post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const CAM0 = new THREE.Vector3(-5, 1.75, 27);
const W = cityWorld(S, { shadows: true, keepOut: [[-5, 27, 7.5]] });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s06_again', tt);
  const w = -70 + whip(tt, 0.175, 0.35, 70);                           // degrees of yaw: -70 -> 0 over the first 0.35 s
  const pos = CAM0.clone().add(new THREE.Vector3(0.2 * tt, 0, -0.8 * tt));
  const yaw = (w + 0) * D2R; const base = new THREE.Vector3(5, 9, -90).sub(pos); const dir = base.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  applyCam(S.camera, { pos, look: pos.clone().add(dir), mm: 24, roll: 0 }, shake(t, 0.02, 0.7, 2));
  W.update(t, { tau, T: 60, focus: new THREE.Vector3(0, 0, 0) });
});
