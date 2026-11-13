// no-empty-space GROUP A: the QUAY STREET as one living set in FILM time (s03 the car, s04 the hole).
//   11.5-12.5   the hero strolls toward his red hatchback; 12.65 raises the fob; 12.9 chirp (indicators blink twice)
//   13.50-14.0  the car squeeze (SQZ.car): panels tear inward into a point; dust, leaves, lemons off the cart, the newspaper and
//               HIS STRAW HAT rush in; the bead punches into the cobbles at ~13.89 (½gt² from 0.75 m) -> the smoking hole
//   14.0        the pressure ring: dust puffs race outward; bystanders gape, then point
//   14.4-18.0   gag 2: he clicks again (nothing), pats his pockets, shrugs, shuffles to the bench and looks under it
//   s04 (18.0-23.5) reuses this set: the hat lies by the hole, people gather (s04 adds its own extras)
import { THREE } from '@engine/engine.js';
import { rng, clamp } from '@engine/util.js';
import { harbourWorld, makeHero, makePerson, makeCar, makeVespa, makeFruitCart, squeeze, shardsFrom, bits, hole, signBoard, styliseMat, CAR, QUAY_Y } from './kit.js';
import { SQZ, depthAt } from './story.js';
import { posePlayer, noPhone, flyingHat, headTop, faceYaw, wisps, bench } from './groupA_lib.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (c, o = {}) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, ...(o.x ?? {}) }), o);
const Y = QUAY_Y + 0.02;
const bump = (film, t0, h = 0.1) => h * Math.sin(Math.PI * clamp((film - t0) / 0.3));
// the hero's walk (film): from H0 to H1 over 11.5-12.5, then (16.75-17.15) a shuffle to the bench
// layout is built around s03's camera at (-12, 2, -21) looking north-north-east (bearing ~22°): hero left, car right, the water beyond
export const H0 = V3(-12.4, Y, -23.7), H1 = V3(-11.0, Y, -25.2), H2 = V3(-11.95, Y, -26.55), BENCH = V3(-11.95, Y, -27.35);
const byBearing = (b, d) => V3(-12 + d * Math.sin(b * Math.PI / 180), Y, -21 - d * Math.cos(b * Math.PI / 180));
export const HOLE = V3(CAR.pos.x, QUAY_Y + 0.022, CAR.pos.z);   // the cobble surface is QUAY_Y + 0.02 (harbour.js PY)
export const T_HIT = SQZ.car.T + Math.sqrt((2 * 0.75) / 9.81);   // 13.89: the bead (car centre 0.75 m up) reaches the cobbles
// s04's camera looks along S04_F (s03's last view direction onto the hole); the hero kneels on the left of the hole
export const S04_F = new THREE.Vector3(0.61, 0, -0.79).normalize(), S04_R = new THREE.Vector3(-S04_F.z, 0, S04_F.x);
export const KNEEL = HOLE.clone().addScaledVector(S04_R, -0.55).addScaledVector(S04_F, 0.12).setY(Y);

