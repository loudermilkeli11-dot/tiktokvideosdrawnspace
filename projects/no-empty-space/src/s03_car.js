// s03_car (film 11.5-18.0, 195 fr). The quay street, 28 mm behind the hero at mid-distance. Opens high looking down on the
// street (out of s02's tilt) and cranes down behind the hero as he strolls to his red hatchback and clicks the fob (12.9 chirp).
// 13.50 (SQZ.car.T) the car implodes (0.5 s): panels tear inward into a point, dust / leaves / lemons / the newspaper and his
// straw hat rush in, a glowing streak punches into the cobbles. GAG 2 (14.4-17.5): an eased push to 38 mm (he fills ~36% of the
// frame height): he clicks again, pats his pockets, shrugs, shuffles to the bench and looks under it. 17.4-18.0 the camera
// pans right and down to the smoking hole, ending with it at design (270, 540) (the match cut into s04).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { POST_DAY, SAMPLES, D2R } from './kit.js';
import { SHOT, SQZ } from './story.js';
import { quaySet, HOLE } from './groupA_quay.js';

const T0 = SHOT.s03_car.t0;                                       // 11.5
const S = createStudio({ samples: SAMPLES.s03_car, shadows: true, near: 0.05, far: 2e4, post: { ...POST_DAY } });
const Q = quaySet(S);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// camera keys (film): crane down (11.5-12.8), slow track (to 14.4), push in for the gag (14.4-15.9), hold, pan to the hole (17.4-18.0)
const aimB = (b, y, d = 20) => V3(-12 + d * Math.sin(b * D2R), y, -21 - d * Math.cos(b * D2R));   // a look point by bearing from (-12, -21)
const K = [
  { t: 11.5, pos: V3(-12.7, 8.8, -18.2), look: V3(-9.6, 1.6, -26.4), mm: 28 },
  { t: 12.8, pos: V3(-12.0, 3.4, -21.0), look: aimB(22, 2.8), mm: 28 },
  { t: 14.4, pos: V3(-12.05, 3.35, -21.2), look: aimB(21, 2.7), mm: 28 },
  { t: 15.9, pos: V3(-11.95, 3.1, -22.2), look: V3(-11.25, 2.45, -26.0), mm: 31 },
  { t: 17.35, pos: V3(-11.95, 3.05, -22.3), look: V3(-11.75, 2.2, -26.6), mm: 31 },
  { t: 18.0, pos: V3(-11.6, 3.0, -22.8), look: null, mm: 31 }];
// the last look puts the hole at design (270, 540): aim 60 design px above it
{ const k = K[5], d = HOLE.clone().sub(k.pos), dist = d.length(), ang = Math.atan(((540 - 480) / 480) * Math.tan((lensFov(k.mm) * D2R) / 2));
  k.look = HOLE.clone().add(V3(0, Math.tan(ang) * dist * 1.0, 0)); }
const camAt = (film) => { let i = 0; while (i < K.length - 2 && film >= K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], u = ease.inOutSine(clamp((film - a.t) / (b.t - a.t)));
  return { pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), mm: lerp(a.mm, b.mm, u), roll: 0 }; };

S.run((t) => {
  const tt = t - 4, film = T0 + tt;
  const amp = 0.025 + 0.5 * kick(film, SQZ.car.T + SQZ.car.dur, 1.0);       // the boom when the bead completes (14.0)
  applyCam(S.camera, camAt(film), shake(t, amp, 1.4, 6));
  Q.update(film, S.camera);
});
