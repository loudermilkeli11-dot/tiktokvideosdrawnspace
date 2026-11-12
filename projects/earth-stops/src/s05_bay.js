// s05_bay (29.0-36.5 s, 225 fr, e 2.333 -> 2.958). HIT 1. A hillside terrace above the bay town, looking north over the
// town (bottom) and the whole bay to the sea mouth. The bay's water has slid east by drift(e): the west half is drained
// floor with stranded boats and the pier standing on sand (left), the water heaped into a white-topped wall against the
// east shore (right), crest spray and the upwind debris river streaming east. Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { ev } from './story.js';
import { POST_DAY, SAMPLES, balcony, gradeDust, qn } from './kit.js';
import { bayWorldC, groundH, BAYC } from './groupC_bay.js';

const SHOTN = 's05_bay';
const S = createStudio({ samples: SAMPLES.s05_bay, near: 0.5, far: 2e5, post: { ...POST_DAY } });
// the terrace: a hillside house south of the town, a little east of centre so the frame holds the drained west AND the east shore
const W = bayWorldC(S, { capTall: [BAYC.x, BAYC.z, 700, 16] });
const CAM = new THREE.Vector3(BAYC.x, Math.max(groundH(BAYC.x, BAYC.z), 0) + BAYC.up, BAYC.z);
const LOOK0 = new THREE.Vector3(qn('lx', 250), qn('ly', -330), qn('lz', -900)), LOOK1 = new THREE.Vector3(qn('lx1', 450), qn('ly', -330), qn('lz', -900)), MM = qn('mm', 22);
balcony(S, { pos: CAM, look: LOOK0.clone().lerp(LOOK1, 0.5) }, { d: qn('rd', 1.25), h: qn('rh', 1.45), len: 10, floor: false });

S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOTN, tt), u = ease.inOutSine(clamp(tt / 7.5));
  const pos = CAM.clone().add(new THREE.Vector3(lerp(0, 1.2, u), 0, 0));                    // a calm 1.2 m drift right (with the flow)
  applyCam(S.camera, { pos, look: LOOK0.clone().lerp(LOOK1, u), mm: MM, roll: 0 }, shake(t, 0.03, 0.6, 5));   // a slow pan right, with the water
  W.update(S, t, e);
  gradeDust(S, 0.3);
});
