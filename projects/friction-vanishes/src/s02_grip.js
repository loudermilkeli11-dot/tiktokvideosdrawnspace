// s02_grip (film 4.0-8.5, tau 4 -> 8.5, step 1: T = 5 s). The 10 deg hill street seen from the flat quay road at its foot,
// 50 mm, looking up the street (vertical buildings against the tilted street sell the slope). Parked cars, a bus, bins,
// tables slide down toward us together (story.js slopeX: 13.6 m by tau 4, 21 m by tau 5). At tau 5 = film 5.0 the grip comes
// back: locked cars skid to a stop in 1.7 s (slideSkidX, SKID_HILL 5.06 m/s^2), sideways cars trip and roll, the bus tips onto
// its side, tables cartwheel, benches tip, dark skid marks, hazard lights. Aftermath held to 8.5.
// In: the s01 whip-pan continues (yaw -35 -> 0 deg over the first 0.35 s). Out (8.5 match cut to s03): street centre line
// vertical through x 270, gaze +6 deg, the street vanishing at y ~410.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick, whip } from '@engine/camera.js';
import { ease, clamp } from '@engine/util.js';
import { POST_DAY, MAIN_X, ZF, lookDir, D2R, groundY, qn } from './kit.js';
import { hillA, T_GRIP } from './groupA_hill.js';
import { tauAt, SHOT } from './story.js';
const S = createStudio({ samples: 12, shadows: true, post: POST_DAY });
const A = hillA(S);
const T_HIT = T_GRIP - SHOT.s02_grip.tau0;                  // 1.0 s shot time = film 5.0 (story.js T_GRIP1)
S.run((t) => {
  const tt = t - 4, tau = tauAt('s02_grip', tt);
  // the whip from s01 is one move across the cut: whip(film t, 4.0, 0.7, 70) - 70 -> -35 deg at the cut, 0 at 0.35 s
  const w = whip(tt + 4.0, 4.0, 0.7, 70) - 70;
  const u = ease.inOutSine(clamp(tt / 4.5));
  // Lead pass (phase 3): the on-axis view hides the 10 deg pitch, so the slide + crash play OBLIQUE from the right lane of the
  // flat quay road (the left facade's level window rows against the street climbing away from the flat = the hill). From 2.7 s
  // the camera slides back onto the quay road's centre line and pans to the on-axis framing (h: 1 -> 0), arriving as the
  // rollovers and the bus tip play (1.1-2.3 s), and holds it as the match framing for the 8.5 cut.
  const h = 1 - ease.inOutCubic(clamp((tt - qn('h0', 0.85)) / qn('hd', 1.3)));
  const SIDE = new THREE.Vector3(qn('cx', MAIN_X + 7), 0, qn('cz', 293)); SIDE.y = groundY(SIDE.x, SIDE.z) + qn('cy', 1.7);
  const END = new THREE.Vector3(MAIN_X, 3.0, ZF + 13.0 - 1.5 * u);        // on the flat quay road; the zebra + the slope break in frame
  const pos = END.clone().lerp(SIDE, h);
  const look = lookDir(pos, -w + qn('yo', -28) * h, 6 + 4 * (w / 70) + (qn('po', 4) - 6) * h);   // whip lands LEFT (lookDir: + = right), then pans back right to 0
  applyCam(S.camera, { pos, look, mm: 50 + (qn('mm', 40) - 50) * h, roll: 0 }, shake(t, 0.025 + 0.32 * kick(tt, T_HIT, 1.3), 7, 2));
  A.update(t, tau);
});
