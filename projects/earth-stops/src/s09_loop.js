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
});
