// s08_orbit (film 30.5-37.0; step 3, tau 620 -> 626.5: grip has been back for 20 s). Earth from orbit on the day side
// (API R4), 70 mm, slow push-in over a region with many coastlines and a desert (sub-camera point lat 17 N, lon 19 E, looking
// north: a desert coast, an inland sea full of peninsulas and islands, more coasts toward the limb; no labels). N4 (groupC_sediment.js): every coast bleeds brown sediment
// plumes into the sea (the hills that slid into every bay), still spreading; desert dunes smeared flat.
// Frame 1 (handshake from s07's tilt into the sky): the sunlit limb with its blue air band in the lower ~40 %, black space above.
// 36.0-37.0 is the silent beat: the picture keeps drifting.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { POST_ORBIT, dirLL, aimFor, qn, D2R } from './kit.js';
import { tauAt } from './story.js';
import { patchSediment } from './groupC_sediment.js';

const S = createStudio({ samples: 4, near: 50, far: 3e6, post: { ...POST_ORBIT, exposure: qn('exp', 0.85) } });   // deserts read white at 1.0
const SUN = dirLL(qn('slon', 38), qn('slat', 30));
const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: 0.3, sunI: qn('sunI', 1.15), cityI: 1.0, sunGlare: 0, coast: true, coastW: 4096, seg: [512, 256] });
SP.EU.cloudsI.value = qn('clouds', 0.4); SP.EU.detail.value = 0.8;
const EU = patchSediment(SP, { sed: 1, sedR: 170, dunes: 1 });
const SUB = dirLL(qn('lon', 19), qn('lat', 17)), MM = 70, DUR = 6.5;
// limb height on screen (design px) -> the up-tilt aimFor needs (kit aimFor maps sy linearly to an angle)
function syForLimb(D, yl) {
  const vf = lensFov(MM) * D2R, th = Math.atan(((480 - yl) / 480) * Math.tan(vf / 2));
  const ay = Math.asin(RE / D) - th; return 480 + (ay / vf) * 960;
}
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s08_orbit', tt), u = ease.inOutSine(clamp(tt / DUR));
  const D = RE + lerp(qn('h0', 2300), qn('h1', 1850), u);                     // km from Earth's centre: the push-in
  const pos = SUB.clone().multiplyScalar(D);
  const yl = lerp(qn('y0', 585), qn('y1', 400), ease.outCubic(clamp(tt / DUR)));   // the limb rises: Earth fills more of the frame
  applyCam(S.camera, { pos, look: aimFor(pos, 270, syForLimb(D, yl), MM), mm: MM, roll: lerp(4, 2.5, u) }, shake(t, 0.012, 0.5, 4));
  EU.sedR.value = 170 + 10 * (tau - 620);                                     // the plumes keep spreading (staged), km
  SP.update(S, t);
});
