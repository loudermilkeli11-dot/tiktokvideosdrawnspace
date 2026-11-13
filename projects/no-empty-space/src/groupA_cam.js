// no-empty-space GROUP A: s01's camera as a pure function of film time (s01 film = shot time), shared with s12's loop terrace.
// FRAME1_CAM exactly until 2.2 s, then a 2% eased push-in (focal length 35 -> 35.7 mm) to 6.0 s.
import { ease, clamp } from '@engine/util.js';
import { FRAME1_CAM } from './kit.js';

export const camAt = (film) => { const u = ease.inOutSine(clamp((film - 2.2) / 3.8)); return { ...FRAME1_CAM, mm: FRAME1_CAM.mm * (1 + 0.02 * u) }; };
