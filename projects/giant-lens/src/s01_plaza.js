// s01_plaza (film 0.0-4.5, step 1, D = 20 m). Gate 0 shot. Page t = shot time + 4.
// Frame 0 = FRAME1_CAM exactly (no shake, no move before 1.5 s). The 20 m lens hangs over the plaza; its wide 6.3 m disc
// (C = 10 suns, 375 °C) snaps to a white-hot 0.19 m point by 1.0 s (story.focusC), drags a charring line to the parked car's
// roof (1.95), the roof smokes (2.0) and burns (2.55-3.0), the whole car by 3.4; the spot moves on into a ring tree's canopy
// (~3.6, flares) and east toward the street. The crowd runs clear. From 1.5 s a slow crane up + zoom 28 -> 33 mm keeps the
// glass face-on; 4.15-4.5 whips RIGHT (+65° at the cut, mid-whip, 12 samples) into s02.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip, kick } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { POST_DAY, SAMPLES, FRAME1_CAM, qn } from './kit.js';
import { buildPlaza } from './groupA_frame1.js';

const S = createStudio({ samples: (t) => (t - 4 > 4.08 ? 12 : SAMPLES.s01_plaza), shadows: false, post: POST_DAY });
const P = buildPlaza(S);
const Y = new THREE.Vector3(0, 1, 0);
const POS1 = new THREE.Vector3(qn('px', 15.0), qn('py', 8.5), qn('pz', 44.5)), LOOK1 = new THREE.Vector3(qn('qx', 23.5), qn('qy', 3.0), qn('qz', -22)), MM1 = qn('mm1', 33);
export const WHIP_T = 4.5, WHIP_DUR = 0.7, WHIP_DEG = 130;                       // centred on the cut: +65° by 4.5, peak speed at the cut
function camAt(tt) {
  const u = ease.inOutSine(clamp((tt - 1.5) / 2.4));
  const pos = FRAME1_CAM.pos.clone().lerp(POS1, u), look = FRAME1_CAM.look.clone().lerp(LOOK1, u), mm = lerp(FRAME1_CAM.mm, MM1, u);
  const yaw = -whip(tt, WHIP_T, WHIP_DUR, WHIP_DEG) * Math.PI / 180;             // negative about +Y = turn right
  const dir = look.clone().sub(pos).applyAxisAngle(Y, yaw);
  const amp = 0.035 * clamp((tt - 1.5) / 0.6) + 0.18 * kick(tt, 2.6, 1.0);
  return { st: { pos, look: pos.clone().add(dir), mm, roll: 0 }, sh: tt < 1.5 ? [0, 0, 0] : shake(tt + 4, amp, 0.9, 3) };
}
S.run((t) => {
  const tt = Math.max(t - 4, 0);
  const c = camAt(tt); applyCam(S.camera, c.st, c.sh);                           // camera FIRST
  P.update(t, tt);
});
