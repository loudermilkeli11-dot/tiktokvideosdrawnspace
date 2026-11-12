// s03_towers (film 15.0–22.0, 210 fr, e 1.167 -> 1.75). Page t = shot time + 4. Board: "The tops of towers shear off sideways."
// The hero balcony (FRAME1_CAM.pos), a long lens (62 -> 66 mm) on the north side of the plaza: the near row (city building 52,
// 40 m, 186 m off) with the taller towers behind it (59/60/58, 77–80 m, 320–440 m). groupB_towers.shearTowers: each tower's top
// floors let go from the roof down at the law's spacing (0.035 e per floor) and slide off east (screen-right) at V = 31.75 m/s
// of film, a stepped "deck of cards"; floors that meet a still-standing wall are crushed into it; glass and cladding stream
// off every stub. Building 52 (front) lets go first (tt ≈ 1.0), the ones behind follow, so the frame is never still.
// Camera: opens high (s02 ends tilting up the facades), a slow pan right with the debris (yaw 15 -> 25°), and in the last
// second eases the pan and tilts a touch down toward the plaza (soft cut to s04's wide from the same balcony).
// Physics notes: SHEAR_E0 (groupB_towers.js) holds the frames 1.18 e before they shear (illustrative pattern, story.js);
// requested as a law change in FINAL/groupB.txt.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { cityWorld, createDust, FRAME1_CAM, POST_DAY, SAMPLES, lookDir, qn, gradeDust } from './kit.js';
import { ev, SHOT } from './story.js';
import { breakTowers } from './towersBreak.js';
// v2 edit (Commander 11-12): NO floors sliding off in layers. towersBreak.js: windows shatter, cladding and signs rip off,
// roof tanks, AC units and a crane tumble away east. The towers themselves stand.

const SHOTN = 's03_towers', DUR = SHOT[SHOTN].dur, E0 = ev(SHOTN, 0);
const S = createStudio({ samples: SAMPLES.s03_towers, shadows: true, post: POST_DAY });
const W = cityWorld(S, { leaves: { x: 0, z: -60, r: 200, per: 30 } });
// per-tower shear delays for the towers in frame (groupB_towers.plazaShear): 61/60 first (right), 52 front at tt 0.9, then the
// row behind; the blocks whose floors would pass over the lens are left whole
const TW = breakTowers(S, W, E0);
const dust = createDust(S, [{ x0: -500, x1: 700, z: -62, h: 12, op: 0.6 }, { x0: -600, x1: 800, z: -180, h: 26, op: 0.65 }, { x0: -700, x1: 900, z: -300, h: 45, op: 0.7 }]);
const P = FRAME1_CAM.pos;
S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOTN, tt), film = SHOT[SHOTN].t0 + tt;
  const u = ease.inOutSine(clamp(tt / DUR)), end = ease.inOutSine(clamp((tt - (DUR - 1.4)) / 1.4));
  const yaw = qn('yaw', lerp(15, 25, u) - 1.2 * end), pitch = qn('pitch', lerp(9.5, 7.2, ease.outCubic(clamp(tt / 2.5))) - 1.5 * end);
  const mm = qn('mm', lerp(62, 66, u) - 4 * end);
  applyCam(S.camera, { pos: P, look: lookDir(P, yaw, pitch), mm, roll: 0 }, shake(t, 0.05, 0.6, 3));
  W.update(film, { focus: new THREE.Vector3(60, 0, -170), box: 160 });
  TW.update(e);
  dust.update(e, 0.85);
  gradeDust(S, 0.45);
});
