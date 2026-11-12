// s04_town (film 7.5–12.5). Street level in the bay town, 24 mm, looking down the hill to the waterfront: an empty street,
// the 524 m wall fills the sky and TOPS THE ROOFS at T.roofs (9.0 s), swallowing the waterfront rows. The camera is carried
// up and back AHEAD of the face (never inside it: the wave runs into the hills behind the town and slows), into a high
// aerial over the drowned bay: the flood stands behind the wave, its waterline climbs the valley sides, the forest above
// it is stripped (trimline), and at x2 (10.5–11.1) it doubles to 1,048 m. People: none on screen (policy).
import { createStudio, THREE, makeWorld, makeWave, makeWaveSpray, groundAll, frontZ, SUN, qn } from './kit.js';
import { Path, applyCam, shake } from '@engine/camera.js';
import { clamp, sstep, lerp } from '@engine/util.js';
import { SHOT, T, waveH } from './story.js';
const F0 = SHOT.s04_town.t0, DUR = SHOT.s04_town.dur;
const S = createStudio({ samples: (t) => (t - 4 > 1.1 && t - 4 < 2.8 ? 12 : 8), near: 1, far: 2.5e5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.6, bloomRadius: 0.55, vignette: 0.24, grain: 0.014, ca: 0.0008, sat: 1.12, contrast: 1.07 } });
// forest climbs higher on these valley sides (so the trimline the flood leaves reads as forest stripped, not snow)
const W = makeWorld(S, { boats: 12, slab: true, fogFar: 60000, mountains: { treeY: 1500, snowY: 1950 } });
const WV = makeWave(S);
// after topping the town the wave runs up into the hills behind it and slows (it never reaches the camera)
const VR = (frontZ(T.roofs) - frontZ(T.roofs - 0.05)) / 0.05, TAU = 260 / VR;
const front = (ft) => (ft <= T.roofs ? frontZ(ft) : frontZ(T.roofs) + 260 * (1 - Math.exp(-(ft - T.roofs) / TAU)));
const stAt = (ft) => WV.stAt(ft, { front: front(ft), curl: clamp(0.62 + 0.1 * (ft - F0), 0, 0.85) });
const spray = makeWaveSpray(S, W, WV.MW, stAt, F0 - 0.4, F0 + 3.0, { film0: F0, xs: [-900, 1100], dx: 40, nToe: 2 });
const X = qn('cx', 150), Z = qn('cz', 235), G = groundAll(X, Z);
const P = new Path([
  { t: 0.0, pos: [X, G + 1.8, Z], look: [40, 450, -1000], mm: 24 },
  { t: 0.95, pos: [X - 2, G + 2.4, Z + 8], look: [40, 560, -900], mm: 24, ease: 'inOutSine' },
  { t: 1.7, pos: [X - 20, 560, Z + 720], look: [20, 240, -300], mm: 24, ease: 'inCubic' },
  { t: 2.8, pos: [X - 50, 1250, Z + 1150], look: [0, 300, -900], mm: 24, ease: 'outCubic' },
  { t: 3.9, pos: [X - 80, 1900, Z + 1250], look: [-40, 900, -2600], mm: 24, ease: 'inOutCubic' },
  { t: 5.0, pos: [X - 100, 2050, Z + 1300], look: [-80, 950, -3000], mm: 26, ease: 'inOutSine' },
]);
// the flood standing behind the wave: it fills in as the crest passes the town, then doubles with H (x2)
const levelAt = (ft) => sstep(T.roofs + 0.5, T.roofs + 1.4, ft) * 0.9 * waveH(ft);
S.run((t) => {
  const tt = t - 4, ft = F0 + tt;
  WV.MW.set(stAt(ft));
  const L = levelAt(ft);
  const cs = P.at(tt);
  const sh = shake(t, 0.07 + 0.35 * sstep(0.2, 1.3, tt) * (1 - sstep(1.9, 2.8, tt)), 1.5, 6);
  applyCam(S.camera, cs, sh);
  W.OU.level.value = L; W.OU.amp.value = lerp(0.7, 1.0, sstep(0, 300, L));
  W.OU.churn.value = sstep(0, 200, L) * (0.75 - 0.62 * sstep(T.roofs + 1.2, T.x2[1], ft));
  W.MT.U.waterY.value = L; W.MT.U.stripG.value = L > 1 ? L + 90 + 40 * sstep(T.x2[0], T.x2[1], ft) : -1e4; W.MT.U.wetY.value = L + 70;
  W.update(t, { shadowCenter: cs.pos });
  W.placeBoats(t, () => (L > 2 ? false : null));
  spray.update(t);
});
