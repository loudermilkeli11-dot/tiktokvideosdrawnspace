// s03_tower (film 9.0–13.5, steps 2 -> 3): the beam climbs a glass tower. Page t = shot time + 4.
// Set: kit cityWorld (seed 11). The tower is city.js building #52 (glass, 45 x 92 m, 72.6 m tall, block (0,-1), x 1.5–46.5): its SOUTH face
// (z = -74.1) is the sunlit one (the +X face on the east street gets no direct sun: SUN.x < 0, so the beam could not reach it).
// Camera on the plaza's north edge, 30 m from the facade, looking NNW and up (continues s02's tilt-up from +35°).
// The law: D = lensD('s03_tower', tt) (63 -> 200 m over 0.2–1.0), spot w = spotOf(D) = 1.9 m, lens centre = spot + SUN·D (kit rig).
// N4 (groupB_tower.js): a pane under the dwelling spot flows after GLASS_MELT_S (1.53 s) of beam, sags and pours glowing drips
// that land as burning drops; panes the climbing spot only crosses crack (thermal shock) and burst out as glass shards; a black
// glowing gash (createBurn, n = facade normal) is left behind. The 200 m lens shades the whole facade (analytic shadow, facade only).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { cityWorld, lensRig, POST_DAY, SAMPLES, SUN, lookDir, qn } from './kit.js';
import { createBurn, createFlames } from './lens.js';
import { lensD, spotOf, CMAX } from './story.js';
import { createFacadeFX, facadeOf, BAY } from './groupB_tower.js';

const SHOTN = 's03_tower';
const S = createStudio({ samples: (t) => (t - 4 < 0.55 ? 12 : SAMPLES.s03_tower), shadows: false, post: POST_DAY });
const DX = 11.2;                                                          // tower 52 sits 11.2 m east of the first layout
const W = cityWorld(S, { keepOut: [[22 + DX, -70, 22], [34 + DX, -46, 7]], clearTrees: [[30 + DX, -52, 16], [12 + DX, -52, 12], [30 + DX, -70, 14], [10 + DX, -70, 12]] });
const B = W.C.buildings[52];
if (!B || !B.glass || Math.abs(B.x - 24) > 1 || Math.abs(B.z + 120) > 1) throw new Error('s03: building 52 is not the expected glass tower ' + JSON.stringify(B));
const F = facadeOf(B), N = new THREE.Vector3(0, 0, 1);
const rig = lensRig(S, { sky: W.sky, shadowDecal: false });

// ---- the spot on the facade: rises from the shopfront, dwells on one pane (floor 6, column 13), then climbs with a slight S.
const XD = F.cx + 5.5 * BAY, YD = 8 * 3.6 + 0.49 * 3.6;                  // dwell pane centre (32.8, 30.6): floor 8 keeps the spot above the caption band
const T_UP = 0.35, T_CLIMB = 2.05, Y_TOP = 59;
function spotXY(tt) {
  if (tt < T_UP) { const u = ease.outCubic(clamp(tt / T_UP)); return [XD - 1.2 * (1 - u), lerp(YD - 9, YD, u)]; }
  const wob = [0.32 * Math.sin(7.3 * tt) * sm((tt - T_UP) / 0.3), 0.45 * Math.sin(5.1 * tt + 1.0) * sm((tt - T_UP) / 0.3)];
  if (tt < T_CLIMB) return [XD + wob[0], YD + wob[1]];
  const u = clamp((tt - T_CLIMB) / (4.6 - T_CLIMB)), e = u * u * (2 - u) * 0.6 + ease.inOutSine(u) * 0.4, fade = 1 - sm((tt - T_CLIMB) / 0.3);
  return [XD + wob[0] * fade + 2.6 * Math.sin(u * 3.4), YD + wob[1] * fade + (Y_TOP - YD) * e];
}
function sm(x) { x = clamp(x); return x * x * (3 - 2 * x); }
const spotAt = (tt) => { const [x, y] = spotXY(tt); return { p: new THREE.Vector3(x, y, F.z0), n: N }; };
const wAt = (tt) => spotOf(lensD(SHOTN, Math.max(tt, 0)));

const fx = createFacadeFX(S, { b: B, spotAt, wAt, cols: [2, 3, 4, 5, 6, 7, 8, 9], floors: Array.from({ length: 17 }, (_, j) => j + 2), t0: -0.2, t1: 4.8 });
const burn = createBurn(S, { spotAt, t0: 0.0, t1: 4.6, n: 700, width: 2.5, lift: 0.03, glowS: 3.2 });
// burning drops on the sidewalk where molten glass lands (every 2nd drip lights a small flame)
const fl = fx.drops.filter((d, i) => i % 2 === 0).map((d, i) => ({ p: d.land.clone(), s: 0.45 + ((i * 0.618) % 1) * 0.7, t0: d.t0 + d.tl, grow: 0.25 }));
const flames = createFlames(S, fl.length ? fl : [{ p: new THREE.Vector3(0, -50, 0), s: 0.1, t0: 99 }], { I: 4 });
const glow = new THREE.PointLight(0xff9a50, 0, 70, 2); S.scene.add(glow);

// camera: plaza north edge, 30 m off the facade; tilt continues up from +35°, settles, then follows the climb (24 -> 30 mm)
const CAM = new THREE.Vector3(qn('cx', 34 + DX), qn('cy', 1.7), qn('cz', -46));
const YAW = qn('yaw', -30);                                              // spot right of centre (x ≈ 340): clear of the counter column
const HANDLE = qn('ha', 2.2);
const _h = new THREE.Vector3();
S.run((t) => {
  const tt = Math.max(t - 4, 0);
  const pitch = 35 + 9.5 * ease.outCubic(clamp(tt / 0.65)) + 13 * ease.inOutSine(clamp((tt - 1.9) / 2.6));
  const mm = lerp(24, 30, ease.inOutSine(clamp((tt - 1.6) / 2.9)));
  applyCam(S.camera, { pos: CAM, look: lookDir(CAM, YAW, pitch), mm, roll: 0 }, shake(t, 0.035, 0.8, 3));
  const D = lensD(SHOTN, tt), sp = spotAt(tt).p;
  W.update(t, { focus: new THREE.Vector3(22 + DX, 0, -60), agitation: 0.7 });
  rig.set({ spot: sp, D, C: CMAX, n: N, heat: 1, handleAngle: HANDLE, t, shadowVisible: false, minPx: 6, glowR: 2.4, coreI: 0.75 });
  _h.set(Math.cos(HANDLE), 0, -Math.sin(HANDLE)).applyQuaternion(rig.lens.group.quaternion);
  fx.update(tt, { centre: rig.centre, D, handleDir: _h, sun: SUN });
  burn.update(tt); flames.update(tt);
  glow.position.copy(sp).addScaledVector(N, 3); glow.intensity = 900 * clamp(tt / 0.3);
});
