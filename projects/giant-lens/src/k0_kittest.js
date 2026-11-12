// k0_kittest: lead's check page for the shared kit (NOT a film shot). Frame 1 on FRAME1_CAM with the lens rig at the law's
// values; shot time tt runs the focus ramp (story.focusC) and a TEST drag of the spot to the parked car's roof (N3 burn trail
// + staggered flames), so the effects can be judged. s01's real drag/timing is Builder A's. ?f1 freezes at frame 1 (NOT ?static: frames.js always sets it).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { ease, clamp } from '@engine/util.js';
import { cityWorld, lensRig, frame1State, FRAME1_CAM, SPOT_F1, CAR_F1, KEEP_F1, TREES_F1, POST_DAY, SAMPLES, roofOf, tintCar, Q } from './kit.js';
import { createBurn, createFlames } from './lens.js';
const S = createStudio({ samples: SAMPLES.s01_plaza, shadows: true, post: POST_DAY });
const W = cityWorld(S, { keepOut: KEEP_F1, clearTrees: TREES_F1 });
const rig = lensRig(S, { sky: W.sky });
const roof = roofOf(W.HC, CAR_F1.p);
// test path: hold at SPOT_F1 until 1.0 s, drag to the roof by 2.0 s, sit on the roof
const spotAt = (tt) => { const u = ease.inOutSine(clamp((tt - 1.0) / 1.0)); const p = SPOT_F1.clone().lerp(new THREE.Vector3(roof.x, 0, roof.z), u); p.y = u > 0.93 ? roof.y : 0; return { p }; };
const burn = createBurn(S, { spotAt, t0: 0.6, t1: 2.0, n: 300, width: 0.7 });
const fl = []; for (let i = 0; i < 9; i++) fl.push({ p: roof.clone().add(new THREE.Vector3((i % 3 - 1) * 0.55, -0.05, (Math.floor(i / 3) - 1) * 1.2)), s: 1.6 + (i % 4) * 0.5, t0: 2.6 + i * 0.05, grow: 0.5 });
const flames = createFlames(S, fl, { I: 5 });
S.run((t) => {
  const tt = Q.has('f1') ? 0 : Math.max(t - 4, 0);
  applyCam(S.camera, FRAME1_CAM);
  W.update(t, { focus: new THREE.Vector3(30, 0, 10) });
  const st = frame1State(tt, spotAt(tt).p);
  rig.set({ ...st, t });
  burn.update(tt);
  flames.update(tt);
  tintCar(W.C, 0, clamp((tt - 2.0) / 1.0));
});
