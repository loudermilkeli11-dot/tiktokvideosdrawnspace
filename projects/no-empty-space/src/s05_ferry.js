// s05_ferry (film 23.5-30.0, 195 fr; ferry T 25.50, done 26.10). Group B.
// From a fishing boat in the inlet, 35 mm, a slow push: the docked, empty ferry (FUORI SERVIZIO) implodes, its hull plates
// shear inward into a hot point that drops into the sea; the water walls rush into the hole and SLAM into a curtain geyser
// of white water; a ring wave runs out, rocks the moored boats and slaps the quay; the crowd on the east promenade runs back;
// startled fish leap and one lands in the arms of the tourist filming in our bow. Opens landing out of s04's whip-pan right.
// Page t = shot time + 4; every motion is a pure function of FILM time.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { waveHeight } from '@engine/ocean.js';
import { rng, clamp, sstep, ease } from '@engine/util.js';
import { harbourWorld, POST_DAY, SAMPLES, squeeze, shardsFrom, bits, inrush, makePerson, signBoard, townsfolk, FERRY, xE, QUAY_Y,
  groundH, isLand, D2R, qn } from './kit.js';
import { SQZ, SHOT, depthAt, doneAt } from './story.js';
import { waterRing, pitDisc, foamPatches, fishMesh, boatsB } from './groupB_fx.js';
import { boatGeometry } from './harbour.js';
import { createSpray } from '@engine/splash.js';
import { SUN, SUN_COL, HAZE } from './kit.js';

const NAME = 's05_ferry', T0 = SHOT[NAME].t0;                        // 23.5
const TQ = SQZ.ferry.T, DONE = doneAt('ferry');                       // 25.5, 26.1
const TS = DONE + 0.22;                                               // the walls of water meet: the slam (26.32)
const AMP = 0.28;
// samples: 12 (kit) inside the whip and the implosion -> slam window; 5 elsewhere (measured full size on the GPU: 12 = ~3 s/frame,
// 6 = 1.3 s; the spray draws its own streaks). Average over the shot ~1.5 s. Page t: whip tt < 0.35; squeeze film 25.45-26.6.
const S = createStudio({ samples: (t) => { const f = T0 + t - 4; return (t - 4 < 0.35 || (f > 25.45 && f < 26.6)) ? SAMPLES[NAME] : 5; }, shadows: true, near: 0.05, far: 2e4, post: POST_DAY });
const W = harbourWorld(S, { keepOut: [[70, -335, 62]], people: 0.8 });
// KIT FIX (reported to the lead): harbour FERRY.x = 84 puts the hull inside the east promenade and its first row of houses
// (xE(-335) = 72.3). Moor it alongside the quay wall instead: 1.6 m off the wall.
const FX = xE(FERRY.z) - FERRY.beam / 2 - 1.6;                        // 64.2
W.ferry.position.x = FX; W.ferry.updateMatrixWorld(true);
const C0 = new THREE.Vector3(FX, 1.2, FERRY.z);
// the story prop on the ship itself (it is squeezed with her): OUT OF SERVICE
const banner = signBoard(S, 'FUORI SERVIZIO', new THREE.Vector3(FX - (FERRY.beam - 1.2) / 2 - 0.08, 6.3, FERRY.z + 4), 15, 2.0, -Math.PI / 2, { bg: '#f4f1ea', fg: '#b8382e' });
W.ferry.attach(banner);
// mooring ropes: quay bollards -> the hull (they go with her, then whip slack into the water)
const ROPES = [-30, -12, 14, 31].map((dz) => ({ a: new THREE.Vector3(xE(FERRY.z) + 1.2, QUAY_Y + 0.5, FERRY.z + dz + (dz > 0 ? 6 : -6)), b: new THREE.Vector3(FX + FERRY.beam / 2, 4.6, FERRY.z + dz) }));
const ropeM = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9, flatShading: true }), bollM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, flatShading: true });
const ropeSeg = ROPES.map((r) => { const segs = []; for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 5), ropeM); m.castShadow = true; S.scene.add(m); segs.push(m); }
  const bo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), bollM); bo.position.copy(r.a).setY(QUAY_Y + 0.35); S.scene.add(bo); return segs; });

