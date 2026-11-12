// s09_loop (film 37.0-38.0): the hard cut (hit 4) back to the frame-1 plaza. Page t = shot time + 4.
// The SAME scene as s01 (groupA_frame1.buildPlaza): FRAME1_CAM exactly, no shake, the 20 m lens frozen at frame1State(0)
// (C = 10 suns, the wide 375 °C disc), no burns, no flames, crowd in place. Only the world runs: page t 3.0 -> 3.967
// (fountain, traffic, sway, birds), so the last frame is s01's frame 0 minus 1/30 s and TikTok's restart is seamless.
// Samples = 8 (s01's), so the loop frames match.
import { createStudio } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { POST_DAY, SAMPLES, FRAME1_CAM } from './kit.js';
import { buildPlaza } from './groupA_frame1.js';

const S = createStudio({ samples: SAMPLES.s09_loop, shadows: false, post: POST_DAY });
const P = buildPlaza(S);
S.run((t) => {
  applyCam(S.camera, FRAME1_CAM, [0, 0, 0]);                                     // camera FIRST (= s01 camAt(0))
  P.update(t - 1, 0);                                                            // world page t 3.0 -> 4.0; event frozen at frame 1
});
