// s09_loop (63.5-65.0 s, 45 fr). HIT 4: the plaza exactly as frame 1. The s01 world (groupA_plaza) and camera at film
// time tt - 1.5 (film -1.5 -> -0.033; e = 0 throughout, so the world only lives: crowd sway, traffic, fountain, birds).
// Its last frame (tt 1.4667, film -0.0333) + 1/30 s = s01 frame 0 (film 0). Samples = s01_pre so the frames match.
import { createStudio } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { FRAME1_CAM, POST_DAY, SAMPLES } from './kit.js';
import { SHOT } from './story.js';
import { plazaSet } from './groupA_plaza.js';

const S = createStudio({ samples: SAMPLES.s09_loop, shadows: true, post: { ...POST_DAY } });
const P = plazaSet(S);
const LEAD = SHOT.s09_loop.dur;                                                     // 1.5 s: film = tt - 1.5

S.run((t) => {
  const tt = t - 4, film = tt - LEAD;                                               // unclamped, as s01
  applyCam(S.camera, FRAME1_CAM);                                                   // = s01's camAt(tt < 2.0)
  P.update(film);
  // QC fix (white flash at 63.5): the cut comes out of black space (luma ~0.25) into the bright plaza (0.66). Open from
  // near-black and ease up over 0.4 s so no frame jumps up by > 0.35; fade is 0 from tt 0.4, so the last frame = s01 frame 0.
  const u = Math.min(1, Math.max(0, tt / 0.4));
  S.post.p.fade = 0.85 * (1 - u * u * (3 - 2 * u));
});