// ---------------------------------------------------------------- THE SQUEEZE (hull plates shear inward; big plates + fine shards)
W.ferry.updateMatrixWorld(true);
const SQ = squeeze(S, { T: TQ, dur: SQZ.ferry.dur, c0: C0, sources: [W.ferry], shards: shardsFrom([W.ferry], 15000, { size: [0.3, 1.6], seed: 5 }),
  drop: (f) => depthAt('ferry', f), spin: 4, tear: 0.45, bead: { r: 0.35, minPx: 7, I: 10 }, streak: { len: 5, w: 0.15 }, light: { I: 900, dist: 160 } });
const SQ2 = squeeze(S, { T: TQ, dur: SQZ.ferry.dur, c0: C0, sources: [], shards: shardsFrom([W.ferry], 1100, { size: [1.6, 4.2], seed: 9 }),
  drop: (f) => depthAt('ferry', f), spin: 3.4, tear: 0.5, bead: { I: 0 } });

// ---------------------------------------------------------------- the water: bore -> pit -> slam -> geyser curtain -> ring wave
const AX = [FERRY.beam / 2 + 3.5, FERRY.len / 2 + 5];                  // the hole's ellipse (m), x and z semi-axes
const bore = waterRing(S, { c: C0.clone().setY(0), ax: AX, segA: 180, segR: 10 });
const pit = pitDisc(S, C0.clone().setY(0), AX);
const ringA = waterRing(S, { c: C0.clone().setY(0), ax: [1, 1], segA: 220, segR: 12 });
const ringB = waterRing(S, { c: C0.clone().setY(0), ax: [1, 1], segA: 220, segR: 12 });
const boreIn = (f) => 1 - ease.inCubic(clamp((f - (TQ + 0.12)) / (TS - TQ - 0.12)));   // 1 -> 0 at the slam
const ringR = (a) => 9 + 15.5 * a, ringH = (a) => 2.8 * Math.exp(-a / 2.6) + 0.35;      // the outgoing ring (m)
const R = rng(505), gey = [], quay = [], spr = [];
// THE GEYSER: the walls meet along the keel line, so a curtain of white water shoots up, tallest mid-ship (a central jet to
// ~75 m), with a crown of sheets peeling outward. Chunky low-poly clumps (the kit family) carry the mass; streaky droplets
// and sheets (splash.createSpray) give it the wet sparkle and the falling veil.
for (let i = 0; i < 320; i++) { const zz = (R() * 2 - 1) * (R() < 0.55 ? 0.35 : 1), mid = Math.pow(1 - zz * zz, 2), cr = R() < 0.3;
  const p = [C0.x + (R() - 0.5) * 2.5, -0.5, C0.z + zz * AX[1] * 0.8];
  const vy = cr ? 6 + 10 * R() * (0.4 + mid) : (10 + 28 * Math.pow(R(), 0.6)) * (0.35 + 0.65 * mid), ox = cr ? (R() < 0.5 ? -1 : 1) * (3 + 6 * R()) : (R() - 0.5) * 3;
  gey.push({ p, v: [ox, vy, (R() - 0.5) * 2.5 + zz * 2], t0: TS + 0.3 * Math.pow(R(), 2) + (cr ? 0.06 : 0), size: cr ? 0.3 + 0.6 * R() : 0.25 + 0.85 * Math.pow(R(), 2.2),
    col: R() < 0.7 ? 0xffffff : 0xe2fbff, shape: 3, drag: 0.2, floor: -5, seed: R(), spin: 0.8 }); }
for (let i = 0; i < 7000; i++) { const zz = (R() * 2 - 1) * (R() < 0.6 ? 0.3 : 1), mid = Math.pow(1 - zz * zz, 2), kind = R() < 0.72 ? 0 : 1, crown = R() < 0.25;
  const vy = crown ? 5 + 12 * R() * (0.4 + mid) : (12 + 30 * Math.pow(R(), 0.55)) * (0.3 + 0.7 * mid);
  spr.push({ p: [C0.x + (R() - 0.5) * 2.5, 0.2, C0.z + zz * AX[1] * 0.8], v: [crown ? (R() < 0.5 ? -1 : 1) * (2 + 7 * R()) : (R() - 0.5) * 3.5, vy, (R() - 0.5) * 3 + zz * 2.5],
    t0: TS + 0.4 * Math.pow(R(), 2), size: kind ? 1.6 + 3.2 * R() : 0.25 + 0.6 * R(), drag: kind ? 0.5 : 0.25, life: 7, kind, shade: 0.85 + 0.3 * R() }); }
