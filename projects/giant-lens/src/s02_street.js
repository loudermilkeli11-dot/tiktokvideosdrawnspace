// s02_street (film 4.5-9.0, steps 1 -> 2): the whip lands on the east street (x = 60), looking north. Page t = shot time + 4.
// The 20 m lens over the street balloons to 63 m (lensD, 0.15-0.95) and rises out of the top of frame; its shadow darkens the
// street. The 0.59 m spot (spotOf(63)) crosses the road to the east kerb and runs north up a row of parked cars: each roof
// catches as the point reaches it, then the whole car (paint + flames, irregular gaps); it swerves into two street-tree
// canopies (they flare); the asphalt line glows and chars. People on both pavements run south past the hero (never into the
// path). Camera 35 mm, 6.5 m up behind the hero on the west side, slow track north; 3.9-4.5 tilts UP to +35° toward the lens
// (handshake into s03). First 0.35 s: the rightward whip from s01 decelerates onto the street (12 samples all shot: kit).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, whip, kick } from '@engine/camera.js';
import { ease, clamp, lerp, rng } from '@engine/util.js';
import { cityWorld, lensRig, tintCar, carQ, POST_DAY, SAMPLES, SL, lookDir, qn, D2R } from './kit.js';
import { createFlames } from './lens.js';
import { lensD, CMAX } from './story.js';
import { createWisps, rayHit, beamOnto, burnRuns } from './groupA_fx.js';
import { A_CAR, SPOT_LOOK } from './groupA_frame1.js';

const SHOTN = 's02_street';
const S = createStudio({ samples: SAMPLES.s02_street, shadows: false, post: POST_DAY });
const X0 = SL(0);                                                                 // street centre line x = 60
const KX = X0 + 5.25;                                                             // east kerbside lane x = 65.25 (parked row)
const CAM0 = new THREE.Vector3(qn('cx', 54), qn('cy', 6.5), qn('cz', 44)), CAM1 = new THREE.Vector3(54.3, 7.0, 41);
const HERO = new THREE.Vector3(qn('hx', 52.2), 0, qn('hz', 20));
// the parked row (z of each car centre: irregular gaps so the ignitions are not rhythmic) and three cars stopped in the lanes
const ROW = [1.5, -6.5, -15.5, -22.5, -31.5, -38.5, -45.5];
const STOPPED = [[X0 + 1.75, -12, 0], [X0 - 1.75, -27, Math.PI]];
// ground-target path (x, z) of the spot (the lens drifts; the spot is wherever its sunline first meets a surface)
const P0 = [58.5, 9], P1 = [KX, 3.5], Z_END = -50, T_TURN = 0.7, T_END = 4.35;
// keep people and props out of the whole beam path (+ the hero, the camera)
const KEEP = [[CAM0.x, CAM0.z, 6], [HERO.x, HERO.z, 2.5]];
for (let z = 12; z >= -56; z -= 4) KEEP.push([z > 4 ? lerp(P1[0], P0[0], (z - 4) / 8) : KX + 1.5, z, 5]);
const W = cityWorld(S, { shadows: false, keepOut: KEEP, clearTrees: [[CAM0.x, CAM0.z, 7]] });
W.HC.parked = A_CAR;                                                              // s01's burnt car (seen blurred in the whip)
const rig = lensRig(S, { sky: W.sky });
W.hero.root.position.copy(HERO); W.hero.root.rotation.y = 4 * D2R;
const C = W.C;

// ---------------------------------------------------------------- the parked row + the stopped cars
const used = new Set([0]), pick = (ok) => { const i = C.cars.findIndex((c, k) => !used.has(k) && ok(c)); used.add(i); return i; };
const PARK = ROW.map((z) => { const i = pick((c) => c.L < 5.5); return { i, p: new THREE.Vector3(KX, 0, z), yaw: Math.PI }; });
const STOP = STOPPED.map(([x, z, yaw]) => { const i = pick((c) => c.L < 5.5); return { i, p: new THREE.Vector3(x, 0, z), yaw }; });
const placed = new Map([...PARK, ...STOP].map((q) => [q.i, q]));
// a few of the parked cars in different paint, so the row reads as separate cars
const PAINT = [0xc8ccd2, 0xa61e22, 0x1d2430, 0xe9e6df, 0x2c5f9e, 0x6b6f75, 0xd9a227];
PARK.forEach((q, k) => { C.cars[q.i].col = PAINT[k % PAINT.length]; });
STOP.forEach((q, k) => { C.cars[q.i].col = [0x3a78d0, 0xe9e6df][k % 2]; });
const carPose = (c, i) => {
  const q = placed.get(i); if (q) return { p: q.p, q: carQ(q.yaw) };
  if (c.parked) return undefined;
  if (c.lane.axis === 'z' && Math.abs(c.lane.c - X0) < 8) return null;          // no traffic on this street (it is burning)
  return undefined;
};
// surfaces the sunline can meet: each parked car's cab + body tops (yaw pi: length along z, cab offset +0.06 L toward +z)
const BOXES = [];
PARK.forEach((q) => { const c = C.cars[q.i], cz = q.p.z + c.L * 0.06;
  BOXES.push({ id: 'car' + q.i, min: new THREE.Vector3(KX - c.W * 0.43, 0, cz - c.L * 0.25), max: new THREE.Vector3(KX + c.W * 0.43, 0.32 + c.H, cz + c.L * 0.25) });
  BOXES.push({ id: 'car' + q.i, min: new THREE.Vector3(KX - c.W / 2, 0, q.p.z - c.L / 2), max: new THREE.Vector3(KX + c.W / 2, 0.32 + c.H * 0.55, q.p.z + c.L / 2) }); });
