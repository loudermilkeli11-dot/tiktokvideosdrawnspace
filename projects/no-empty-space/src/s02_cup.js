// s02_cup (film 6.0-11.5, 165 fr). GAG 1, 50 mm low at table height on the old man (>= 1/4 of the frame: he fills ~3/4).
// The same terrace set as s01 in film time. He holds his espresso out, the waiter pours a refill; at 7.80 (SQZ.cup.T) the cup
// pops in his fingers (0.25 s): a tiny shard spiral, crumbs / a sugar packet / a napkin corner sucked in, the coffee splashes his
// lap, the bead punches a glowing pinhole through the saucer. He lifts the saucer and peers through the hole; the waiter is
// frozen mid-pour, the coffee running on into nothing. Opens on the s01 napkin exiting right; ends craning up past the flower
// boxes and tilting down to the quay street (s03 opens looking down on the street).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, Path, shake } from '@engine/camera.js';
import { ease, clamp } from '@engine/util.js';
import { POST_DAY, SAMPLES, bits, inrush } from './kit.js';
import { SHOT, SQZ } from './story.js';
import { terraceSet } from './groupA_terrace.js';

const T0 = SHOT.s02_cup.t0;                                      // 6.0
const CRANE = 10.7;                                             // film s: the crane-up / tilt-down to the street starts
const S = createStudio({ samples: (t) => (T0 + t - 4 > CRANE - 0.05 ? 8 : SAMPLES.s02_cup), shadows: true, near: 0.02, far: 2e4, post: { ...POST_DAY } });
const TS = terraceSet(S, { wipe: [6.0, 6.22, 0.62, 1.12] });
const H = TS.holdP;                                               // where he holds the cup out
// the pop of air at the cup: crumbs, a sugar packet and a napkin corner off the table rush in
const pop = bits(S, inrush(H, SQZ.cup.T, 60, { r: [0.12, 0.5], y: [0.0, 0.05], ground: () => 9.775, cols: [0xd8b878, 0xc89a5a, 0xf4f1ea, 0xe86aa0], size: [0.006, 0.02], drag: 9, lag: 0.03, lift: 0.4 }));
const corner = bits(S, [{ p: [H.x + 0.28, 9.776, H.z + 0.12], v: [-0.28 * 9 * 0.9, (H.y - 9.78) * 9 * 0.9 + 6, -0.12 * 9 * 0.9], t0: SQZ.cup.T + 0.02, size: 0.11, col: 0xf4f1ea, shape: 1, drag: 9, floor: 9.776, rest: true, spin: 1.2 },
  { p: [H.x - 0.2, 9.776, H.z + 0.22], v: [0.2 * 9 * 0.9, (H.y - 9.78) * 9 * 0.9 + 6, -0.22 * 9 * 0.9], t0: SQZ.cup.T + 0.03, size: 0.05, col: 0xe86aa0, shape: 2, drag: 9, floor: 9.776, rest: true, spin: 1.2 }]);
// camera: low at the table, a slow drift; then a crane up and a tilt down over the flower boxes to the quay street
const A = { pos: new THREE.Vector3(-3.15, 10.15, -9.72), look: new THREE.Vector3(-0.85, 9.95, -11.75), mm: 44 };
const B = { pos: new THREE.Vector3(-2.95, 10.1, -9.85), look: new THREE.Vector3(-0.9, 9.98, -11.8), mm: 48 };
const crane = new Path([
  { t: CRANE, pos: B.pos.toArray(), look: B.look.toArray(), mm: B.mm },
  { t: 11.12, pos: [-2.7, 10.95, -11.0], look: [-2.4, 8.2, -14.8], mm: 44, ease: 'inCubic' },
  { t: 11.5, pos: [-2.3, 11.75, -12.0], look: [-4.0, 3.2, -21.0], mm: 40, ease: 'outCubic' }]);
const camAt = (film) => { if (film >= CRANE) return crane.at(film);
  const u = ease.inOutSine(clamp((film - T0) / (CRANE - T0)));          // the slow drift (no spline overshoot)
  return { pos: A.pos.clone().lerp(B.pos, u), look: A.look.clone().lerp(B.look, u), mm: A.mm + (B.mm - A.mm) * u, roll: 0 }; };

S.run((t) => {
  const tt = t - 4, film = T0 + tt;
  applyCam(S.camera, camAt(film), shake(t, 0.02, 0.6, 3));
  const street = film > CRANE + 0.3;                              // the shadow box follows the view (table -> quay street)
  TS.update(film, S.camera, street ? { focus: new THREE.Vector3(-2, 4, -18), box: 22 } : { focus: new THREE.Vector3(-0.9, 9.5, -11.5), box: 12 });
  pop.update(film); corner.update(film);
});
