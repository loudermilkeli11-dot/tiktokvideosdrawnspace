// s08_mountain (film 43.0-50.0, 210 fr): HARD CUT to the reverse. From the east promenade, low, 70 mm, locked: the gelato seller
// in the foreground, the inlet and the head town, the 1,500 m mountain behind. 44.5 the mountain implodes into a point (1.2 s),
// 45.85 the gale streams everything toward the gap, 45.95-47.2 one eased push onto the seller (150 mm), 47.35 gag 3: his two
// scoops fly off to the mountain; he stares at the empty cone while the gale eases. Group C (set: groupC_mole.js).
// Page t = shot time + 4; every moving thing reads FILM time.
import { createStudio } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { sstep } from '@engine/util.js';
import { POST_DAY, SAMPLES } from './kit.js';
import { SHOT } from './story.js';
import { moleWorld, moleCam, T_DONE, T_GALE } from './groupC_mole.js';

const SH = SHOT.s08_mountain;
// 12 samples (SAMPLES.s08_mountain) only while things move fast: the implosion, the gale's first burst and the push (film
// 44.4-48.1, through the scoops' launch); 8 elsewhere (a 12-sample frame costs ~2.5 s full size on the GPU, 8 ~1.6 s)
const FAST = [44.4 - SHOT.s08_mountain.t0 + 4, 48.1 - SHOT.s08_mountain.t0 + 4];      // page t
const S = createStudio({ samples: (t) => (t >= FAST[0] && t <= FAST[1] ? SAMPLES.s08_mountain : 8), shadows: true, near: 0.1, far: 2e4, post: { ...POST_DAY } });
const M = moleWorld(S);
S.run((t) => {
  const tt = Math.max(t - 4, 0), film = SH.t0 + tt;
  // a small shake at the implosion's end (the boom is in the score), buffeting in the gale that eases out
  const amp = 0.012 + 0.2 * kick(film, T_DONE, 1.4) + 0.05 * sstep(T_GALE, T_GALE + 0.4, film) * (1 - sstep(48.0, 50.0, film));
  applyCam(S.camera, moleCam(film), shake(t, amp, 1.6, 8));
  M.update(film, S.camera);
});
