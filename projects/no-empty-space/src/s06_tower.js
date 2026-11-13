// s06_tower (film 30.0-37.0, 210 fr; tower T 33.00, done 33.80). Group B. THE SET PIECE.
// From the terrace (FRAME1_CAM.pos), 85 mm, locked. 30.0-33.0 the pre-rumble: the water trembles, a crane's jib slews, gulls
// lift off the quay and flap across the lens. 33.0 (FIX PASS): the 381 m tower ITSELF fails in 0.8 s: top and bottom crush
// toward one point in the middle of the shaft, floors pancaking at both racing fronts, the walls denting and folding in at the
// waist, the column kinking into a Z, cranes snapping; glass, cladding and frame shards tear off at the fronts and fly straight
// into the point (slight twist only in the last 0.2 s); the bead drops into the hill. 33.9: ONE thin crisp dust ring (+ a
// fainter second) races out over the harbour toward us, heavy dark chunks arc into the water; the water flattens; the grade
// warms; the pressure front blows geranium petals, napkins, leaves and glass past the lens (36.3) and shakes the camera.
// Page t = shot time + 4; everything is a pure function of FILM time.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { createBirds } from '@engine/crowd.js';
import { rng, clamp, sstep, ease } from '@engine/util.js';
import { harbourWorld, POST_DAY, SAMPLES, squeeze, shardsFrom, bits, FRAME1_CAM, TOWER, HEAD, TERRACE, PAL, groundH, gradeDust, qn } from './kit.js';
import { SQZ, SHOT, depthAt, doneAt } from './story.js';
import { tessellate, foldTower, crushShards, dustRing } from './fixBC_tower.js';

const NAME = 's06_tower', T0 = SHOT[NAME].t0;                  // 30.0
const TQ = SQZ.tower.T, DONE = doneAt('tower');                 // 33.0, 33.8
const T_FRONT = 36.3;                                           // the pressure front reaches the terrace (debris past the lens + shake)
// samples (measured full size on the GPU: 12 everywhere = 1.6-2.8 s/frame, over budget): 4 in the calm pre-rumble, the kit's 12
// through the implosion (32.9-34.2), 6 while the dust rolls in, 8 for the pressure-front jolt (36.2-37.0).
const S = createStudio({ samples: (t) => { const f = T0 + t - 4; return f < 32.9 ? 4 : f < 34.2 ? SAMPLES[NAME] : f < 36.2 ? 6 : 8; }, shadows: true, near: 0.05, far: 2.2e4, post: POST_DAY });
const W = harbourWorld(S, { box: 260, ferry: false });   // the ferry was squeezed in s05 (continuity, phase 3)
// the squeeze point: the tower's foot, 8 m up (inside the podium) so the finished bead shows for a beat before it sinks into the rock
const BASE = new THREE.Vector3(TOWER.x, groundH(TOWER.x, TOWER.z) + 8, TOWER.z);
// the locked 85 mm: the tower right of centre (clear of the counter), its foot on the headland at y ~ 700 (below the captions)
const CAM = { pos: FRAME1_CAM.pos.clone(), look: new THREE.Vector3(TOWER.x - qn('ax', 52), TOWER.base + qn('ay', 176), TOWER.z), mm: 85, roll: 0 };

// ---------------------------------------------------------------- the cranes: lift the red jibs out of the merged tower mesh and
// re-hang them on pivots so one can slew in the pre-rumble (they are squeezed with the tower)
const TOP = TOWER.h - 22, towerMesh = W.tower.children.find((m) => m.isMesh && m.geometry.attributes.aW);
{ const P = towerMesh.geometry.attributes.position, Cc = towerMesh.geometry.attributes.color, red = new THREE.Color(0xd2402e);
  for (let i = 0; i < P.count; i += 3) if (P.getY(i) > TOP + 48 && Math.abs(Cc.getX(i) - red.r) < 0.01 && Math.abs(Cc.getY(i) - red.g) < 0.01) for (let k = 0; k < 3; k++) P.setXYZ(i + k, 0, TOP, 0);
  P.needsUpdate = true; }
const JIBS = [[[-6, -4], 0.6], [[7, 6], 2.4]].map(([[cx, cz], yaw]) => { const g = new THREE.Group(); g.position.set(cx, TOP + 50, cz); g.rotation.y = yaw; g.userData.yaw0 = yaw;
  const red = new THREE.MeshStandardMaterial({ color: 0xd2402e, flatShading: true, roughness: 0.7 }), tr = new THREE.MeshStandardMaterial({ color: 0xe8b21e, flatShading: true });
  const jib = new THREE.Mesh(new THREE.BoxGeometry(40, 1.4, 1.4), red); jib.position.set(12, 0.7, 0); g.add(jib);
  for (let k = 0; k < 9; k++) { const tie = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), red); tie.position.set(-4 + k * 4.4, 1.9, 0); tie.rotation.z = k % 2 ? 0.6 : -0.6; g.add(tie); }
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 18, 0.15), tr); hook.position.set(26, -8.5, 0); g.add(hook); g.userData.hook = hook;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); W.tower.add(g); return g; });
W.tower.updateMatrixWorld(true);
const banner = W.tower.children.find((m) => m.isMesh && m.material.map);