// two east-pavement trees the spot swerves into
const TREES = C.trees.filter((t) => Math.abs(t.x - (X0 + 10.4)) < 1 && t.z < -4 && t.z > -46).sort((a, b) => b.z - a.z);
const TT = [TREES[0], TREES[Math.min(TREES.length - 1, 2)]].filter(Boolean).filter((t, k, a) => a.indexOf(t) === k);
const CANS = TT.map((t, k) => ({ id: 'tree' + k, c: new THREE.Vector3(t.x, 5.6 * t.s, t.z), r: 2.6 * t.s * 0.85, t }));
TT.forEach((t) => KEEP.push([t.x, t.z, 4]));                                         // (cityWorld already built: people kept by KEEP list below)

const sm = (x) => ease.inOutSine(clamp(x));
const zAt = (tt) => lerp(P1[1], Z_END, clamp((tt - T_TURN) / (T_END - T_TURN)));
function gAt(tt) {
  if (tt <= T_TURN) { const u = sm(tt / T_TURN); return [lerp(P0[0], P1[0], u), lerp(P0[1], P1[1], u)]; }
  const z = zAt(tt); let x = KX + 0.25 * Math.sin(tt * 4.1);
  for (const cn of CANS) { const zc = cn.t.z - 2.4, k = Math.exp(-((z - zc) * (z - zc)) / (2 * 2.6 * 2.6)); x += (cn.t.x - 0.7 - KX) * k; }
  return [x, z];
}
const gVec = (tt) => { const [x, z] = gAt(tt); return new THREE.Vector3(x, 0, z); };
const hitAt = (tt) => rayHit(gVec(tt), BOXES, CANS);
// first time the spot meets each car / canopy (ignition times; also the sound's whumps)
const T_HIT = {}; for (let t = 0; t < 4.6; t += 0.01) { const id = hitAt(t).id; if (id !== 'ground' && T_HIT[id] === undefined) T_HIT[id] = t; }
// N3 burns (the asphalt line + scorch across each roof)
const burns = burnRuns(S, hitAt, 0.05, 4.6, { width: 0.6, glowS: 2.6 });
// flames: roof first (0.15-0.45 s after the spot arrives), then the whole car; canopies flare; s01's car still burning
const R = rng(202), fl = [];
PARK.forEach((q) => { const c = C.cars[q.i], T = T_HIT['car' + q.i]; if (T === undefined) return;
  for (let k = 0; k < 6; k++) fl.push({ p: new THREE.Vector3(KX + (R() - 0.5) * c.W * 0.7, 0.32 + c.H - 0.05, q.p.z + (R() - 0.5) * c.L * 0.5), s: 2.2 + R() * 1.8, t0: T + 0.12 + R() * 0.3, grow: 0.45, seed: R() });
  for (let k = 0; k < 8; k++) fl.push({ p: new THREE.Vector3(KX + (R() - 0.5) * c.W * 0.9, 0.32 + c.H * 0.5, q.p.z + (R() - 0.5) * c.L * 0.9), s: 3.0 + R() * 3.0, t0: T + 0.5 + R() * 0.5, grow: 0.6, seed: R() }); });
CANS.forEach((cn) => { const T = T_HIT[cn.id] ?? 9;
  for (let k = 0; k < 16; k++) { const a = R() * 6.283, e = 0.1 + R() * 1.0; const d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    fl.push({ p: cn.c.clone().addScaledVector(d, cn.r * 0.85), s: 3.0 + R() * 3.2, t0: T + 0.04 + R() * 0.3, grow: 0.35, seed: R() }); } });
