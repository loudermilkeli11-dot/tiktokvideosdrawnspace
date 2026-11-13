// no-empty-space group C: THE MOUNTAIN SET (s08_mountain, and s09_earth's first 1.5 s). The harbour world seen in reverse from
// the EAST PROMENADE, low (0.9 m), 70 mm, looking south along the promenade over the inlet to the head town and the 1,500 m
// mountain behind it (the promenade gives a 40 m deep foreground; the mole is only 12 m wide. 70 mm, not the board's 24 mm:
// the town's slope hides the mountain's base, so at 24 mm the whole event would be ~100 px; at 70 mm it is ~230 px tall and the
// slab stream reads). The ferry and the tower are gone (s05, s06).
//   44.5  the mountain implodes (kit squeeze: 40,000 slabs from its own faces) toward a point above the ridge; trees, dust and
//         rock from the ridge are dragged in; the bead drops behind the ridge (depthAt).
//   45.85 the GALE: the air rushes toward where it stood: leaves, napkins, bunting flags, café parasols, chairs, roof tiles,
//         laundry, spray off the water, kites, gulls and a few hats all stream away from the lens into the gap.
//   46.25 GAG 3: the gelato seller's two scoops pop off his cone and fly to the mountain; he stares at the empty cone.
// Everything is a pure function of FILM time.
import { THREE } from '@engine/engine.js';
import { POSES } from '@engine/figure.js';
import { rng, clamp, sstep } from '@engine/util.js';
import { harbourWorld, makePerson, makeGelatoCart, squeeze, shardsFrom, gradeDust, handPoint, xE, QUAY_Y, QUAY_Z, MOUNT, D2R, signBoard, styliseMat,
  plainMat, groundH, PAL, FERRY, qn, LOOK, lookDir } from './kit.js';
import { SQZ, doneAt, depthAt } from './story.js';
import { windBits, windPos } from './groupC_wind.js';
import { slabMountain } from './fixBC_mountain.js';

// ---------------------------------------------------------------- the vantage
const C = new THREE.Vector3(qn('mcx', 85), QUAY_Y + qn('mch', 0.9), qn('mcz', -575));
export const MCAM = { pos: C, yaw: qn('myaw', 185.4), pitch: qn('mpitch', 8.5), mm: qn('mmm', 70) };
const FW = new THREE.Vector3(Math.sin(MCAM.yaw * D2R), 0, -Math.cos(MCAM.yaw * D2R)), RT = new THREE.Vector3(-FW.z, 0, FW.x);
// a ground point d m ahead of the lens and s m to screen-right
export const P = (d, s, y = QUAY_Y) => new THREE.Vector3(C.x + FW.x * d + RT.x * s, y, C.z + FW.z * d + RT.z * s);
export const T_SQ = SQZ.mountain.T, T_DONE = doneAt('mountain');        // 44.5, 45.7
export const T_GALE = 45.85;                                              // the gust reaches the promenade (stylised: no delay)
export const T_SCOOP = 47.35;                                             // gag 3: the scoops let go (after the push lands: the cone sits above the counter block)
export const PUSH = [45.95, 47.2];                                        // s08's eased push onto the seller (70 -> 150 mm)
// the squeeze point: on the mountain's axis, 1,000 m up (above the town's ridge as seen from here, so the point reads)
export const C0 = new THREE.Vector3(MOUNT.x, 1000, MOUNT.z);
// s08's camera (s09 starts from its last frame): locked wide, then one eased push onto the seller (his head ~y 240, the cone
// ~y 310 design px: above the counter block, his body behind the caption band only from the thighs down)
const LOOK0 = lookDir(C, MCAM.yaw, MCAM.pitch);
export function moleCam(film) {
  const u = sstep(PUSH[0], PUSH[1], film);
  const man = P(qn('gd', 13), qn('gs', 0.6)), aim = man.add(RT.clone().multiplyScalar(-qn('pa', 0.36))).setY(QUAY_Y + qn('py', 0.8));
  const d0 = LOOK0.clone().sub(C).normalize(), d1 = aim.sub(C).normalize();
  return { pos: C.clone(), look: C.clone().add(d0.lerp(d1, u).normalize().multiplyScalar(100)), mm: MCAM.mm + (qn('pmm', 150) - MCAM.mm) * u, roll: 0 };
}
const toward = (p, speed, up = 0) => { const d = new THREE.Vector3(C0.x - p.x, 0, C0.z - p.z).normalize(); return [d.x * speed, up, d.z * speed]; };
const faceYaw = (x, z, fx, fz) => Math.atan2(-(fx - x), -(fz - z));

