// s07_after (film 26.5-30.5; step 3 at tau 600: grip is back after 10 min). The N3 end state from the air, 24 mm at ~260-300 m,
// continuing s06's crane (still rising/drifting out for the first 0.5 s): the lagoon filled brown to the brim (a glossy wet mud
// flat at sea level), houses carried out onto it intact and settled at an angle, cars and boats stranded, the headlands and hills
// stripped to grey rock, still water beyond the mouth with a brown fringe. Ends tilting UP into the deep-blue sky (>= 80 % sky
// at the cut) for the push to orbit (s08).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createBoats } from '@engine/splash.js';
import { rng, ease, clamp } from '@engine/util.js';
import { POST_DAY, lookDir, qn, D2R, looseCity, poseCars, poseProps, carQ } from './kit.js';
import { tauAt } from './story.js';
import { flowWorld, sField } from './groupC_flow.js';

const TILT0 = 3.35;                                     // shot s: the tilt up to the sky starts (cut at 4.0)
const S = createStudio({ samples: (t) => (t - 4 > TILT0 - 0.1 ? 12 : 4), shadows: false, near: 1, far: 60000, post: { ...POST_DAY } });
const W = flowWorld(S, { mode: 'after', waveAmp: 0.18, shadows: false });
W.sky.U.dayZen.value.set(0x1f58c4);                     // a deeper blue overhead for the tilt-up (handshake to orbit)
// ---- the mud flat: is (x, z) on it? (JS twin of fvMud in groupC_flow.js)
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const onMud = (x, z) => { const ez = -1440 + 45 * Math.sin(x * 0.011 + 0.7) + 25 * Math.sin(x * 0.031 + 2.1); return ss(-1, 4, -sField(x, z) + 6) * ss(ez - 50, ez + 50, z); };
// ---- houses: the ones near the shore were carried out onto the mud (intact, settled, tilted); the rest stand on bare rock
const AFTER = W.BL.map((b, i) => {
  const s = sField(b.p.x, b.p.z), r = rng(300 + i);
  if (s > 120 || r() > 0.7) return null;
  for (let k = 0; k < 6; k++) { const A = W.strand(b, i + 37 * k); A.x = b.p.x + (A.x - b.p.x) * (1 - k * 0.15); A.z = b.p.z + (A.z - b.p.z) * (1 - k * 0.15);
    if (onMud(A.x, A.z) > 0.95 && sField(A.x, A.z) < -10) return A; }
  return null;
});
// ---- cars stranded on the flat (near the old shore, where the town's streets ran out), tilted and half sunk
const C = looseCity(S, { cars: 160, props: 0, seed: 31 });
const CR = rng(77), CARS = [];
for (let i = 0; i < 20000 && CARS.length < C.cars.length; i++) {
  const x = (CR() * 2 - 1) * 480, z = -720 - Math.pow(CR(), 1.3) * 650;               // denser toward the lens
  if (onMud(x, z) < 0.98 || sField(x, z) > -12 || (sField(x, z) < -260 && CR() < 0.6)) continue;
  CARS.push({ x, z, yaw: CR() * 6.28, rx: (CR() - 0.5) * 0.5, rz: (CR() - 0.5) * 0.9 + (CR() < 0.12 ? Math.PI : 0), sink: 0.1 + CR() * 0.35 });
}
const cp = new THREE.Vector3();
poseCars(C, (c, i) => { const K = CARS[i]; if (!K) return null; return { p: cp.set(K.x, 0.35 - K.sink, K.z).clone(), q: carQ(K.yaw, K.rx, K.rz) }; });
poseProps(C, () => null);
// ---- boats stranded on the mud
const BR = rng(12), BOATS = [];
for (let i = 0; i < 4000 && BOATS.length < 14; i++) { const x = (BR() * 2 - 1) * 520, z = -1050 - BR() * 420;
  if (onMud(x, z) < 0.98 || BOATS.some((b) => Math.hypot(b.x - x, b.z - z) < 60)) continue;
  BOATS.push({ x, z, yaw: BR() * 6.28, L: 7 + BR() * 9, rx: (BR() - 0.5) * 0.25, rz: (BR() < 0.5 ? -1 : 1) * (0.15 + BR() * 0.25) }); }
const BT = createBoats(S, BOATS.length, { seed: 9 });
const bq = new THREE.Quaternion(), be = new THREE.Euler(), bp = new THREE.Vector3();
BOATS.forEach((b, i) => BT.setBoat(i, bp.set(b.x, 0.1, b.z), bq.setFromEuler(be.set(b.rx, b.yaw, b.rz, 'YXZ')), b.L)); BT.commit();

const CAM0 = new THREE.Vector3(qn('cx', -40), qn('cy', 255), qn('cz', -560)), YAW = qn('yaw', -8), PITCH = qn('pitch', -22);
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s07_after', tt);
  // continue s06's crane: rising fast at first (decelerating), drifting out over the bay, then the tilt up into the sky
  const rise = 22 * (1 - Math.exp(-tt / 0.45)) + 2.2 * tt, out = 6 * tt;
  const pos = CAM0.clone().add(new THREE.Vector3(Math.sin(YAW * D2R) * out, rise, -Math.cos(YAW * D2R) * out));
  const u = ease.inOutCubic(clamp((tt - TILT0) / (4.0 - TILT0)));
  const pitch = PITCH + 1.2 * tt + (36 - PITCH - 1.2 * TILT0) * u;
  applyCam(S.camera, { pos, look: lookDir(pos, YAW + 0.8 * tt, pitch), mm: 24, roll: 0 }, shake(t, 0.03, 0.6, 9));
  W.update(S, t, { fD: 0, sedR: 260, sedA: 1, after: (b, i) => AFTER[i], focus: new THREE.Vector3(-150, 0, -1100) });
  void tau;
});
