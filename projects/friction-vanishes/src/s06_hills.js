// s06_hills (film 22.0-26.5; step 3, tau 0 -> 4.5, friction off for 10 min). N3: the ground itself flows.
// From the water (y ~3 m) inside the bay, 35 mm, looking up the west headland and the hills behind the town (the normal
// world at tau 0: green hills, houses, trees). Grain friction is gone, so the soil skin slides off every slope at flowX(tau)
// (story.js; staged 9 m/s top speed): the ground's texture travels downhill, wet brown soil tears open along the fall line,
// trees and houses ride it intact, and a brown sediment plume fans out into the bay from the shore.
// Ends on a crane UP (>= 4 m/s over the last 0.5 s, slight tilt down) that s07 continues at aerial height.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createBoats } from '@engine/splash.js';
import { waveHeight, waveSlope } from '@engine/ocean.js';
import { POST_DAY, lookDir, qn, D2R } from './kit.js';
import { tauAt, flowX } from './story.js';
import { flowWorld, sField } from './groupC_flow.js';

const S = createStudio({ samples: 8, shadows: true, near: 0.5, far: 60000, post: { ...POST_DAY } });
// camera: in the lagoon ~130 m off the west headland's inner shore, looking SW up its face (yaw 0 = -Z, + = +X)
const CAM0 = new THREE.Vector3(qn('cx', -283), 3, qn('cz', -1407)), YAW = qn('yaw', -25), PITCH = qn('pitch', 6);
const W = flowWorld(S, { mode: 'flow', waveAmp: 0.35, box: 340,
  trees: { eye: [CAM0.x, CAM0.z], heading: YAW * D2R, d0: 90, d1: 1300, deg: 22, n: 1400, seed: 41 } });
// a few moored boats between the lens and the shore (the normal world; crew-free)
const BT = createBoats(S, 4, { seed: 5 });
const BOATS = [[-326, -1453, 0.6, 8], [-296, -1495, 2.2, 7], [-262, -1462, 1.1, 10]].filter(([x, z]) => sField(x, z) < -12);
const bq = new THREE.Quaternion(), be = new THREE.Euler(), bp = new THREE.Vector3();
const DUR = 4.5;
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s06_hills', tt), fD = flowX(tau);
  // crane: slow rise, then >= 4 m/s over the last 0.5 s (handshake to s07), easing into a slight tilt down
  const up = Math.max(0, tt - 3.3), y = 3 + 0.7 * tt + 5.5 * up * up;
  const fwd = 2.0 * tt;
  const pos = CAM0.clone().add(new THREE.Vector3(Math.sin(YAW * D2R) * fwd, y - 3, -Math.cos(YAW * D2R) * fwd));
  const pitch = PITCH - 6 * Math.min(1, up / 1.2) ** 2;
  applyCam(S.camera, { pos, look: lookDir(pos, YAW + 1.5 * tt, pitch), mm: 35, roll: 0 }, shake(t, 0.05 + 0.04 * Math.min(1, tau / 2), 0.9, 6));
  BOATS.forEach(([x, z, yaw, L], i) => { const h = waveHeight(x, z, t, 0.35, 0), [gx, gz] = waveSlope(x, z, t, 0.35);
    BT.setBoat(i, bp.set(x, h + 0.1, z), bq.setFromEuler(be.set(Math.atan(gz) * 0.8, yaw, -Math.atan(gx) * 0.8, 'YXZ')), L); });
  for (let i = BOATS.length; i < 4; i++) BT.hide(i);
  BT.commit();
  // the sediment plume grows with the flow (reach in metres from the shore)
  W.update(S, t, { fD, sedR: 15 + 9 * fD, sedA: Math.min(1, fD / 3), focus: new THREE.Vector3(-380, 30, -1560) });
});
