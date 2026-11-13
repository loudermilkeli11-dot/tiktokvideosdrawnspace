// s01_phone (film 0.0-6.0, 180 fr). FRAME 1 / the cover / the loop frame. FRAME1_CAM exactly (a 2% eased push-in after 2.2 s).
// The busy BAR DEL PORTO terrace; at 1.60 (SQZ.phone.T) the selfie tourist's phone implodes in her hand (0.35 s): shards
// spiral into a hot bead, napkins / sugar packets / the menu / geranium petals / the neighbour's red sun hat rush in, the glass
// table cracks, the bead drops through the deck (hole + puff). Everyone jumps; she stares up at her empty hand.
// 5.74-6.0: a napkin sweeps across the lens left -> right (the wipe into s02). Page t = shot time + 4; film = shot time.
import { createStudio } from '@engine/engine.js';
import { applyCam } from '@engine/camera.js';
import { POST_DAY, SAMPLES } from './kit.js';
import { camAt } from './groupA_cam.js';
import { SHOT, SQZ } from './story.js';
import { terraceSet } from './groupA_terrace.js';

// samples: s01_pre (= s12's) until just before the squeeze so the loop frames match, then s01_phone
// (8 only where things move fast: the squeeze + inrush 1.55-3.0 and the napkin wipe 5.65-6.0; the calm reaction at 4 = budget)
const fast = (tt) => (tt > SQZ.phone.T - 0.05 && tt < 3.0) || tt > 5.65;
const S = createStudio({ samples: (t) => (fast(t - 4) ? SAMPLES.s01_phone : SAMPLES.s01_pre), shadows: true, near: 0.05, far: 2e4, post: { ...POST_DAY } });
export const TITLE_ZEN = 0x16409a;                                 // deeper zenith behind the white title (contrast; s12 matches)
const TS = terraceSet(S, { wipe: [5.72, 6.0, 0.0, 0.62], zen: TITLE_ZEN });   // the napkin wipe: enters left, covers the lens at the cut

S.run((t) => {
  const tt = t - 4, film = SHOT.s01_phone.t0 + tt;
  applyCam(S.camera, camAt(film));
  TS.update(film, S.camera);
});