// the ring wave hits the quay wall alongside (it is 8 m away): a curtain of spray up and over the promenade
for (let i = 0; i < 900; i++) { const z = C0.z + (R() * 2 - 1) * 48, dz = Math.abs(z - C0.z);
  quay.push({ p: [xE(z) - 0.3, 0.3, z], v: [1.5 + 4 * R(), (6 + 11 * R()) * (1 - 0.5 * dz / 48), (R() - 0.5) * 3], t0: TS + 0.12 + dz / 26 + 0.12 * R(), size: 0.35 + 0.9 * R(),
    col: R() < 0.8 ? 0xf6f8f6 : 0xbfe8ea, shape: 3, drag: 0.6, floor: QUAY_Y - 0.1, life: 2.4, seed: R() }); }
for (let i = 0; i < 1600; i++) { const z = C0.z + (R() * 2 - 1) * 48, dz = Math.abs(z - C0.z);
  spr.push({ p: [xE(z) - 0.4, 0.5, z], v: [1.5 + 3 * R(), (5 + 12 * R()) * (1 - 0.5 * dz / 48), (R() - 0.5) * 3], t0: TS + 0.12 + dz / 26 + 0.12 * R(), size: R() < 0.7 ? 0.3 + 0.5 * R() : 1.5 + 2 * R(), drag: 0.5, life: 2.6, kind: R() < 0.7 ? 0 : 1 }); }
const water = bits(S, [...gey, ...quay]);
const spray = createSpray(S, spr, { hazeD: 9000 });
spray.U.sunDir.value.copy(SUN); spray.U.sunCol.value.set(SUN_COL).multiplyScalar(1.15); spray.U.amb.value.set(0x9ab8d8); spray.U.hazeCol.value.set(HAZE.col); spray.U.streak.value = 1 / 15;
{ const ob = W.ocean.refl.onBeforeRender; W.ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob && ob(r, sc, cam); spray.mesh.visible = true; }; }
// the air inrush on the quay alongside: fish crates, buoys, a life ring, papers, hats -> into the point
const inr = inrush(C0, TQ, 520, { r: [8, 34], y: [0.15, 1.3], ground: (x, z) => (isLand(x, z) ? groundH(x, z) : -50), speed: [6, 14],
  cols: [0x2f6fb8, 0xf08a2a, 0xf4f1ea, 0xd2402e, 0x8a5a34, 0xf2c53a, 0x2fa8a8], size: [0.12, 0.55], drag: 2.4, seed: 51 })
  .filter((b) => b.p[1] > 0).map((b, i) => ({ ...b, shape: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : b.shape }));
const inBits = bits(S, inr);
// foam on the water after the slam (drifts out with the ring), and the boil where the hole closed
const FL = []; for (let i = 0; i < 260; i++) { const a = R() * 6.283, r = Math.sqrt(R()), out = R() < 0.55;
  FL.push({ x: C0.x + Math.cos(a) * (out ? 10 : AX[0] * r), z: C0.z + Math.sin(a) * (out ? 14 : AX[1] * r * 0.9), s: 1.2 + 3.5 * R(), sx: 0.6 + 0.8 * R(), r: R() * 6,
    t0: TS + 0.1 + 0.5 * R(), t1: 40, drift: out ? [Math.cos(a) * 9, Math.sin(a) * 9] : [Math.cos(a) * 1.5, Math.sin(a) * 1.5] }); }
const foam = foamPatches(S, FL);

// ---------------------------------------------------------------- the crowd on the east promenade: watchers, then runners
const WATCH = [], RUN = [], RR = rng(77);
for (let i = 0; i < 64; i++) { const z = FERRY.z + (RR() * 2 - 1) * 64, x = xE(z) + 1.4 + RR() * 8.5;
  const away = new THREE.Vector2(1.0, Math.sign(z - C0.z || 1) * (0.6 + RR())).normalize();
  WATCH.push({ x, z, y: QUAY_Y, yaw: Math.PI / 2 + (RR() - 0.5) * 0.8, x0: x, z0: z });
  RUN.push({ x, z, y: -60, yaw: Math.atan2(-away.x, -away.y), x0: x, z0: z, d: away, v: 3.2 + 2 * RR(), t: TQ + 0.35 + 0.5 * RR(), pose: 'run' }); }
