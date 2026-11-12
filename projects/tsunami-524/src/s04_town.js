// s04_town (film 7.5–12.5). Street level in the bay town, 24 mm, looking down the hill to the waterfront: an empty street,
// the 524 m wall fills the sky and TOPS THE ROOFS at T.roofs (9.0 s), swallowing the waterfront rows. The camera is carried
// up ahead of the face (never inside it), over the crest, into a high aerial looking back over the drowned bay: the water
// level climbs the valley sides, the forest above the waterline is stripped (trimline), and at x2 (10.5–11.1) it doubles to
// 1,048 m. People: none on screen here (policy: no figure is ever touched by water).
import { createStudio, THREE, makeWorld, makeWave, makeWaveSpray, groundAll, SUN, qn } from './kit.js';
import { Path, applyCam, shake, kick } from '@engine/camera.js';
import { clamp, sstep, lerp, ease } from '@engine/util.js';
import { SHOT, T, waveH, RUNUP } from './story.js';
const F0 = SHOT.s04_town.t0, DUR = SHOT.s04_town.dur;
const S = createStudio({ samples: (t) => (t - 4 > 1.2 && t - 4 < 3.2 ? 12 : 8), near: 1, far: 2.5e5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.6, bloomRadius: 0.55, vignette: 0.24, grain: 0.014, ca: 0.0008, sat: 1.12, contrast: 1.07 } });
const W = makeWorld(S, { boats: 12, slab: true, fogFar: 60000 });
const WV = makeWave(S);
const spray = makeWaveSpray(S, W, WV.MW, (ft) => WV.stAt(ft), F0 - 0.4, F0 + 3.2, { film0: F0, xs: [-900, 1100], dx: 40, nToe: 3 });
const X = qn('cx', 150), Z = qn('cz', 235), G = groundAll(X, Z);
const P = new Path([
  { t: 0.0, pos: [X, G + 1.8, Z], look: [40, 450, -1000], mm: 24 },
  { t: 1.05, pos: [X - 2, G + 2.2, Z - 12], look: [40, 540, -900], mm: 24, ease: 'inOutSine' },
  { t: 1.7, pos: [X - 10, G + 330, Z + 130], look: [30, 260, -700], mm: 24, ease: 'inCubic' },
  { t: 2.5, pos: [X - 30, 820, Z + 290], look: [0, 120, -700], mm: 24, ease: 'outCubic' },
  { t: 3.4, pos: [X - 60, 1650, Z + 420], look: [0, 250, -2300], mm: 24, ease: 'inOutCubic' },
  { t: 5.0, pos: [X - 90, 1900, Z + 470], look: [-60, 300, -2900], mm: 26, ease: 'inOutSine' },
]);
// the water standing behind the wave: it fills in as the crest passes the town, then doubles with H (x2)
const levelAt = (ft) => { const a = sstep(T.roofs + 0.9, T.roofs + 1.6, ft); return a * 0.9 * waveH(ft); };
S.run((t) => {
  const tt = t - 4, ft = F0 + tt;
  WV.set(ft, { curl: clamp(0.62 + 0.1 * tt, 0, 0.85) });
  const st = P.at(tt);
  const sh = shake(t, 0.07 + 0.35 * sstep(0.2, 1.4, tt) * (1 - sstep(2.0, 3.0, tt)), 1.5, 6);
  applyCam(S.camera, st, sh);
  const L = levelAt(ft);
  W.OU.level.value = L; W.OU.amp.value = lerp(0.7, 3.5, sstep(0, 300, L));
  W.OU.churn.value = sstep(0, 200, L) * 0.3;
  W.MT.U.waterY.value = L; W.MT.U.stripG.value = L > 1 ? L + 55 + 25 * sstep(T.x2[0], T.x2[1], ft) : -1e4; W.MT.U.wetY.value = L + 50;
  W.update(t, { shadowCenter: st.pos });
  W.placeBoats(t, (b) => (L > 2 ? false : null));
  spray.update(t);
});