export function quaySet(S, o = {}) {
  const keep = [[CAR.pos.x, CAR.pos.z, 5.0], [-11.5, -25.5, 2.6], [-12, -21, 3.5], ...(o.keep ?? [])];
  const W = harbourWorld(S, { keepOut: keep });
  const TCAR = SQZ.car.T, DONE = TCAR + SQZ.car.dur;
  // ------------------------------------------------ the car (the hero's red hatchback) + its indicators
  const car = makeCar(S); car.position.copy(CAR.pos); car.rotation.y = CAR.yaw;
  const blinkM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.1).multiplyScalar(4) }), blinks = [];
  for (const [x, z] of [[-0.78, -1.9], [0.78, -1.9], [-0.78, 1.9], [0.78, 1.9]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), blinkM); b.position.set(x, 0.74, z); car.add(b); blinks.push(b); }
  car.updateMatrixWorld(true);
  const C0 = CAR.pos.clone().setY(QUAY_Y + 0.75);
  const SQ = squeeze(S, { T: TCAR, dur: SQZ.car.dur, c0: C0, sources: [car], shards: shardsFrom(car.userData.parts, 9000, { size: [0.04, 0.16] }),
    drop: (f) => depthAt('car', f), spin: 6, bead: { r: 0.05, minPx: 6, I: 10 }, streak: { len: 3, w: 0.03 }, light: { I: 40, dist: 25 } });
  const holeM = hole(S, HOLE, 0.2, { tHot: T_HIT, coolT: 5 });     // stylised: a ~12 cm black hole in a scorch ring (honest: 23 µm)
  const smoke = wisps(S, HOLE, T_HIT + 0.05, 24, { seed: 5, size: 0.022, every: 0.03, life: 2.2, buoy: 0.3, drift: 0.08, col: 0xd8d2c8 });
  // ------------------------------------------------ the hero
  const hero = makeHero(S, { pose: 'strideA' }); noPhone(hero);
  const heroP = posePlayer(hero, [[-99, 'strideA'], [11.75, 'strideB', 0.12], [12.0, 'strideA', 0.12], [12.25, 'strideB', 0.12], [12.5, 'stand', 0.15], [12.6, 'clickFob', 0.22],
    [13.55, 'gape', 0.1], [14.35, 'clickFob', 0.15], [15.0, 'patPocketsD', 0.2], [15.75, 'shrugBig', 0.2], [16.4, 'strideA', 0.1], [16.6, 'strideB', 0.1], [16.8, 'stand', 0.1], [16.85, 'lookUnderD', 0.22],
    // s04: he straightens, walks from the bench to the hole and kneels with his phone light (KNEEL)
    [17.95, 'strideA', 0.15], [18.3, 'strideB', 0.12], [18.6, 'strideA', 0.12], [18.9, 'strideB', 0.12], [19.2, 'stand', 0.12], [19.35, 'kneelLight', 0.45]], { steps: 2 });   // (load time: each blend is a 1.1 cm polygonization)
  const heroPos = (film) => {
    if (film < 12.5) { const u = clamp((film - 11.5) / 1.0); return H0.clone().lerp(H1, u).setY(Y + 0.025 * Math.abs(Math.sin(u * Math.PI * 4))); }
    if (film < 16.4) return H1.clone();
    if (film < 17.95) { const u = clamp((film - 16.4) / 0.52), e = u * u * (3 - 2 * u); return H1.clone().lerp(H2, e).setY(Y + 0.035 * Math.abs(Math.sin(u * Math.PI * 3))); }
    const u = clamp((film - 17.95) / 1.3), e = u * (1.15 - 0.15 * u); return H2.clone().lerp(KNEEL, e).setY(Y + 0.03 * Math.abs(Math.sin(u * Math.PI * 4)));
  };
  const heroYaw = (film) => { const toCar = faceYaw(CAR.pos.x - H1.x, CAR.pos.z - H1.z), walk = faceYaw(H1.x - H0.x, H1.z - H0.z), toB = faceYaw(H2.x - H1.x, H2.z - H1.z);
    const toCam = faceYaw(-12 - H1.x, -21 - H1.z), sm = (a, b) => { const u = clamp((film - a) / (b - a)); return u * u * (3 - 2 * u); };
    if (film < 12.4) return walk;
    if (film < 15.7) return lerpA(toCar, lerpA(toCar, toCam, 0.45), sm(15.0, 15.35));         // pats his pockets half-turned to us
    if (film < 16.4) return lerpA(lerpA(toCar, toCam, 0.45), toCam, sm(15.7, 15.95));         // the shrug, square to the lens
    if (film < 17.95) return lerpA(lerpA(toCam, toB, sm(16.4, 16.6)), 0, sm(16.72, 16.92));   // hurries to the bench, faces it (north)
    const toK = faceYaw(KNEEL.x - H2.x, KNEEL.z - H2.z), toHole = faceYaw(HOLE.x - KNEEL.x, HOLE.z - KNEEL.z);
    return lerpA(lerpA(0, toK, sm(17.95, 18.2)), toHole, sm(19.05, 19.4)); };                  // s04: walks to the hole, faces it
  const lerpA = (a, b, u) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };
  // the keys in his right hand
  // his straw hat: flies off into the squeeze, then lies on the cobbles beside the hole
  hero.root.position.copy(H1); hero.root.rotation.y = heroYaw(13.4); hero.setPose('clickFob');
  const hatF = flyingHat(S, hero.hat, TCAR + 0.05, C0.clone().add(V3(-0.15, -0.1, 0.12)), { dur: SQZ.car.dur - 0.08, fall: 0.6, land: V3(CAR.pos.x + 0.75, QUAY_Y + 0.03, CAR.pos.z - 0.55), arc: 0.4, spin: 12, restTilt: 0.12 });
  // ------------------------------------------------ props: fruit cart (LIMONI), bench, a Vespa, planters, bollards, fish crates, a lamp post
  const cart = makeFruitCart(S, V3(-5.9, Y, -30.4), 0.5); cart.lemonMesh.visible = false;
  bench(S, BENCH, Math.PI);
  const paper = V3(BENCH.x + 0.35, Y + 0.48, BENCH.z + 0.02);
  const vb = makeVespa(S, 0x7fb8e6); vb.position.set(-14.2, Y, -29.0); vb.rotation.y = 0.4;
  const vg = makeVespa(S, 0xf2c53a); vg.position.set(-4.4, Y, -33.0); vg.rotation.y = 1.2;
  const potM = M(0xb8582e), leafM = M(0x3f7a34), lemonM = M(0xf2d33a), pots = [];
  for (const [x, z] of [[-13.6, -15.2], [-6.2, -15.2], [-1.2, -15.2], [4.6, -15.2], [-17.0, -15.2]]) { const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.6, 8), potM); p.position.y = 0.3; g.add(p);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 5), M(0x6a4a2a)); tr.position.y = 1.0; g.add(tr);
    const cn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), leafM); cn.position.y = 1.75; cn.scale.set(1, 0.85, 1); g.add(cn);
    for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), lemonM); const a = k * 0.9; l.position.set(Math.cos(a) * 0.55, 1.55 + (k % 3) * 0.18, Math.sin(a) * 0.55); g.add(l); }
    g.position.set(x, Y, z); g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g); pots.push(g); }
  const bolM = M(0x2a2a2e, { rough: 0.5 });
  for (let x = -30; x <= 20; x += 4.5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8), bolM); b.position.set(x, Y + 0.27, -39.2); b.castShadow = true; S.scene.add(b); }
  const crateM = [M(0x2f6f8a), M(0xf4f1ea), M(0x2fa8a8)];
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.4), crateM[i % 3]); c.position.set(-11.6 + (i % 3) * 0.62, Y + 0.14 + Math.floor(i / 3) * 0.28, -33.2); c.castShadow = true; S.scene.add(c); }
  signBoard(S, 'PESCE|DEL GIORNO', V3(-10.9, Y + 1.1, -32.7), 0.9, 0.6, Math.PI * 0.95, { bg: '#1f3a5f', fg: '#f4f1ea' });
  const lampM = M(0x22402f, { rough: 0.5 });
  for (const [x, z] of [[-12.5, -16.0], [-2.5, -16.0], [-19.0, -38.6], [-5.0, -38.6]]) { const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.6, 6), lampM); post.position.y = 1.8; g.add(post);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.35, 6), lampM); head.position.y = 3.75; g.add(head);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 6), M(0xf2e3b8)); gl.position.y = 3.55; g.add(gl);
    g.position.set(x, Y, z); g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g); }
  // ------------------------------------------------ bystanders (full colour; gape at 13.6, then point at the hole)
  const PEOPLE = [
    { p: V3(-5.7, Y, -31.5), o: { hair: 'bun', fem: 0.9, top: 0xf2c53a, bot: 0x2a3550, apron: 1, height: 1.62, build: 1.25, skin: 0xb07a52, hat: false }, keys: [[-99, 'arms'], [13.6, 'gape', 0.12], [14.7, 'point', 0.3]] },            // the lemon seller
    { p: byBearing(39, 6.2), o: { hair: 'long', fem: 0.95, top: 0xe86aa0, bot: 0xf4f1ea, bag: 'tote', bagCol: 0x2fa8a8, height: 1.68, build: 0.9, skin: 0xd8a27a, hat: { k: 1, col: 0xf4f1ea, band: 0xe86aa0 } }, keys: [[-99, 'pocket'], [13.58, 'gape', 0.1], [15.0, 'point', 0.3]] },
    { p: byBearing(13, 13), o: { hair: 'short', fem: 0, top: 0x24345a, bot: 0xc8b48a, height: 1.8, build: 1.35, skin: 0x8a5a3a, hat: { k: 3, col: 0xd2402e } }, keys: [[-99, 'arms'], [13.6, 'gape', 0.12], [14.9, 'film', 0.3]] },
    { p: byBearing(3, 9.6), o: { hair: 'curly', fem: 0.1, top: 0xf4f1ea, bot: 0x4d6f9a, height: 1.74, build: 1.0, skin: 0x6e4a32, hat: false, stripes: [0x24345a, 0xf4f1ea, 0.06] }, keys: [[-99, 'stand'], [13.62, 'gape', 0.12], [15.2, 'point', 0.3]] },
    { p: byBearing(25, 15), o: { hair: 'short', hairCol: 0xd8d0c4, fem: 0, top: 0x7a8a3a, bot: 0x2a2a2e, height: 1.66, build: 1.15, skin: 0xc49272, hat: { k: 2, col: 0xe8d29a } }, keys: [[-99, 'stand'], [13.6, 'gape', 0.1], [14.8, 'shade', 0.3]] },
  ];
  PEOPLE.forEach((d, i) => { d.i = i; });
  const folks = PEOPLE.map((d) => { const h = makePerson(S, { ...d.o, pose: d.keys[0][1] }); noPhone(h); h.root.position.copy(d.p); h.root.rotation.y = faceYaw(CAR.pos.x - d.p.x, CAR.pos.z - d.p.z) + (d.i % 2 ? 0.25 : -0.2); const pp = posePlayer(h, d.keys, { steps: 1 }); return { h, pp, d }; });
  // ------------------------------------------------ the inrush: dust off the cobbles, leaves, the lemons, the newspaper
  const IN = [], R = rng(57), k = 4.0;
  // drag-limited travel stops each bit 55-90% of the way in: the debris rings the point and the hole itself stays clear (s04)
  const toward = (p, t0, size, col, shape, rest = true, sk = 1) => { const d = C0.clone().sub(V3(...p)), dist = d.length(); d.normalize(); const v = dist * k * (0.55 + 0.35 * R()) * sk;
    IN.push({ p, v: [d.x * v, d.y * v + 0.6 * 9.81 / k, d.z * v], t0, size, col, shape, drag: k, floor: Y, rest, spin: 1.4, seed: R() }); };
  const lag = (p) => TCAR + 0.02 + 0.12 * Math.min(1, C0.distanceTo(V3(...p)) / 9) + 0.05 * R();
  for (let i = 0; i < 360; i++) { const a = R() * 6.283, r = 1.6 + Math.sqrt(R()) * 7.5, p = [C0.x + Math.cos(a) * r, Y + 0.02, C0.z + Math.sin(a) * r]; toward(p, lag(p), 0.022 + R() * 0.04, [0xc8b48a, 0xb8a47a, 0xd8cab0, 0x9a8a6a][i % 4], 0, false); }
  for (let i = 0; i < 90; i++) { const a = R() * 6.283, r = 2.5 + R() * 8, p = [C0.x + Math.cos(a) * r, Y + 0.05 + R() * 2.5, C0.z + Math.sin(a) * r]; toward(p, lag(p), 0.04 + R() * 0.035, [0x3f7a34, 0x7a8a3a, 0xe8c040, 0x5a9a3a][i % 4], 1, false); }
  cart.lemons.forEach((q, i) => { const p = q.toArray(); if (i % 3 === 0) IN.push({ p, v: [0, 0, 0], t0: 1e6, size: 0.1, col: 0xf2d33a, shape: 3, floor: -10, rest: true, seed: R() }); else toward(p, lag(p) + 0.02, 0.1, 0xf2d33a, 3, true, 0.62); });   // lemons roll up short of the hole
  toward(paper.toArray(), TCAR + 0.04, 0.42, 0xe8e2d6, 1, true, 0.75);
  for (let i = 0; i < 4; i++) toward([paper.x + 0.1 * i, paper.y + 0.01 * i, paper.z - 0.05], TCAR + 0.06 + i * 0.01, 0.36, [0xf4f1ea, 0xd8d0c4][i % 2], 1, true, 0.75);
  const inB = bits(S, IN);
  // the pressure ring: dust puffs racing outward along the cobbles from the point (thin, crisp, short-lived; no fluffy smoke)
  const OUT = [];
  for (let i = 0; i < 220; i++) { const a = R() * 6.283, s = 4 + R() * 9; OUT.push({ p: [C0.x + Math.cos(a) * 0.4, Y + 0.05 + R() * 0.3, C0.z + Math.sin(a) * 0.4], v: [Math.cos(a) * s, 0.4 + R() * 1.4, Math.sin(a) * s], t0: DONE + R() * 0.06,
    size: 0.05 + R() * 0.12, col: [0xd8cab0, 0xc8b48a, 0xe6dccb][i % 3], shape: 0, drag: 2.6, floor: Y, life: 0.9 + R() * 0.9, spin: 0.6, seed: R() }); }
  const outB = bits(S, OUT);
  // ------------------------------------------------ per frame
  return { W, hero, car, cart, C0, HOLE, T_HIT, folks,
    update(film, cam, st = {}) {
      W.update(film, { focus: st.focus ?? V3(-8, 2, -26), box: st.box ?? 26, agitation: film > 13.6 ? 0.55 : 0.2 });
      heroP.apply(film); hero.root.position.copy(heroPos(film)); hero.root.position.y += bump(film, 13.52, 0.12); hero.root.rotation.y = heroYaw(film);
      { const u = clamp((film - 19.35) / 0.45); hero.root.position.y -= 0.42 * u * u * (3 - 2 * u); }   // kneeling: the pose bends the legs, the root drops
      hatF.update(film, headTop(hero));
      // the keys in his right hand: at the fob in clickFob, otherwise at the hip
      hero.root.updateMatrixWorld(true); hero.keys.position.set(0.2, 0.95, -0.05); if (/clickFob/.test(String(heroP.at(film)))) hero.keys.position.set(0.18, 1.36, -0.5);
      const bl = (film > 12.9 && film < 13.0) || (film > 13.07 && film < 13.17); blinks.forEach((b) => { b.visible = bl; });
      folks.forEach(({ h, pp, d }) => { pp.apply(film); h.root.position.y = d.p.y + bump(film, 13.58, 0.08); });
      SQ.update(film, cam); holeM.update(film); smoke.update(film); inB.update(film); outB.update(film);
    } };
}