const watchers = townsfolk(S, WATCH, { poses: ['stand', 'point', 'phoneUp', 'filming', 'arms', 'shade', 'point'], seed: 23, hats: 0.5 });
const runners = townsfolk(S, RUN, { poses: ['run'], seed: 23, hats: 0.5 });
const wList = watchers.crowd.meshes.flatMap((m) => m.userData.list), rList = runners.crowd.meshes.flatMap((m) => m.userData.list);
const srcOf = (p) => RUN.find((r) => Math.abs(r.x0 - p.x) < 1e-6 && Math.abs(r.z0 - p.z) < 1e-6) ?? RUN[0];
wList.forEach((p) => { p._src = srcOf(p); }); rList.forEach((p) => { p._src = srcOf(p); });

// ---------------------------------------------------------------- moored gozzi around the berth (they ride the ring wave)
const BL = [[xE(-262) - 4.8, -262, 0.05], [xE(-272) - 4.8, -272, -0.04], [xE(-402) - 4.8, -402, 0.06], [xE(-412) - 4.8, -412, -0.05], [18, -318, 0.9], [4, -350, 2.2], [26, -392, -0.6], [-14, -305, 1.4], [32, -280, 2.8]]
  .map(([x, z, yaw], i) => ({ x, z, yaw: (i < 4 ? Math.PI / 2 : 0) + yaw, s: 1.0 + 0.15 * (i % 3), col: [0x2f6fb8, 0xd2402e, 0xf2c53a, 0x2fa8a8, 0xf4f1ea, 0x3f8a4a, 0xf08a2a, 0x24345a, 0xe86aa0][i], ph: i * 1.7 }));
const extra = boatsB(S, BL);
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function ringLift(x, z, film) {                                          // the ring waves' heave + slope at (x, z)
  const a = film - TS; if (a <= 0) return [0, 0];
  const r = Math.hypot(x - C0.x, z - C0.z); let h = 0, s = 0;
  for (const [lag, g] of [[0, 1], [1.1, 0.5]]) { const aa = a - lag; if (aa <= 0) continue; const R0 = ringR(aa), Hh = ringH(aa) * g, d = (r - R0) / 7;
    h += Hh * Math.exp(-d * d); s += -Hh * 2 * d / 7 * Math.exp(-d * d); }
  return [h, s];
}
function bobPose(b, film, base = -0.35) {
  const t = film + 4, [h, s] = ringLift(b.x, b.z, film), y = waveHeight(b.x, b.z, t, AMP, 0) + base + h;
  const ang = Math.atan2(b.z - C0.z, b.x - C0.x);                        // tilt about the axis tangent to the ring
  _e.set(0.04 * Math.sin(t * 1.3 + (b.ph ?? 0)) + 0.45 * s * Math.sin(ang - b.yaw), b.yaw, 0.06 * Math.sin(t * 1.1 + (b.ph ?? 0) * 2) - 0.45 * s * Math.cos(ang - b.yaw), 'YXZ');
  return { p: new THREE.Vector3(b.x, y, b.z), q: _q.clone().setFromEuler(_e) };
}

// ---------------------------------------------------------------- OUR boat: the camera's gozzo, a fisherman and a tourist in the bow
const CB = { x: qn('bx', -22), z: qn('bz', -258) };
const HEAD_TO = new THREE.Vector2(C0.x - CB.x, C0.z - CB.z).normalize();
CB.yaw = Math.atan2(-HEAD_TO.x, -HEAD_TO.y) - 0.06;                      // bow a little right of the aim (fisherman right, tourist left)
const boat = new THREE.Group(); S.scene.add(boat);
{ const g0 = boatGeometry(), mast = new THREE.Color(0x6a5038), P = g0.attributes.position, Cc = g0.attributes.color;
  for (let i = 0; i < Cc.count; i += 3) if (Math.abs(Cc.getX(i) - mast.r) < 0.01 && Math.abs(Cc.getY(i) - mast.g) < 0.01) for (let k = 0; k < 3; k++) P.setXYZ(i + k, 0, 0, 0);   // no mast in our boat
  const hull = new THREE.Mesh(g0, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, side: THREE.DoubleSide }));
  hull.castShadow = hull.receiveShadow = true; hull.scale.setScalar(1.18); boat.add(hull);
  const tint = new THREE.Color(0x2f6fb8); for (let i = 0; i < Cc.count; i++) { if (Cc.getX(i) > 0.99 && Cc.getY(i) > 0.99) Cc.setXYZ(i, tint.r, tint.g, tint.b); } }