for (let k = 0; k < 10; k++) fl.push({ p: new THREE.Vector3(A_CAR.p.x + (R() - 0.5) * 4, 1.2, A_CAR.p.z + (R() - 0.5) * 1.6), s: 3 + R() * 2.5, t0: -9, grow: 0.5, seed: R() });
const flames = createFlames(S, fl, { I: 2.8 });
// thin dark wisps: off the hot asphalt line, the roofs, the burning cars, the canopies
const wp = [];
for (let t = 0.1; t < 4.4; t += 0.11) { const h = hitAt(t); if (h.id === 'ground') wp.push({ p: h.p.clone(), h: 1.4 + R() * 1.6, w: 0.4, t0: t + 0.15, grow: 0.5, a: 0.14 + R() * 0.08, seed: R() }); }
PARK.forEach((q) => { const T = T_HIT['car' + q.i]; if (T === undefined) return;
  for (let k = 0; k < 3; k++) wp.push({ p: new THREE.Vector3(KX + (R() - 0.5) * 1.2, 2.2, q.p.z + (R() - 0.5) * 2), h: 7 + R() * 4, w: 1.1, t0: T + 0.4 + k * 0.15, grow: 0.9, a: 0.26, seed: R() }); });
CANS.forEach((cn) => { const T = T_HIT[cn.id] ?? 9; for (let k = 0; k < 3; k++) wp.push({ p: cn.c.clone().add(new THREE.Vector3((R() - 0.5) * 2, cn.r + 1.4, (R() - 0.5) * 2)), h: 7 + R() * 3, w: 1.2, t0: T + 0.35 + k * 0.1, grow: 0.8, a: 0.24, seed: R() }); });
const wisps = createWisps(S, wp);

// ---------------------------------------------------------------- people: everyone on this street's pavements runs south
const RR = rng(77), runners = [];
for (const m of W.crowd.meshes) for (const p of m.userData.list) {
  if (p.x0 === undefined) { p.x0 = p.x; p.z0 = p.z; p.yaw0 = p.yaw || 0; }
  const onWest = p.x0 > X0 - 13 && p.x0 < X0 - 7, onEast = p.x0 > X0 + 7 && p.x0 < X0 + 13;
  if ((onWest || onEast) && p.z0 < 34 && p.z0 > -70) {
    if (onEast && Math.abs(p.x0 - KX) < 3) { p.y = -60; continue; }
    runners.push({ p, x: onEast ? Math.max(p.x0, KX + 4.2) : p.x0, react: 0.25 + RR() * 1.1 + Math.max(0, -p.z0) * 0.012, v: 3.2 + RR() * 2.4 });
  }
}
function runCrowd(tt) {
  for (const r of runners) { const p = r.p, u = Math.max(0, tt - r.react), acc = 0.4, d = u < acc ? (r.v * u * u) / (2 * acc) : r.v * (u - acc / 2);
    p.x = r.x; p.z = p.z0 + d; p.yaw = u > 0 ? Math.PI : p.yaw0;
    if (Math.hypot(p.x - HERO.x, p.z - HERO.z) < 1.2) p.x = HERO.x + (p.x < HERO.x ? -1.2 : 1.2);   // pass beside the hero
  }
}

// ---------------------------------------------------------------- camera
// yaw (deg, + = right of north): the whip from s01 decelerates onto the street (-62 -> +3 by 0.35); 3.9-4.5 tilts up to +35°
function cam(t) {
  const tt = t - 4, u = ease.inOutSine(clamp(tt / 4.3));
  const pos = CAM0.clone().lerp(CAM1, u);
  const yaw = 3 + (whip(tt, 0, 0.7, 130) - 130) - 2 * ease.inOutSine(clamp((tt - 3.9) / 0.6));
  const pitch = -3 + 38 * ease.inCubic(clamp((tt - 3.9) / 0.6));
  const amp = 0.03 + 0.12 * kick(Math.max(tt, 0), T_HIT['car' + PARK[1].i] ?? 1.5, 1.0);
  return { st: { pos, look: lookDir(pos, yaw, pitch), mm: 35, roll: 0 }, sh: shake(t, amp, 0.8, 3) };
}

S.run((t) => {
  const tt = Math.max(t - 4, 0);
  const c = cam(t); applyCam(S.camera, c.st, c.sh);                               // camera FIRST
  runCrowd(tt);
  W.update(t, { carPose, agitation: 0.6, focus: new THREE.Vector3(KX, 0, -20) });
  const D = lensD(SHOTN, tt);
  beamOnto(rig, { D, C: CMAX, spot: gVec(tt), heat: 1, handleAngle: 0.5, ...SPOT_LOOK, t }, hitAt(tt));
  burns.forEach((b) => b.update(tt));
  flames.update(tt); wisps.update(tt);
  PARK.forEach((q) => { const T = T_HIT['car' + q.i]; tintCar(C, q.i, T === undefined ? 0 : clamp((tt - T - 0.15) / 1.4)); });
  STOP.forEach((q) => tintCar(C, q.i, 0));
  tintCar(C, 0, 1);
});
export { T_HIT, PARK, CANS };