// ---------------------------------------------------------------- THE SQUEEZE (FIX PASS): the TOWER ITSELF buckles and folds into
// one point in the middle of its shaft (top and bottom crushing toward it, floors pancaking, a Z-kink, the waist folding in), its
// glass, cladding and frame tear off as each crush front passes and fly straight into the point (fixBC_tower.js). No funnel.
const colorOf = (mesh, t, col) => (mesh === banner ? new THREE.Color((t * 7) % 3 < 1 ? 0xfff6e8 : 0xd2402e) : col);
const SHARDS = shardsFrom([W.tower], 30000, { size: [0.6, 3.2], seed: 61, colorOf }), PANELS = shardsFrom([W.tower], 2400, { size: [3.5, 9], seed: 63, colorOf });
// the tower's coarse boxes are split into <= 5 m triangles so they can bend
W.tower.traverse((m) => { if (m.isMesh) m.geometry = tessellate(m.geometry, 5); });
const YC = 0.47 * TOWER.h;                                      // the point: the middle of the shaft (179 m up)
const FOLD = foldTower(W.tower, { yc: YC, H: TOWER.h, kink: 20 });
const C0 = new THREE.Vector3(TOWER.x, TOWER.base + YC, TOWER.z);
const KAt = (film) => Math.pow(clamp((film - TQ) / SQZ.tower.dur), 1.25);
// the bead: born in mid-air, it is dropped onto the foot (+8 m) in 0.75 s, then follows the story's fall (liberty: real free fall
// from 179 m takes ~6 s; s07 opens on the cave-in, so the grain must be in the rock by 37.0)
const SQ = squeeze(S, { T: TQ, dur: SQZ.tower.dur, c0: C0, sources: [], shards: SHARDS.slice(0, 1).map((s) => ({ ...s, size: 1e-4 })),
  drop: (f) => depthAt('tower', f) + (YC - 8) * Math.pow(clamp((f - DONE) / 0.75), 2), bead: { r: 6, minPx: 20, I: 20, cool: 0.4, coolT: 1.2 }, streak: { len: 60, w: 1.5 }, light: { I: 4e5, dist: 1400 } });
const V1 = crushShards(S, SHARDS, W.tower, FOLD, { pop: 5, stretch: 2.2, heatI: 7, seed: 3 });
const V2 = crushShards(S, PANELS, W.tower, FOLD, { pop: 4, stretch: 1.3, seed: 5 });
// rock ripped off the headland top around the foot (sampled for shards only; never drawn), torn up into the point late
const rockDisc = (() => { const g = new THREE.CircleGeometry(60, 40, 0, Math.PI * 2); g.rotateX(-Math.PI / 2); const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) + TOWER.x, z = P.getZ(i) + TOWER.z; P.setXYZ(i, x, groundH(x, z) + 0.4, z); }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff })); m.updateMatrixWorld(true); return m; })();
const RK = [PAL.rock, PAL.rockDark, 0x8a7a62, 0x6e6458], RC = rng(71);
void rockDisc; void RK; void RC;   // (the torn-up rock disc read as a flat skirt under the tower: dropped in the fix pass)

// ---------------------------------------------------------------- the aftermath (FIX PASS): ONE thin crisp dust ring + heavy debris
// r(a) = r0 + (v/k)(1 - e^{-ka}), k = 0.5: the rebound shock reaches the ground ~0.12 s after the completion boom (33.8) and kicks
// a ring at ~1,030 m/s that reaches the water under the terrace (~1,650 m) as the shot ends. A second, fainter ring trails it.
const RING = dustRing(S, { c: new THREE.Vector3(TOWER.x, 0, TOWER.z), t0: DONE + 0.12, v: 1030, k: 0.5, r0: 30, H0: 52, Hend: 20, lean: 0.45, segA: 3000,
  base: (R) => HEAD.y * (1 - sstep(HEAD.r * 0.75, HEAD.r * 1.1, R)), col: 0xead2ab, op: 0.95 });
const RING2 = dustRing(S, { c: new THREE.Vector3(TOWER.x, 0, TOWER.z), t0: DONE + 0.5, v: 700, k: 0.6, r0: 20, H0: 34, Hend: 14, lean: 0.3, spray: false, segA: 2400,
  base: (R) => HEAD.y * (1 - sstep(HEAD.r * 0.75, HEAD.r * 1.1, R)), col: 0xd9bb8e, op: 0.6 });