const DECK = 1.1 * 1.18;
const fisher = makePerson(S, { hair: 'short', top: 0x24345a, bot: 0x8a6a4a, build: 1.15, height: 1.74, fem: 0, hat: { k: 3, col: 0xd2402e, band: 0x24345a }, skin: 0xa8704e, pose: 'sit' });
const tourist = makePerson(S, { hair: 'short', top: 0xe86aa0, bot: 0xc8b48a, build: 1.3, height: 1.7, fem: 0.05, hat: { k: 2, col: 0xf4f1ea, band: 0x2a3550 }, skin: 0xe0b090, pose: 'filming', bag: 'tote', bagCol: 0x7a8a3a });
['sit', 'point', 'handsHead'].forEach((p) => fisher.setPose(p)); fisher.setPose('sit');
['filming', 'catch'].forEach((p) => tourist.setPose(p)); tourist.setPose('filming');
boat.add(fisher.root, tourist.root);
// the camera stands on the stern bench (eye 1.9 m above the deck, the wheelhouse roof frames the bottom); the tourist films from
// the port side (frame left, clear of the right button rail); the fisherman sits on a fish crate at the bow
const CAM_L = new THREE.Vector3(0.1, DECK + 2.2, 2.95);
fisher.root.position.set(0.2, DECK - 0.05, -3.0); fisher.root.rotation.y = -0.15;
tourist.root.position.set(-0.55, DECK, -1.6); tourist.root.rotation.y = 0.1;
// clutter on the wheelhouse roof (the foreground frame): a life ring, a rope coil, a bucket, a lantern
{ const RM = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8 }), RY = DECK + 1.2 * 1.18;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 14), RM(0xf08a2a)); ring.rotation.x = -Math.PI / 2; ring.position.set(-0.62, RY + 0.09, 1.0); boat.add(ring);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.19, 0.2), RM(0xf4f1ea)); const a = k * Math.PI / 2 + 0.4; b.position.set(-0.62 + Math.cos(a) * 0.3, RY + 0.09, 1.0 + Math.sin(a) * 0.3); b.rotation.y = -a; boat.add(b); }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 5, 12), RM(0xd8c8a0)); coil.rotation.x = -Math.PI / 2; coil.position.set(0.66, RY + 0.07, 1.3); boat.add(coil);
  const coil2 = coil.clone(); coil2.scale.setScalar(0.8); coil2.position.y += 0.1; boat.add(coil2);
  const buck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 8), RM(0xd2402e)); buck.position.set(0.62, RY + 0.14, 2.2); boat.add(buck);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 6), RM(0x2a2a2e)); lan.position.set(-0.6, RY + 0.15, 2.1); boat.add(lan);
  boat.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
{ const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x2f6fb8, flatShading: true })); crate.position.set(0.25, DECK + 0.2, -2.95); crate.castShadow = true; boat.add(crate); }
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 3.4, 5).translate(0, 1.7, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, flatShading: true }));
rod.position.set(0.15, 0.95, -0.3); rod.rotation.set(-1.0, -0.5, 0); fisher.root.add(rod);
const phoneT = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshStandardMaterial({ color: 0x1f1f24, flatShading: true })); S.scene.add(phoneT);
// fish: 6 startled leapers around us + THE one that lands in the tourist's arms
const leaps = []; { const L = rng(9); for (let i = 0; i < 7; i++) leaps.push({ m: fishMesh(S, i % 2 ? 0x9ab4c4 : 0xa8b8a0), t0: TS + 0.35 + 1.4 * L(), dur: 0.75 + 0.3 * L(), lx: (L() - 0.3) * 14, lz: -5 - L() * 18, h: 1.0 + 1.3 * L(), yaw: L() * 6 }); }
const hero = fishMesh(S, 0x8ec0d8); hero.scale.setScalar(2.1);
const T_LEAP = 27.75, T_CATCH = 28.45;                                    // film: the catch fish leaves the water / lands in his arms

