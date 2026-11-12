// s06_town (36.5-43.5 s, 210 fr, e 2.958 -> 3.542). The same terrace as s05 (BAYC), a longer lens (50 -> 58 mm) on the
// north-east waterfront and the lighthouse headland: the heaped bay climbs over the promenade and races inland EAST
// (screen-right) at 0.8 V; waterfront houses are knocked over and carried right, roof shingles torn off, bare trees laid
// flat; crest spray streams east past the lighthouse. Ends at the peak (hard cut, HIT 2). Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { ev } from './story.js';
import { POST_DAY, SAMPLES, gradeDust, qn } from './kit.js';
import { bayWorldC, groundH, BAYC } from './groupC_bay.js';

const SHOTN = 's06_town';
const S = createStudio({ samples: SAMPLES.s06_town, near: 0.5, far: 2e5, post: { ...POST_DAY } });
const W = bayWorldC(S, { capTall: [BAYC.x, BAYC.z, 700, 16] });
const CAM = new THREE.Vector3(BAYC.x, Math.max(groundH(BAYC.x, BAYC.z), 0) + BAYC.up, BAYC.z);
// aim by bearing (deg from north, + = east) and pitch: opens on the lighthouse headland (bearing 3 deg at the left edge),
// pans right with the flood onto the east town (bearing ~37 deg). East stays screen-right (and away).
const B0 = qn('b0', 32), B1 = qn('b1', 50), P0 = qn('p0', -12), P1 = qn('p1', -13), MM0 = qn('mm', 40), MM1 = qn('mm1', 44);
const D2R = Math.PI / 180, dirOf = (b, p) => new THREE.Vector3(Math.sin(b * D2R), Math.tan(p * D2R), -Math.cos(b * D2R));

S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOTN, tt), u = ease.inOutSine(clamp(tt / 7.0));
  applyCam(S.camera, { pos: CAM, look: CAM.clone().add(dirOf(lerp(B0, B1, u), lerp(P0, P1, u))), mm: lerp(MM0, MM1, u), roll: 0 }, shake(t, 0.025, 0.6, 6));   // slow push + pan right with the front
  W.update(S, t, e);
  gradeDust(S, 0.3);
});
