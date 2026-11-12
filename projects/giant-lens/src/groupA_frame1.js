// giant-lens GROUP A: the frame-1 plaza, shared by s01_plaza and s09_loop (so s09's last frame = s01's frame 0 minus 1/30 s).
// Builder A owns this file. buildPlaza(S) -> { W, rig, update(t, tt) }: t = page time of the WORLD (fountain, traffic, crowd
// sway, birds), tt = s01 shot time of the EVENT (focus ramp, drag, burns, flames, crowd escape). s09 calls update(3 + tt, 0).
//
// Change vs the kit (Gate 0, reported in FINAL/groupA.txt): the parked car the line burns to is A_CAR (24.7, -8), NOT the kit's
// CAR_F1 (22, 6). With CAR_F1 the spot runs 26 m toward the camera, so the lens (which hangs over the spot, 0.41·D toward +Z)
// comes up over the camera and turns edge-on (kit frame t 3.2: a thin black bar = fails "reads as glass"). A_CAR keeps the
// lens 50-60 m out, face tilted to us, all shot. FRAME1_CAM, SPOT_F1, HERO_POS and the law are unchanged.
// After the roof catches, the spot slides on to a plaza ring tree (its canopy flares at ~3.6 s) and on east toward the
// street: the camera's whip right at 4.15 follows it (handshake into s02).
import { THREE } from '@engine/engine.js';
import { ease, clamp, rng } from '@engine/util.js';
import { cityWorld, lensRig, frame1State, tintCar, SPOT_F1, HERO_POS, D2R, SUN } from './kit.js';
import { createFlames } from './lens.js';
import { lensD, tempC } from './story.js';
import { createWisps, rayHit, beamOnto, burnRuns, fleeCrowd } from './groupA_fx.js';

export const A_CAR = { p: new THREE.Vector3(24.7, 0, -8), yaw: Math.PI / 2 };     // side-on, nose east, on the plaza paving
const RING_TREE = [34 * Math.cos(-20 * D2R), 34 * Math.sin(-20 * D2R)];            // the plaza ring tree the spot moves on to
const EXIT = new THREE.Vector3(46, 0, -18);                                         // toward the east street (whip follows)
// keep-out (no people / props): camera, focus point, the drag, the car, the tree, the exit, the hero
export const KEEP_A = [[14, 46, 8], [SPOT_F1.x, SPOT_F1.z, 7], [17, -13, 6], [20, -9, 6], [A_CAR.p.x, A_CAR.p.z, 7.5],
  [RING_TREE[0], RING_TREE[1], 6], [39, -15, 6], [HERO_POS.x, HERO_POS.z, 2.5]];
export const TREES_A = [[14, 34, 9], [16, -32, 9]];                                 // the kit's frame-1 clearings (unchanged)
// spot look (both shots): a stronger white-hot point than the kit default (brief: "modest at 66 m")
export const SPOT_LOOK = { coreI: 1.8, minPx: 9 };

const sm = (x) => ease.inOutSine(clamp(x));
const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];

