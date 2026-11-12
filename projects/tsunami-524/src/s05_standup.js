// s05_standup (film 12.5–16.0): the MATCH SHOT. Exactly frame 1's framing (FRAME1_CAM, 28 mm, locked), but now x4: the bay
// has been sucked dry (wet seabed, stranded boats, the pier on its bare pylons, nobody left on it) and beyond the headlands a
// wall of water stands up out of the fjord, growing 1,048 -> 2,096 m (12.5–13.1) and rising above the mountain tops, leaning
// and starting to overhang. Out on a wipe by the wall's underside (the lip comes over the camera at the end).
import { createStudio, THREE, makeWorld, makeWave, makeWaveSpray, frame1Cam, groundT, SUN, qn } from './kit.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { clamp, sstep, lerp, rng } from '@engine/util.js';
import { SHOT, T, waveH } from './story.js';
const F0 = SHOT.s05_standup.t0, DUR = SHOT.s05_standup.dur;
const S = createStudio({ samples: (t) => (t - 4 > DUR - 0.6 ? 12 : 8), near: 1.0, far: 2.5e5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.6, bloomRadius: 0.55, vignette: 0.24, grain: 0.014, ca: 0.0008, sat: 1.12, contrast: 1.07 } });
const W = makeWorld(S, { boats: 16, shadows: true });
const WV = makeWave(S, { len: 16000, cols: 340 });
const CAM = frame1Cam(W);
const ZW = qn('zw', -5600);                                     // the wall stands up BEHIND the head wall: it rises over the ridgeline
const stAt = (ft) => { const u = clamp((ft - F0) / DUR);
  return WV.stAt(ft, { front: ZW + 700 * u * u, curl: 0.15 + 0.55 * sstep(0.3, 1, u), lean: 0.1 + 0.55 * sstep(0.1, 1, u), bend: 1 / (2 * 14000) }); };
const spray = makeWaveSpray(S, W, WV.MW, stAt, F0, F0 + DUR, { film0: F0, xs: [-2400, 2400], dx: 90, nToe: 0, nLip: 1, crestP: 0.8, fwdV: 0.25, hazeD: 22000 });
// stranded boats: where they were moored, now lying on the wet bed, heeled over
const R = rng(8), bq = new THREE.Quaternion(), be = new THREE.Euler();
const stranded = (b) => { const g = groundT(b.x, b.z); bq.setFromEuler(be.set(0.1 * (R() - 0.5), b.yaw, (b.ph > 3 ? 1 : -1) * (0.45 + 0.25 * (b.ph % 1)), 'YXZ'));
  return { p: new THREE.Vector3(b.x, g + 0.4, b.z), q: bq.clone() }; };
S.run((t) => {
  const tt = t - 4, ft = F0 + tt;
  WV.MW.set(stAt(ft));
  applyCam(S.camera, CAM, shake(t, 0.03 + 0.25 * kick(ft, F0, 1.5) + 0.25 * sstep(DUR - 1.2, DUR, tt), 1.3, 2));
  W.OU.level.value = qn('lvl', -28.36); W.OU.amp.value = 0.02;    // the drawdown: the lagoon is empty, a wet film on the bed
  W.update(t, { shadowCenter: CAM.pos.clone().add(new THREE.Vector3(0, 0, -30)) });
  W.placeBoats(t, (b) => stranded(b));
  spray.update(t);
});