S.run((t) => {
  const tt = Math.max(t - 4, 0), film = T0 + tt, page = film + 4;
  // our boat on the waves (+ the ring's leading swell would only arrive after the cut; it rocks on the harbour chop)
  const bx = CB.x + HEAD_TO.x * 0.45 * tt, bz = CB.z + HEAD_TO.y * 0.45 * tt;                  // the slow push: we drift in
  const by = waveHeight(bx, bz, page, AMP, 0) - 0.42;
  const roll = 1.6 * Math.sin(page * 0.9 + 0.7) + 0.6 * Math.sin(page * 1.7), pitch = 0.9 * Math.sin(page * 0.75 + 2.1);
  boat.position.set(bx, by, bz); boat.rotation.set(pitch * D2R, CB.yaw, roll * D2R, 'YXZ'); boat.updateMatrixWorld(true);
  // the camera: standing just in front of the wheelhouse, eye 1.62 m above the deck; lands out of the whip (yaw -38° -> 0)
  const eye = CAM_L.clone().applyMatrix4(boat.matrixWorld);
  const whipY = -38 * (1 - ease.outCubic(clamp(tt / 0.32)));
  const aim = new THREE.Vector3(C0.x - 1, 12.5, C0.z).sub(eye); aim.applyAxisAngle(new THREE.Vector3(0, 1, 0), (-1.6 + whipY) * D2R);
  const mm = 35 + 2.5 * ease.inOutSine(clamp((tt - 0.4) / 6));
  applyCam(S.camera, { pos: eye, look: eye.clone().add(aim), mm, roll: -roll * 0.7 }, shake(t, 0.05 + 0.5 * kick(film, TS, 1.4), 1.1, 3));
  // world, boats on the ring wave
  W.update(film, { focus: new THREE.Vector3(30, 0, -300), box: 95, agitation: film > TQ ? 0.7 : 0.25,
    boatPose: (b) => { const r = Math.hypot(b.x - C0.x, b.z - C0.z); return film > TS && r < 160 ? bobPose(b, film) : undefined; } });
  extra.update(film, (b) => bobPose(b, film));
  // the squeeze
  SQ.update(film, S.camera); SQ2.update(film, S.camera);
  if (SQ.light) SQ.light.position.y = Math.max(SQ.light.position.y, 0.6);
  // the water
  const q = boreIn(film), boreOn = film > TQ + 0.1 && film < TS + 0.08;
  bore.set({ vis: boreOn, rIn: Math.max(0.02, q), w: 0.32 + 0.25 * (1 - q), H: 0.6 + 2.6 * (1 - q), steep: 1, foam: 0.5 + 0.5 * (1 - q), time: page });
  pit.set(boreOn ? q * 0.98 : 0);
  const a = film - TS;
  ringA.set({ vis: a > 0, rIn: ringR(Math.max(a, 0)) - 5, w: 13, H: ringH(Math.max(a, 0)), steep: 0.25, foam: 0.9 * Math.exp(-a / 3.5) + 0.1, time: page });
  ringB.set({ vis: a > 1.1, rIn: ringR(Math.max(a - 1.1, 0)) - 4, w: 10, H: 0.5 * ringH(Math.max(a - 1.1, 0)), steep: 0.2, foam: 0.6, time: page });
  water.update(film); inBits.update(film); spray.update(film);
  foam.update(film, (x, z) => waveHeight(x, z, page, AMP, 0) + ringLift(x, z, film)[0]);
  // mooring ropes: straight -> dragged with the hull toward the point -> whipped slack into the water
  ROPES.forEach((rp, i) => { const k = SQ.kAt(film), tail = clamp((film - TQ - 0.15) / 0.5);
    const b = rp.b.clone().lerp(C0, Math.min(1, k * 1.2)); if (tail > 0) b.lerp(rp.a.clone().add(new THREE.Vector3(-4, -2.5, (i - 1.5) * 2)), ease.outCubic(tail));
    ropeSeg[i].forEach((m, k2) => { const u0 = k2 / 6, u1 = (k2 + 1) / 6, sag = (u) => (tail > 0 ? 1.4 * tail : 0.6) * 4 * u * (1 - u);
      const p0 = rp.a.clone().lerp(b, u0).setY(rp.a.y + (b.y - rp.a.y) * u0 - sag(u0)), p1 = rp.a.clone().lerp(b, u1).setY(rp.a.y + (b.y - rp.a.y) * u1 - sag(u1));
      const d = p1.clone().sub(p0), L = d.length(); m.position.copy(p0).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }); });
  // the promenade crowd turns and runs (each at their own moment)
  wList.forEach((p) => { p.y = film < p._src.t ? QUAY_Y : -60; });
  rList.forEach((p) => { const src = p._src, a2 = film - src.t;
    if (a2 < 0) { p.y = -60; return; } const d = Math.min(src.v * a2, 9 + 4 * (src.v - 3)); p.y = QUAY_Y;
    p.x = Math.min(src.x0 + src.d.x * d, xE(p.z) + 11.5); p.z = src.z0 + src.d.y * d; });
  watchers.update(page, { agitation: film > TQ - 0.2 ? 0.6 : 0.2 }); runners.update(page, { agitation: 0.9 });
  // our bow: the fisherman points at the geyser (rod dropped), the tourist films... then catches a fish
  fisher.setPose(film < TS + 0.25 ? 'sit' : film < 28.9 ? 'point' : 'handsHead'); rod.visible = film < TS + 0.25;
  tourist.setPose(film < T_CATCH - 0.3 ? 'filming' : 'catch');
  // he swings round to port (frame left) as the fish comes at him: his arms and the fish read in profile
  // ...then turns round to us with it, arms full ("look what I caught")
  tourist.root.rotation.y = 0.1 + 1.3 * ease.inOutCubic(clamp((film - (T_LEAP - 0.1)) / 0.45)) + 1.35 * ease.inOutCubic(clamp((film - (T_CATCH + 0.35)) / 0.6));
  tourist.root.updateMatrixWorld(true);
  const tm = tourist.root.matrixWorld;
  phoneT.visible = film < T_CATCH - 0.3; if (phoneT.visible) { const g = tourist.mesh.geometry.userData.phone?.[0]; const pp = g ? new THREE.Vector3(...g.p) : new THREE.Vector3(0.1, 1.55, -0.4); phoneT.position.copy(pp.applyMatrix4(tm)); phoneT.quaternion.copy(boat.quaternion); }
  const hands = new THREE.Vector3(0, 1.22, -0.46).applyMatrix4(tm);
  leaps.forEach((L) => { const u = (film - L.t0) / L.dur; if (u < 0 || u > 1) { L.m.visible = false; return; } L.m.visible = true;
    const base = new THREE.Vector3(L.lx, 0, L.lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), CB.yaw).add(boat.position);
    L.m.position.set(base.x + Math.cos(L.yaw) * (u - 0.5) * 2.4, waveHeight(base.x, base.z, page, AMP, 0) + 4 * L.h * u * (1 - u) - 0.2, base.z + Math.sin(L.yaw) * (u - 0.5) * 2.4);
    L.m.rotation.set((0.5 - u) * 2.2, -L.yaw + Math.PI / 2, 0); L.m.userData.tail.rotation.y = 0.6 * Math.sin(page * 30 + L.t0); });
  { const u = (film - T_LEAP) / (T_CATCH - T_LEAP);
    if (u < 0) hero.visible = false;
    else { hero.visible = true; const start = new THREE.Vector3(-3.6, 0, -4.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), CB.yaw).add(boat.position);
      start.y = waveHeight(start.x, start.z, page, AMP, 0) - 0.2;
      if (u < 1) { const p = start.clone().lerp(hands, u); p.y += 3.2 * u * (1 - u) * 1.3; hero.position.copy(p); hero.rotation.set(-1.3 + 2.0 * u, CB.yaw + 0.4, 0.5 * Math.sin(page * 18)); }
      else { hero.position.copy(hands); tourist.root.getWorldQuaternion(hero.quaternion); hero.rotateY(Math.PI / 2); hero.rotateZ(0.25 * Math.sin(page * 14)); }
      hero.userData.tail.rotation.y = (u < 1 ? 0.7 : 0.9) * Math.sin(page * (u < 1 ? 32 : 22)); } }
});