export function buildPlaza(S, o = {}) {
  const W = cityWorld(S, { shadows: false, keepOut: KEEP_A, clearTrees: TREES_A });
  W.HC.parked = A_CAR;                                                               // re-park the hero car (kit car 0)
  const rig = lensRig(S, { sky: W.sky });
  const HC = W.HC, cx = A_CAR.p.x, cz = A_CAR.p.z;
  // surfaces the beam can meet: the car's cab and body tops (yaw pi/2: car length along x), the ring tree's canopy
  const cabX = cx - HC.L * 0.06, CAB = { id: 'car', min: new THREE.Vector3(cabX - HC.L * 0.25, 0, cz - HC.W * 0.43), max: new THREE.Vector3(cabX + HC.L * 0.25, 0.32 + HC.H, cz + HC.W * 0.43) };
  const BODY = { id: 'body', min: new THREE.Vector3(cx - HC.L / 2, 0, cz - HC.W / 2), max: new THREE.Vector3(cx + HC.L / 2, 0.32 + HC.H * 0.55, cz + HC.W / 2) };
  const tree = W.C.trees.reduce((b, t) => (Math.hypot(t.x - RING_TREE[0], t.z - RING_TREE[1]) < Math.hypot(b.x - RING_TREE[0], b.z - RING_TREE[1]) ? t : b));
  const CAN = { id: 'tree', c: new THREE.Vector3(tree.x, 5.6 * tree.s, tree.z), r: 2.6 * tree.s * 0.85 };
  const SUNV = SUN;
  const gOf = (h) => { const s = h.y / SUNV.y; return [h.x - SUNV.x * s, h.z - SUNV.z * s]; };
  const G0 = [SPOT_F1.x, SPOT_F1.z];
  const GR = gOf(new THREE.Vector3(cabX, CAB.max.y, cz));                            // ground target that puts the spot mid-roof
  const GT = gOf(CAN.c.clone().add(new THREE.Vector3(0.4, CAN.r * 0.92, 0.3)));      // ... on the canopy's crown
  // ground target path (shot time): focus (hold) -> curve to the roof (by 1.95) -> scorch the roof -> the tree (3.6) -> east
  const gAt = (tt) => {
    if (tt <= 0.75) return G0;
    if (tt <= 1.95) return bez(G0, [16.5, -10.5], GR, sm((tt - 0.75) / 1.2));
    if (tt <= 3.05) { const u = (tt - 1.95) / 1.1; return [GR[0] + 0.55 * Math.sin(u * 5.2), GR[1] + 0.22 * Math.sin(u * 3.1)]; }
    const R1 = [GR[0] + 0.55 * Math.sin(5.2), GR[1] + 0.22 * Math.sin(3.1)];
    if (tt <= 3.6) { const u = sm((tt - 3.05) / 0.55); return [R1[0] + (GT[0] - R1[0]) * u, R1[1] + (GT[1] - R1[1]) * u]; }
    if (tt <= 3.95) { const u = (tt - 3.6) / 0.35; return [GT[0] + 0.5 * Math.sin(u * 3), GT[1] - 0.3 * u]; }
    const u = (tt - 3.95) / 0.9, E = [GT[0] + 0.5 * Math.sin(3), GT[1] - 0.3];
    return [E[0] + (EXIT.x - E[0]) * ease.inCubic(clamp(u)) , E[1] + (EXIT.z - E[1]) * ease.inCubic(clamp(u))];
  };
  const gVec = (tt) => { const [x, z] = gAt(tt); return new THREE.Vector3(x, 0, z); };
  const hitAt = (tt) => rayHit(gVec(tt), [CAB, BODY], [CAN], SUNV);
  // first time the spot meets the car / the tree (for flames, paint, wisps, sound)
  let T_CAR = null, T_TREE = null; for (let t = 0.75; t < 4.6; t += 0.01) { const id = hitAt(t).id; if (T_CAR == null && (id === 'car' || id === 'body')) T_CAR = t; if (T_TREE == null && id === 'tree') T_TREE = t; }
  // N3 burns: one ribbon per surface run, from the moment the point is hot (0.55 s)
  const burns = burnRuns(S, hitAt, 0.55, 4.6, { width: 0.6 });
  // flames: roof (2.55-2.95), then the whole car (3.0-3.4); the canopy flares as the spot reaches it
  const R = rng(511), fl = [];
  // (pass 2: taller, fewer-overlapping flames at a lower intensity so they read ORANGE at 45 m instead of a white bloom blob)
  for (let i = 0; i < 9; i++) fl.push({ p: new THREE.Vector3(cabX + ((i % 3) - 1) * 0.7, CAB.max.y - 0.05, cz + (Math.floor(i / 3) - 1) * 0.5), s: 2.4 + R() * 1.6, t0: 2.5 + R() * 0.4, grow: 0.5, seed: R() });
  for (let i = 0; i < 12; i++) fl.push({ p: new THREE.Vector3(cx + (R() - 0.5) * HC.L * 0.95, BODY.max.y - 0.1, cz + (R() - 0.5) * HC.W * 0.8), s: 3.2 + R() * 2.8, t0: 2.95 + R() * 0.45, grow: 0.55, seed: R() });
  for (let i = 0; i < 16; i++) { const a = R() * 6.283, e = 0.15 + R() * 0.9; const d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    fl.push({ p: CAN.c.clone().addScaledVector(d, CAN.r * 0.85), s: 3.0 + R() * 3.0, t0: (T_TREE ?? 3.5) + 0.04 + R() * 0.3, grow: 0.35, seed: R() }); }
  const flames = createFlames(S, fl, { I: 2.8 });
  // thin dark wisps: off the char line, the roof (smoking by 2.0), the burning car, the canopy
  const wp = [];
  for (let t = 0.8; t < (T_CAR ?? 1.9); t += 0.09) { const h = hitAt(t); if (h.id === 'ground') wp.push({ p: h.p.clone(), h: 1.2 + R() * 1.4, w: 0.35, t0: t + 0.2, grow: 0.5, a: 0.16 + R() * 0.08, seed: R() }); }
  for (let i = 0; i < 5; i++) wp.push({ p: new THREE.Vector3(cabX + (R() - 0.5) * 1.6, CAB.max.y, cz + (R() - 0.5) * 1.0), h: 2.6 + R() * 2.2, w: 0.5, t0: (T_CAR ?? 1.9) + 0.05 + i * 0.06, grow: 0.5, a: 0.32, seed: R() });
  for (let i = 0; i < 4; i++) wp.push({ p: new THREE.Vector3(cx + (R() - 0.5) * 3, CAB.max.y + 1.6, cz + (R() - 0.5)), h: 6 + R() * 3, w: 1.0, t0: 3.1 + i * 0.1, grow: 0.8, a: 0.3, seed: R() });
  for (let i = 0; i < 3; i++) wp.push({ p: CAN.c.clone().add(new THREE.Vector3((R() - 0.5) * 2, CAN.r + 1.5, (R() - 0.5) * 2)), h: 6 + R() * 3, w: 1.1, t0: (T_TREE ?? 3.5) + 0.35 + i * 0.1, grow: 0.8, a: 0.26, seed: R() });
  const wisps = createWisps(S, wp);
  // the crowd runs clear of the spot (never into it)
  const flee = fleeCrowd(W.crowd.meshes.map((m) => m.userData.list), (tt) => { const h = hitAt(tt); return [h.p.x, h.p.z]; }, { R: 14, tMin: 0.6, tMax: 4.5, seed: 21 });
  const st0 = { T_CAR, T_TREE };
  return { W, rig, hitAt, gVec, CAN, tree, T: st0, flames,
    update(t, tt, x = {}) {
      flee.apply(tt);
      W.update(t, { agitation: 0.25 + 0.35 * clamp((tt - 0.8) / 0.8), focus: new THREE.Vector3(24, 0, -6) });
      const D = lensD('s01_plaza', tt), st = frame1State(tt);
      beamOnto(rig, { ...st, ...SPOT_LOOK, D, spot: gVec(tt), t, ...x.beam }, hitAt(tt));
      burns.forEach((b) => b.update(tt));
      flames.update(tt); wisps.update(tt);
      tintCar(W.C, 0, clamp(((tt - (T_CAR ?? 1.9)) - 0.1) / 1.3));
      return st;
    } };
}
