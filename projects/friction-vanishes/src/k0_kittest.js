// k0_kittest: lead's check page for the shared kit (NOT a film shot). ?set=cross (FRAME1_CAM, the hero car braking at tau = shot time)
// | ?set=hillup (s02 view: bottom junction, 50 mm, uphill) | ?set=hilldown (s03 view: top, 24 mm, down to the harbour)
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { crossingWorld, hillWorld, FRAME1_CAM, POST_DAY, Q, MAIN_X, ZQ, TOP_Z, groundY, hillQ, onHill } from './kit.js';
import { slideSkidX } from './story.js';
const set = Q.get('set') || 'cross';
const S = createStudio({ samples: 2, shadows: true, post: POST_DAY });
let W;
if (set === 'cross') W = crossingWorld(S, {});
else W = hillWorld(S, {});
S.run((t) => {
  const tt = Math.max(t - 4, 0);
  if (set === 'cross') {
    applyCam(S.camera, FRAME1_CAM);
    W.update(t, { tau: tt, T: 5 });
  } else if (set === 'hillup') {
    const z0 = ZQ - 8, pos = new THREE.Vector3(MAIN_X - 3, groundY(0, z0) + 1.8, z0);
    applyCam(S.camera, { pos, look: pos.clone().add(new THREE.Vector3(0.02, Math.tan(7 * Math.PI / 180), -1)), mm: 50 });   // near-level gaze: the street climbs through the frame
    W.update(t, { tau: tt, carPose: (c, i, tau) => (c.lane.axis === 'z' && Math.abs(c.lane.c - MAIN_X) < 8 ? { p: onHill(c.x0, c.z0 + slideSkidX(tau, 5)), q: hillQ(c.yaw) } : undefined) });
  } else {
    const pos = new THREE.Vector3(MAIN_X - 4, groundY(0, TOP_Z) + 16, TOP_Z - 10);
    applyCam(S.camera, { pos, look: new THREE.Vector3(MAIN_X, groundY(0, ZQ - 120), ZQ - 120), mm: 24 });
    W.update(t, { tau: tt });
  }
});