// heavy debris: dark concrete, steel and rock chunks thrown off the foot, falling under gravity into the harbour; a few glass glints
const R = rng(91), chunks = [], HC = [0x5a5048, 0x6e6458, 0x4a4440, 0x3c3a38, 0x7d7266, 0x8a7a62];
const toCam = Math.atan2(FRAME1_CAM.pos.z - TOWER.z, FRAME1_CAM.pos.x - TOWER.x);
for (let i = 0; i < 240; i++) { const a = i < 170 ? toCam + (R() - 0.5) * 1.6 : R() * Math.PI * 2, v = 30 + 70 * Math.pow(R(), 1.4), up = 6 + 22 * R(), r0 = 10 + 30 * R(), glass = R() < 0.15;
  chunks.push({ p: [TOWER.x + Math.cos(a) * r0, HEAD.y + 4 + 20 * R(), TOWER.z + Math.sin(a) * r0], v: [Math.cos(a) * v, up, Math.sin(a) * v], t0: DONE + 0.05 + 0.15 * R(),
    size: glass ? 1.2 + 2 * R() : 3 + 6 * Math.pow(R(), 1.5), col: glass ? 0xbfe0ee : HC[Math.floor(R() * HC.length)], shape: glass ? 1 : R() < 0.6 ? 0 : 2, drag: 0.05, floor: 0.2, life: 0, seed: R(), spin: 1.2 }); }
const dustB = bits(S, chunks);
// the pressure front at the terrace: geranium petals, leaves, napkins, a menu card and glass blown past the lens
const blow = [], RB = rng(13), FC = [[0xd8283a, 0], [0xe8466a, 0], [0x3f7a34, 1], [0xf4f1ea, 1], [0xf2efe6, 1], [0xbfe6f0, 0], [0xd8f4ff, 0], [0xe8d29a, 1]];
for (let i = 0; i < 420; i++) { const [col, shape] = FC[Math.floor(RB() * FC.length)], z = TERRACE.railZ - 0.3 - 40 * Math.pow(RB(), 2);
  const along = (FRAME1_CAM.pos.z - z), lx = 0.11 * along + (RB() - 0.5) * (0.35 + along * 0.18);
  blow.push({ p: [lx, (z > -14 ? 9.9 : 3) + 2.5 * RB(), z], v: [(RB() - 0.5) * 3, 3 + 6 * RB(), 15 + 14 * RB()], t0: T_FRONT + 0.25 * RB() - 0.002 * along, size: (shape ? 0.05 + 0.07 * RB() : 0.025 + 0.04 * RB()) * (col === 0xe8d29a ? 2.6 : 1),
    col, shape, drag: 1.1, life: 2.5, seed: RB(), spin: 3 }); }
const blowB = bits(S, blow);
// gulls lifting off the quay in the pre-rumble, flapping across the lens (~50 m out)
const gulls = createBirds(S, 14, { flap: 11, seed: 21, color: 0xeeeae2 });
const gullPath = (page) => { const u = (page - 4 + T0 - 30.6) / 2.4; return new THREE.Vector3(-7 + 17 * u, 5 + 12 * u - 2 * u * u, -32 - 6 * u); };

S.run((t) => {
  const tt = Math.max(t - 4, 0), film = T0 + tt, page = film + 4;
  // locked; a faint tremor builds before the squeeze, a hit at the completion boom, the big jolt as the pressure front arrives
  const trem = 0.012 + 0.03 * sstep(30.8, 33.0, film) * (1 - sstep(33.0, 33.2, film));
  applyCam(S.camera, CAM, shake(t, trem + 0.16 * kick(film, DONE, 1.0) + 0.55 * kick(film, T_FRONT, 1.4), 6 + 4 * kick(film, T_FRONT, 1), 7));
  // the water trembles, then the dust front flattens it
  W.ocean.U.amp.value = 0.28 * (1 + 0.25 * sstep(31, 32.8, film) * Math.sin(page * 37)) * (1 - 0.7 * sstep(DONE, DONE + 1.5, film));
  W.update(film, { focus: BASE.clone().setY(0), box: 260, agitation: film > 31 ? 0.5 : 0.2 });
  // the crane slews in the tremor; its hook swings
  JIBS.forEach((g, i) => { const sl = i === 0 ? 0.55 * ease.inOutSine(clamp((film - 30.6) / 2.2)) : 0.12 * Math.sin(Math.max(0, film - 31.2) * 2.1) * sstep(31.2, 32, film);
    g.rotation.y = g.userData.yaw0 + sl; g.userData.hook.rotation.x = 0.15 * Math.sin(page * 2.4 + i) * sstep(30.8, 32, film); });
  // the fold: cranes snap and droop as the top crushes down; a slight twist only in the last 0.2 s
  const K = KAt(film);
  JIBS.forEach((g, i) => { g.rotation.z = -(0.7 + 0.3 * i) * sstep(TQ + 0.05, TQ + 0.35, film); });
  W.tower.visible = film < DONE - 0.005;
  FOLD.update(K, 0.5 * sstep(DONE - 0.2, DONE, film));
  SQ.update(film, S.camera);
  RING.update(film); RING2.update(film); dustB.update(film); blowB.update(film);
  gulls.update(page, gullPath, 2.6, 2.4);
  gradeDust(S, 0.32 * sstep(DONE + 0.3, 36.6, film));
});
