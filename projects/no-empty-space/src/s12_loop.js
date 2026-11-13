// s12_loop (film 66.0-70.0, 120 fr). 66.0-69.0: pure black (the overlay draws the end card): post.fade = 1, nothing to see.
// 69.0-70.0: HARD CUT (on the score's hit) to the frame-1 terrace: s01's set and FRAME1_CAM, LIVE at film loopFilm(tt) = -1.0 .. -0.033
// (story.js: people sway, water moves, nothing has happened yet), samples = SAMPLES.s12_loop (= s01_pre), so the last frame
// (tt 3.967, film -0.033) + 1/30 s == s01 frame 0 (film 0). Page t = shot time + 4.
import { createStudio } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { clamp } from '@engine/util.js';
import { POST_DAY, SAMPLES } from './kit.js';
import { T_LOOP, SHOT, loopFilm } from './story.js';
import { terraceSet } from './groupA_terrace.js';
import { camAt } from './groupA_cam.js';

const S = createStudio({ samples: SAMPLES.s12_loop, shadows: true, near: 0.05, far: 2e4, post: { ...POST_DAY } });
const TS = terraceSet(S, { zen: 0x16409a }); // = s01's TITLE_ZEN                                        // the same set as s01 (no napkin wipe: film < 0 here anyway)
const CUT = T_LOOP - SHOT.s12_loop.t0;                             // 3.0 s: black before, the terrace after

S.run((t) => {
  const tt = t - 4, black = tt < CUT - 1e-6;
  // the cut out of black: open from near-black and ramp up over 0.3 s (9 frames) so no frame jumps up in luma by > ~0.1
  // (check.py fails upward flashes; earth-stops s09's fix). fade = 0 from 69.3, so the last frame still equals s01 frame 0.
  const u = clamp((tt - CUT) / 0.3); S.post.p.fade = black ? 1 : 0.85 * (1 - u * u * (3 - 2 * u));
  const film = loopFilm(Math.max(tt, CUT));                        // -1.0 at the cut -> -0.033 on the last frame
  applyCam(S.camera, camAt(film));
  TS.update(film, S.camera);
});