Object.assign(POSES, {
  coneStare: { R: { t: [0.1, 1.42, -0.3], pole: [1, -0.5, 0.2] }, L: { t: [-0.22, 0.95, -0.12], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.04, head: [0.05, -0.32], phone: 'R' },
  coneOffer: { R: { t: [0.2, 1.38, -0.5], pole: [1, -0.5, 0.2] }, L: { t: [-0.25, 1.0, -0.2], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: 0.02, head: [0.2, 0.0], phone: 'R' },
  leanWind: { R: { t: [0.06, 1.86, -0.04], pole: [1, -0.2, 0.2] }, L: { t: [-0.35, 1.2, 0.15], pole: [-1, -0.4, 0.2] }, legR: [0.35, 0.12, 0.3], legL: [-0.35, 0.12, 0.1], lean: -0.35, head: [0, -0.15] },
});

export function moleWorld(S, o = {}) {
  const R = rng(o.seed ?? 808);
  const W = harbourWorld(S, { ferry: false, tower: false, terrace: true, keepOut: [[P(9, 0).x, P(9, 0).z, 10.5]], seed: 31 });
  // ---------------------------------------------------------------- promenade dressing: bollards, lamp posts, bunting, café, the ferry's sign
  const iron = styliseMat(plainMat(0x22402f, { rough: 0.6 })), stoneM = styliseMat(plainMat(0x8a8478));
  const props = new THREE.Group(); S.scene.add(props);
  const addM = (geo, mat, p, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.copy(p); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; props.add(m); return m; };
  const posts = [];
  for (let z = -640; z < -420; z += 7) { const x = xE(z) + 0.5; addM(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8), stoneM, new THREE.Vector3(x, QUAY_Y + 0.27, z)); }
  for (let z = -630; z < -380; z += 16) { const x = xE(z) + 1.0, p = new THREE.Vector3(x, QUAY_Y, z);
    addM(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 6), iron, p.clone().setY(QUAY_Y + 2.3));
    addM(new THREE.BoxGeometry(0.34, 0.5, 0.34), styliseMat(plainMat(0xf2e3b8)), p.clone().setY(QUAY_Y + 4.75)); posts.push(p); }
  // bunting: strings across the promenade from the lamp posts to the house fronts, sagging; the flags are wind bits that REST until the gust
  const FLAG = [0xd2402e, 0xf2c53a, 0x2fa8a8, 0xf4f1ea, 0xe86aa0, 0x2f6fb8, 0xf08a2a], flags = [], lineMat = new THREE.LineBasicMaterial({ color: 0x3a3a3a });
  posts.forEach((p, j) => { if (p.z < C.z + 4 || p.z > C.z + 120) return;
    const a = p.clone().setY(QUAY_Y + 4.5), b = new THREE.Vector3(xE(p.z) + 13.5, QUAY_Y + 5.6, p.z + 5), pts = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, q = a.clone().lerp(b, u); q.y -= 0.9 * Math.sin(u * Math.PI); pts.push(q); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat); S.scene.add(line);
    for (let i = 1; i < 24; i++) { const q = pts[i].clone(); q.y -= 0.17; const d = q.distanceTo(C);
      flags.push({ p: q.toArray(), w: toward(q, 14 + 8 * R(), 3 + 3 * R()), v: [0, 1.5, 0], t0: T_GALE + 0.05 + 0.25 * R() + d * 0.002, size: 0.36, col: FLAG[(i + j) % FLAG.length], shape: 1, drag: 1.8, spin: 1.4, rest: true, floor: QUAY_Y, seed: R() }); } });
  // café on the promenade (tables, chairs, parasols that fly)
  const tableM = styliseMat(plainMat(0xf2efe6)), chairM = styliseMat(plainMat(0x2f6f8a)), parasols = [];
  [[26, -2.8, 0xd2402e], [34, -3.4, 0x2fa8a8], [43, -2.6, 0xf2c53a], [55, -3.6, 0xe86aa0], [70, -3.0, 0x2fa8a8]].forEach(([d, s, col], i) => {
    const p = P(d, s); addM(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 12), tableM, p.clone().setY(QUAY_Y + 0.75)); addM(new THREE.CylinderGeometry(0.03, 0.05, 0.73, 6), iron, p.clone().setY(QUAY_Y + 0.37));
    addM(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), iron, p.clone().setY(QUAY_Y + 1.15));
    const can = new THREE.Group();
    for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 2, 1, true, k * Math.PI / 4, Math.PI / 4), styliseMat(plainMat(k % 2 ? 0xf4f1ea : col, { extra: { side: THREE.DoubleSide } }))); seg.castShadow = true; can.add(seg); }
    can.position.copy(p).setY(QUAY_Y + 2.45); S.scene.add(can);
    parasols.push({ g: can, b: { p: [p.x, QUAY_Y + 2.45, p.z], w: toward(p, 15 + 4 * R(), 4.5), v: [0, 3, 0], t0: T_GALE + 0.15 + 0.12 * i, drag: 1.1 }, sd: R() * 6 });
    for (const a of [0.3, 2.4, 4.3]) flags.push({ p: [p.x + Math.cos(a) * 0.65, QUAY_Y + 0.45, p.z + Math.sin(a) * 0.65], w: toward(p, 7 + 3 * R(), 1.2), v: [0, 2.2, 0], t0: T_GALE + 0.3 + 0.6 * R(), size: 0.46, col: 0x2f6f8a, shape: 2, drag: 1.2, spin: 1.2, rest: true, floor: QUAY_Y, seed: R() });
  });
  signBoard(S, 'FERRY|FUORI SERVIZIO', new THREE.Vector3(xE(FERRY.z) + 4, QUAY_Y + 1.6, FERRY.z + 30), 2.4, 1.0, -Math.PI / 2, { bg: '#f4f1ea', fg: '#b8382e' });
  // ---------------------------------------------------------------- GAG 3: the gelato seller, his cart, the customer
  const MAN = P(qn('gd', 13), qn('gs', 0.6));
  const man = makePerson(S, { top: 0xf4f1ea, bot: 0xf2efe6, build: 1.22, height: 1.74, stripes: [0xf4f1ea, 0x24345a, 0.085], hat: { k: 3, col: 0xf4f1ea, band: 0xe86aa0 }, skin: 0xc08a64, pose: 'coneOffer', hairCol: 0x2a1d14 });
  ['coneOffer', 'cone', 'coneStare'].forEach((p) => man.setPose(p)); man.setPose('coneOffer');
  man.root.position.copy(MAN); const MF = RT.clone().multiplyScalar(-0.86).addScaledVector(FW, -0.5); const manYaw0 = Math.atan2(-MF.x, -MF.z); man.root.rotation.y = manYaw0;   // 3/4 profile, facing screen-left
  const cart = makeGelatoCart(S, P(qn('cd', 15.2), qn('cs', -1.5)), faceYaw(0, 0, FW.x, FW.z) + Math.PI + 0.35);
  // tubs of gelato on the cart (readable story prop) and a furled umbrella (an open one would sit behind the caption band)
  cart.children.forEach((m) => { if (m.geometry?.type === 'ConeGeometry') m.visible = false; });
  { const TUB = [0xf2a0b8, 0x9fd6bd, 0xf6e7b0, 0x7a4a2a, 0xf2d33a, 0xd8283a]; TUB.forEach((c, i) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.26), styliseMat(plainMat(c))); t.position.set(-0.55 + i * 0.22, 1.29, 0); cart.add(t); });
    const fur = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.5, 8), styliseMat(plainMat(0xe86aa0))); fur.position.set(0, 2.3, 0); fur.rotation.x = Math.PI; cart.add(fur); }
  const woman = makePerson(S, { hair: 'long', fem: 0.9, top: 0x2fa8a8, bot: 0xf4f1ea, hairCol: 0x6e5238, height: 1.66, build: 0.95, bag: 'tote', bagCol: 0xe8d29a, hat: { k: 1, col: 0xf2e3b8, band: 0xd2402e }, skin: 0xd8a882, pose: 'stand' });
  ['stand', 'point', 'holdHat'].forEach((p) => woman.setPose(p)); woman.setPose('stand');
  const WOM = P(qn('wd', 11.6), qn('ws', -1.15)); woman.root.position.copy(WOM); const womYaw0 = faceYaw(WOM.x, WOM.z, MAN.x, MAN.z); woman.root.rotation.y = womYaw0;
  // the cone + two scoops (stylised a little big so they read: cone 17 cm, scoops 12 cm)
  const coneG = new THREE.Group(); S.scene.add(coneG);
  { const c = new THREE.Mesh(new THREE.ConeGeometry(0.066, 0.26, 8), styliseMat(plainMat(0xd9a35a))); c.rotation.x = Math.PI; c.position.y = -0.095; coneG.add(c);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.067, 0.04, 8), styliseMat(plainMat(0xc8904a))); ring.position.y = 0.04; coneG.add(ring);
    const smear = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.022, 8), styliseMat(plainMat(0xf2a0b8))); smear.position.y = 0.068; coneG.add(smear); }   // a lick of strawberry left on the rim
  const scoops = [0xf2a0b8, 0x9fd6bd].map((col, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.068, 1), styliseMat(plainMat(col))); m.castShadow = true; S.scene.add(m);
    return { m, dy: 0.11 + i * 0.1, i }; });
  // ---------------------------------------------------------------- one-off people on the promenade (mid-distance, full colour, hats)
  const ONE = [
    { d: 21, s: 1.6, o: { top: 0xd2402e, bot: 0xc8b48a, build: 1.35, height: 1.8, hat: { k: 2, col: 0xf4f1ea, band: 0x24345a } }, poses: ['point', 'duck'] },
    { d: 24, s: -1.2, o: { fem: 0.85, hair: 'bun', top: 0xf2c53a, bot: 0x2a3550, height: 1.62, bag: 'backpack', bagCol: 0x2f6fb8 }, poses: ['filming', 'leanWind'] },
    { d: 29, s: 2.4, o: { top: 0x7fb8e6, bot: 0xf2efe6, build: 0.9, height: 1.84, hat: { k: 0, col: 0xe8d29a, band: 0xd2402e } }, poses: ['shade', 'holdHat'] },
    { d: 31, s: 3.1, o: { fem: 0.9, hair: 'curly', top: 0xe86aa0, bot: 0xf4f1ea, height: 1.6, build: 1.2 }, poses: ['arms', 'duck'] },
    { d: 38, s: -2.0, o: { top: 0x3f8a4a, bot: 0x4d6f9a, height: 1.76, hat: { k: 3, col: 0x24345a } }, poses: ['phoneUp', 'leanWind'] },
  ].map((q, i) => { const h = makePerson(S, { skin: [0xb98462, 0x8a5a3a, 0xd8a882, 0x6b4a3a, 0xc08a64][i], pose: q.poses[0], ...q.o }); q.poses.forEach((p) => h.setPose(p)); h.setPose(q.poses[0]);
    const p = P(q.d, q.s); h.root.position.copy(p); h.setPose('point'); h.setPose(q.poses[0]); return { h, p, poses: q.poses, ph: R() }; });
  // ---------------------------------------------------------------- FIX PASS: foreground people who react BIG (a frame at both sides)
  // left: a lady under a navy-and-white sun umbrella; the gale rips it out of her hand (it tumbles off toward the gap), hands on head.
  // right: a couple chatting; at the inhale they turn to look, in the gale she grabs him and he clamps his hat, both braced.
  const NEARP = [
    { d: 8.8, s: -0.98, o: { fem: 0.95, hair: 'bun', top: 0xec8a6c, bot: 0xec8a6c, height: 1.6, build: 1.2, bag: 'tote', bagCol: 0x2f6fb8, skin: 0xd8a882, hairCol: 0x8a8a86 }, poses: ['lookHand', 'lookHand', 'handsHead'], face: 0.9 },
    { d: 9.7, s: 1.32, o: { top: 0xf2c53a, bot: 0x2a3550, build: 1.3, height: 1.82, hat: { k: 0, col: 0xe8d29a, band: 0xd2402e }, skin: 0x8a5a3a, hairCol: 0x1f1a16 }, poses: ['arms', 'point', 'holdHat'], face: -1 },
    { d: 9.2, s: 0.98, o: { fem: 0.9, hair: 'long', top: 0x9fd6bd, bot: 0xf4f1ea, height: 1.64, skin: 0xc08a64, hairCol: 0x4a3020, bag: 'tote', bagCol: 0xd2402e }, poses: ['shrug', 'peer', 'catch'], face: 1 },
  ].map((q) => { const h = makePerson(S, { pose: q.poses[0], ...q.o }); q.poses.forEach((p) => h.setPose(p)); h.setPose(q.poses[0]); const p = P(q.d, q.s); h.root.position.copy(p); return { h, p, q }; });
  const [LADY, MAN2, WOM2] = NEARP;
  const umb = new THREE.Group(); S.scene.add(umb);
  { for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.32, 2, 1, true, k * Math.PI / 4, Math.PI / 4), styliseMat(plainMat(k % 2 ? 0xf4f1ea : 0x24345a, { extra: { side: THREE.DoubleSide } }))); seg.position.y = 0.95; seg.castShadow = true; umb.add(seg); }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), iron); shaft.position.y = 0.45; umb.add(shaft);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 8, Math.PI), styliseMat(plainMat(0x6b4a2a))); hook.rotation.z = Math.PI; umb.add(hook); }
  const T_UMB = T_GALE + 0.12;
  const wrapA = (a) => ((a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const nearYaw = (i, ph) => { const n = NEARP[i], chat = i === 0 ? faceYaw(n.p.x, n.p.z, C.x + 2, C.z) : faceYaw(n.p.x, n.p.z, NEARP[3 - i].p.x, NEARP[3 - i].p.z);
    if (ph === 0) return chat; if (ph === 1) return chat + 0.7 * wrapA(faceYaw(n.p.x, n.p.z, MOUNT.x, MOUNT.z) - chat);
    return i === 2 ? faceYaw(n.p.x, n.p.z, NEARP[1].p.x, NEARP[1].p.z) : faceYaw(n.p.x, n.p.z, C.x + (i === 0 ? 1.5 : -0.5), C.z); };
  const nearPh = (i, film) => (film < T_SQ + 0.3 + 0.12 * i ? 0 : film < (i === 0 ? T_UMB + 0.04 : T_GALE + 0.06 * i) ? 1 : 2);
  // where the umbrella leaves her hand (pure: her pose and yaw at T_UMB)
  LADY.h.setPose('lookHand'); LADY.h.root.rotation.y = nearYaw(0, 1); const UMB0 = handPoint(LADY.h).clone();
  // ---------------------------------------------------------------- THE SQUEEZE: the mountain
  // FIX PASS: the kit's flat cone is replaced by our own ridged, coloured slab massif that tears into slabs streaming into the
  // point (fixBC_mountain.js); the kit squeeze keeps only the bead, its streak and its drop
  W.mountain.visible = false;
  const MT = slabMountain(S, { c: MOUNT, H: MOUNT.h, R: MOUNT.r, y0: -120, T: T_SQ, dur: SQZ.mountain.dur, C0, seed: 515 });
  const SQ = squeeze(S, { T: T_SQ, dur: SQZ.mountain.dur, c0: C0, sources: [], shards: [{ p: C0.toArray(), col: new THREE.Color(0xffffff), size: 1e-4 }], drop: (f) => depthAt('mountain', f),
    spin: 2.2, tear: 0.5, stretch: 7, bead: { r: 0.034, minPx: 7, I: 14, cool: 0.45, coolT: 2.0 }, streak: { len: 80, w: 6 } });
  void shardsFrom;
  // the ridge dragged in: trees, rock and dust from the town's upper slopes and the mountain's foot fly into the point
  const inr = [];
  { const TREE = [PAL.cypress, PAL.pine, PAL.olive, PAL.scrub], ROCK = [PAL.rock, PAL.rockDark, 0x9a8c7a, 0xb3a58f], DUST = [0xd8b98a, 0xc9a878, 0xe2c79c];
    for (let i = 0; i < 2600; i++) { const kind = R() * 0.8; const x = MOUNT.x + (R() - 0.5) * 2000, z = 1000 + R() * 500, y = Math.min(groundH(x, z), 470) + R() * 25;
      const p = new THREE.Vector3(x, y, z), d = C0.clone().sub(p), dist = d.length(); d.normalize(); const k = 2.6, sp = dist * k * (0.97 + 0.06 * R());
      const t0 = T_SQ + 0.1 + 0.45 * R();
      if (kind < 0.45) inr.push({ p: p.toArray(), v: [d.x * sp, d.y * sp, d.z * sp], t0, size: 5 + 9 * R(), col: TREE[Math.floor(R() * 4)], shape: 0, drag: k, spin: 0.6, life: 1.15, seed: R() });
      else if (kind < 0.8) inr.push({ p: p.toArray(), v: [d.x * sp, d.y * sp, d.z * sp], t0, size: 6 + 14 * R(), col: ROCK[Math.floor(R() * 4)], shape: 0, drag: k, spin: 0.5, life: 1.1, seed: R() });
      else inr.push({ p: p.toArray(), v: [d.x * sp * 0.9, d.y * sp * 0.9 + 20, d.z * sp * 0.9], t0, size: 16 + 22 * R(), col: DUST[Math.floor(R() * 3)], shape: 1, drag: k, spin: 0.25, life: 1.6, seed: R() }); } }
  // ---------------------------------------------------------------- THE GALE (wind bits)
  const gale = [...flags];
  { // 1. near the lens: leaves, napkins, petals, paper, sugar packets, flying past from behind and off the ground
    const NEAR = [0x7d8c46, 0x9aa858, 0x5f7a34, 0xf4f1ea, 0xf2e3b8, 0xe86aa0, 0xd8283a, 0xf2c53a, 0xc8904a];
    const LEAF = [0x7d8c46, 0x9aa858, 0x5f7a34, 0xc8904a, 0xf2e3b8];
    for (let i = 0; i < 2300; i++) { const ground = R() < 0.14, d = ground ? 3 + 45 * Math.pow(R(), 0.8) : -18 + 60 * R(), s = (R() - 0.5) * (ground ? 9 : 14);
      let y = ground ? QUAY_Y + 0.02 : QUAY_Y + 0.3 + 6 * R(); const p = P(d, s, y);
      if (!ground && Math.abs(s) < 1.0 && Math.abs(y - C.y) < 0.8 && d < 6) continue;                  // never through the lens
      const t0 = T_GALE + (ground ? 0.1 + 0.002 * d : 0) + 3.4 * Math.pow(R(), 1.35);                     // dense at first, then easing
      gale.push({ p: p.toArray(), w: toward(p, 13 + 13 * R(), 1.5 + 3.5 * R()), v: ground ? [0, 2 + 2 * R(), 0] : toward(p, 10 + 8 * R(), 0.5), t0, size: ground ? 0.04 + 0.07 * R() : 0.05 + 0.2 * Math.pow(R(), 1.6),
        col: ground ? LEAF[Math.floor(R() * LEAF.length)] : NEAR[Math.floor(R() * NEAR.length)], shape: R() < 0.7 ? 1 : 0, drag: 2.2, spin: 1.6, rest: ground, floor: QUAY_Y, seed: R() }); }
    // 2. spray whipped off the inlet (white chips skimming toward the town)
    for (let i = 0; i < 3200; i++) { const z = -560 + 520 * R(), x = -50 + (xE(z) - 3 + 50) * R(); const p = new THREE.Vector3(x, 0.25 + 0.6 * R(), z);
      gale.push({ p: p.toArray(), w: toward(p, 18 + 10 * R(), 3 + 3 * R()), v: [0, 2 + 3 * R(), 0], t0: T_GALE + 0.2 + 3.3 * Math.pow(R(), 1.2), size: 0.35 + 0.7 * R(), col: R() < 0.7 ? 0xf6f8fa : 0xcfe6ea, shape: R() < 0.5 ? 1 : 0, drag: 1.6, spin: 1.2, life: 2.6, seed: R() }); }
    // 3. the head town: roof tiles, laundry, chairs, umbrellas lifting off toward the gap
    const houses = W.town.placed.filter((h) => h.z > QUAY_Z && h.z < 420 && h.x > -160 && h.x < 170);
    const LAUN = [0xf4f1ea, 0xe86aa0, 0x7fb8e6, 0xf2c53a, 0xd2402e, 0x9fd6bd];
    for (let i = 0; i < 6500; i++) { const h = houses[Math.floor(R() * houses.length)]; if (!h) break; const kind = R();
      const p = new THREE.Vector3(h.x + (R() - 0.5) * h.w, h.top + 0.3 + (kind < 0.7 ? 0.4 * R() : -3 - 5 * R()), h.z + (R() - 0.5) * h.d);
      const t0 = T_GALE + 0.25 + 3.2 * Math.pow(R(), 1.3);
      if (kind < 0.7) gale.push({ p: p.toArray(), w: toward(p, 22 + 14 * R(), 7 + 6 * R()), v: [0, 5 + 5 * R(), 0], t0, size: 0.8 + 0.7 * R(), col: PAL.roofs[Math.floor(R() * PAL.roofs.length)], shape: 2, drag: 1.0, spin: 1.0, seed: R() });
      else gale.push({ p: p.toArray(), w: toward(p, 20 + 12 * R(), 6 + 5 * R()), v: [0, 4, 0], t0, size: 1.4 + 1.2 * R(), col: LAUN[Math.floor(R() * LAUN.length)], shape: 1, drag: 1.4, spin: 1.3, seed: R() }); }
    // 4. the quay street: café chairs and parasol tops, sun hats
    for (let i = 0; i < 700; i++) { const p = new THREE.Vector3(-58 + 116 * R(), QUAY_Y + 0.4 + 2.5 * R(), -38 + 22 * R()); const chair = R() < 0.5;
      gale.push({ p: p.toArray(), w: toward(p, 18 + 10 * R(), 5 + 5 * R()), v: [0, 4 + 3 * R(), 0], t0: T_GALE + 0.2 + 2.6 * R(), size: chair ? 0.7 : 1.6, col: chair ? [0x2f6f8a, 0xd2402e, 0xf2efe6][Math.floor(R() * 3)] : [0xd2402e, 0xf4f1ea, 0x2fa8a8, 0xf2c53a][Math.floor(R() * 4)], shape: chair ? 2 : 1, drag: 1.2, spin: 1.1, seed: R() }); }
  }
  const GL = windBits(S, gale, LOOK), IN = windBits(S, inr.map((b) => ({ ...b, w: [0, 0, 0], drag: b.drag })), LOOK);
  IN.U.grav.value = 0;                                                    // the inrush: drag-limited flight into the point (no gravity)
  // ---------------------------------------------------------------- per frame
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const kiteB = W.kites.map((kt, i) => { const base = [P(70, -7, 24), P(96, 9, 31), P(124, -16, 40)][i]; return { base, b: { p: base.toArray(), w: toward(base, 16 + 3 * i, 7), v: [0, 4, 0], t0: T_GALE + 0.25 + 0.2 * i, drag: 0.8 } }; });
  const gullA = P(90, 2, 26);
  W.people.forEach((p) => { p.yaw0 = p.yaw; p.turn = T_SQ + 0.2 + 0.6 * ((p.x * 7.13 + p.z * 3.7) % 1 + 1) % 1; p.north = ((p.x * 1.7 + p.z * 0.31) % 1 + 1) % 1 < 0.5; });
  const hatFly = (it, i) => { if (((i * 0.618) % 1) > 0.22) return undefined; const p = it.p; const t0 = T_GALE + 0.2 + 0.8 * ((i * 0.37) % 1);   // ~1 hat in 5 blows away
    return { p: [p.x, (p.y ?? 0) + it.y + 0.05, p.z], w: toward(new THREE.Vector3(p.x, 0, p.z), 15, 4.5), v: [0, 3, 0], t0, drag: 1.4 }; };
  return { W, SQ, man, woman, cart, C0, P, MCAM, MAN, RT, FW,
    update(film, cam) {
      // people: half of the townsfolk watched the headland (north) and turn to the mountain at the inhale; the gale makes them reel
      // (FIX PASS) in the gale they turn their BACKS to it: facing us, away from the gap
      W.people.forEach((p) => { p.yaw = film < p.turn ? (p.north ? 0 : p.yaw0) : film < T_GALE + 0.15 + 0.4 * ((p.x * 0.37) % 1 + 1) % 1 ? faceYaw(p.x, p.z, MOUNT.x, MOUNT.z) : faceYaw(p.x, p.z, 2 * p.x - MOUNT.x, 2 * p.z - MOUNT.z); });
      W.update(film, { agitation: film < T_SQ ? 0.25 : film < T_GALE ? 0.6 : 0.95, focus: MAN.clone(), box: 26,
        hat: (it, i) => { const b = film > T_GALE ? hatFly(it, i) : undefined; if (!b || film < b.t0) return undefined;
          return { pos: windPos(b, film, new THREE.Vector3()), quat: _q.setFromEuler(_e.set((film - b.t0) * 5, (film - b.t0) * 3, (film - b.t0) * 4)).clone() }; },
        birdPath: (tp) => { const f = tp - 4, g = Math.max(0, f - T_GALE);
          const c = gullA.clone().add(new THREE.Vector3(Math.sin(f * 0.6) * 18, Math.sin(f * 1.1) * 2, Math.cos(f * 0.6) * 12));
          return c.add(new THREE.Vector3(C0.x - gullA.x, 0, C0.z - gullA.z).normalize().multiplyScalar(6 * g * g + 4 * g)).add(new THREE.Vector3(0, 2 * g * g, 0)); },
        boatPose: (b, i, f) => { if (f < T_GALE) return undefined; const g = sstep(T_GALE, T_GALE + 0.8, f), t = f + 4;
          const y = -0.35 + 0.25 * g * Math.sin(t * 3.1 + b.ph); _e.set(0.14 * g * Math.sin(t * 2.3 + b.ph), b.yaw + 0.05 * g * Math.sin(t * 1.7 + b.ph), 0.22 * g * Math.sin(t * 2.9 + b.ph * 2), 'YXZ');
          return { p: new THREE.Vector3(b.x, y, b.z), q: new THREE.Quaternion().setFromEuler(_e) }; } });
      // kites: bob on their lines, then the lines snap and they fly to the gap
      W.kites.forEach((kt, i) => { const K = kiteB[i], t = film + 4;
        if (film < K.b.t0) { kt.g.position.copy(K.base).add(_v.set(1.2 * Math.sin(t * 0.7 + kt.ph), 1.0 * Math.sin(t * 0.9 + kt.ph), 0)); kt.g.rotation.set(0.1 * Math.sin(t * 1.3 + kt.ph), Math.PI + MCAM.yaw * D2R, 0.25 * Math.sin(t * 0.8 + kt.ph)); }
        else { windPos(K.b, film, kt.g.position); const a = film - K.b.t0; kt.g.rotation.set(a * 2.1, Math.PI + MCAM.yaw * D2R + a * 1.3, a * 3.4); }
        kt.g.scale.setScalar(2.2); });
      // the gelato seller: offers the cone, turns to the mountain at the inhale, holds it up in the gale, then stares at the empty cone
      man.setPose(film < T_SQ + 0.4 ? 'coneOffer' : film < T_SCOOP + 0.45 ? 'cone' : 'coneStare');
      man.root.rotation.y = manYaw0 - 0.25 * sstep(T_SQ + 0.4, T_SQ + 1.0, film);
      woman.setPose(film < T_SQ + 0.3 ? 'stand' : film < T_GALE ? 'point' : 'holdHat');
      woman.root.rotation.y = womYaw0 + (film < T_SQ + 0.3 ? 0 : 1.0 * sstep(T_SQ + 0.3, T_SQ + 0.8, film));
      const hp = handPoint(man); coneG.position.copy(hp).add(_v.set(0, 0.04, 0)); coneG.rotation.set(0, 0, film > T_SCOOP + 0.45 ? -0.2 : 0);
      scoops.forEach((s) => { const top = coneG.position.clone().add(_v.set(0, s.dy, 0));
        const t0 = T_SCOOP + 0.12 * s.i;
        if (film < t0) { s.m.position.copy(top); s.m.rotation.set(0, 0, 0); return; }
        const b = { p: top.toArray(), w: toward(top, 15 + 3 * s.i, 4.6), v: [0, 2.6 - 0.6 * s.i, 0.6], t0, drag: 2.4 };
        windPos(b, film, s.m.position); const a = film - t0; s.m.rotation.set(a * 6, a * 4, a * 5); });
      // (FIX PASS) chat -> turn and point at the mountain at the inhale -> backs to the gale, facing us: ducking, clamping hats, braced
      ONE.forEach((q, i) => { const pre = film < T_SQ + 0.25 + 0.15 * i, gust = film >= T_GALE + 0.1 * i;
        q.h.setPose(pre ? q.poses[0] : gust ? q.poses[1] : 'point');
        q.h.root.rotation.y = pre ? faceYaw(q.p.x, q.p.z, q.p.x - 3 + 6 * q.ph, q.p.z - 20) : gust ? faceYaw(q.p.x, q.p.z, C.x + (q.ph - 0.5) * 8, C.z) : faceYaw(q.p.x, q.p.z, MOUNT.x, MOUNT.z); });
      NEARP.forEach((n, i) => { const ph = nearPh(i, film); n.h.setPose(n.q.poses[ph]); n.h.root.rotation.y = nearYaw(i, ph);
        // she clings to him: drawn in against his side in the gust
        if (i === 2) n.h.root.position.copy(n.p).lerp(NEARP[1].p, 0.42 * sstep(T_GALE, T_GALE + 0.35, film)); });
      // the umbrella: in the lady's raised hand, then torn away, tumbling toward the gap
      { if (film < T_UMB) { umb.position.copy(handPoint(LADY.h)).add(_v.set(0, -0.05, 0)); umb.rotation.set(0.12 * Math.sin(film * 2.1), 0, 0.1 * Math.sin(film * 1.7) + 0.25 * sstep(T_GALE - 0.05, T_UMB, film)); }
        else { const b = { p: UMB0.toArray(), w: toward(UMB0, 17, 5.5), v: [0, 3.5, 0], t0: T_UMB, drag: 1.0 }; windPos(b, film, umb.position); const a = film - T_UMB; umb.rotation.set(a * 3.1 + 0.4, a * 1.7, a * 2.3 + 0.6); } }
      parasols.forEach((pp) => { if (film < pp.b.t0) { pp.g.position.set(...pp.b.p); pp.g.rotation.set(0, 0, 0); return; }
        windPos(pp.b, film, pp.g.position); const a = film - pp.b.t0; pp.g.rotation.set(a * 2.6 + pp.sd, a * 1.4, a * 3.1); });
      W.mountain.visible = false; SQ.update(film, cam); MT.update(film, SQ.centreAt(film)); GL.update(film); IN.update(film);
      gradeDust(S, 0.3 + 0.18 * sstep(T_SQ + 0.4, T_GALE + 1.5, film) - 0.06 * sstep(48.5, 50.5, film));
    } };
}
