// no-empty-space GROUP A: the BAR DEL PORTO terrace as ONE living set in FILM time (s01 frame 1, s02 the cup gag, s12 the loop).
// Every event is a pure function of film time, so s01 / s02 / s12 only choose cameras and the set stays continuous:
//   film < 1.60  the selfie, sipping, the accordion, the waiter's tray
//   1.60-1.95    the phone squeeze (story SQZ.phone): shards spiral into her hand, napkins / sugar packets / the menu card /
//                petals / the neighbour's sun hat rush in, the glass table top cracks; the bead drops through the deck (hole + puff)
//   2.0          everyone jumps and gapes; 2.25 she freezes staring up at her empty hand
//   5.75-6.0     a napkin sweeps across the lens (the wipe into s02; s01 only draws it)
//   6.0-7.8      the old man holds his cup out, the waiter pours a refill
//   7.80-8.05    the cup squeeze (SQZ.cup): it pops in his fingers; coffee splashes his lap; the bead punches a pinhole in the saucer
//   9.0-         he lifts the saucer and peers through the pinhole; the waiter is frozen, the pour runs on into nothing
import { THREE } from '@engine/engine.js';
import { rng, clamp } from '@engine/util.js';
import { harbourWorld, WOMAN, TERRACE, makePerson, makePhone, makeCup, squeeze, shardsFrom, bits, hole, handPoint, styliseMat } from './kit.js';
import { SQZ, depthAt } from './story.js';
import { posePlayer, cafeChair, glassTable, flyingHat, headTop, faceYaw, wisps } from './groupA_lib.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (c, o = {}) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, ...(o.x ?? {}) }), o);
const LOW = TERRACE.y, DECK = TERRACE.y + TERRACE.deckH;      // 9.0 the lower terrace floor, 10.0 the bar's deck
export const SIT_DY = -0.38;                                  // root offset below the floor for the sit* poses (feet on the floor, seat 0.45)
const bump = (film, t0, h = 0.09) => h * Math.sin(Math.PI * clamp((film - t0) / 0.28));

export function terraceSet(S, o = {}) {
  // keep the kit's random terrace townsfolk off the stage of s01/s02 (our own characters live there) and off s02's lens
  const W = harbourWorld(S, { keepOut: [[0, -6.4, 3.0], [WOMAN.pos.x, WOMAN.pos.z, 1.0], [-1.2, -11.2, 3.4], [2.2, -11.1, 1.3]] });
  // a deeper zenith on the terrace vantage so the white title (y 120-265) reads over the sky (PRODUCTION §6: fix the picture)
  if (o.zen) W.sky.U.dayZen.value.set(o.zen);                 // s01 / s12 only (the title shots); s02 keeps the film's kit sky
  const TP = SQZ.phone.T, TC = SQZ.cup.T;
  // ------------------------------------------------ the selfie tourist (gag subject of s01)
  const woman = makePerson(S, { hair: 'long', fem: 0.9, top: 0x2fa8a8, bot: 0xf4f1ea, hairCol: 0x6e5238, height: 1.66, build: 0.95, bag: 'tote', bagCol: 0xe8d29a,
    hat: { k: 1, col: 0xf2e3b8, band: 0xe86aa0 }, skin: 0xc9926a, pose: 'selfie' });
  woman.root.position.copy(WOMAN.pos); woman.root.rotation.y = WOMAN.yaw;
  const wP = posePlayer(woman, [[-99, 'selfie'], [2.2, 'lookHandUp', 0.35], [3.7, 'palmLook', 0.6], [4.9, 'lookFloor', 0.6]]);
  woman.setPose('selfie'); const hand = handPoint(woman);
  const phone = makePhone(S, hand.clone(), 0xe86aa0); phone.rotation.y = WOMAN.yaw + 0.6;
  const floorAt = (p) => (p.z < TERRACE.deckZ ? LOW : DECK);
  const PH = squeeze(S, { T: TP, dur: SQZ.phone.dur, c0: hand.clone(), shards: shardsFrom([phone], 1400, { size: [0.006, 0.02] }), sources: [phone],
    drop: (f) => depthAt('phone', f), spin: 8, bead: { r: 0.014, minPx: 6, I: 11 }, streak: { len: 0.5, w: 0.008 }, light: { I: 4, dist: 4 } });
  const fy = floorAt(hand), tFloor = TP + Math.sqrt((2 * (hand.y - fy)) / 9.81);   // the bead reaches the floor (½gt²)
  const holeP = hole(S, V3(hand.x, fy + 0.002, hand.z), 0.05, { tHot: tFloor, coolT: 3 });
  const puffs = [], R = rng(17);
  for (let i = 0; i < 26; i++) { const a = R() * 6.283, s = 0.6 + R() * 1.4; puffs.push({ p: [hand.x, fy + 0.02, hand.z], v: [Math.cos(a) * s, 0.4 + R() * 0.9, Math.sin(a) * s], t0: tFloor, size: 0.025 + R() * 0.04, col: [0xc8b48a, 0xb8a47a, 0xd8cab0][i % 3], shape: 0, drag: 5, life: 0.7 + R() * 0.5, floor: fy, seed: R() }); }
  const puffB = bits(S, puffs);
  const smoke1 = wisps(S, V3(hand.x, fy, hand.z), tFloor + 0.05, 12, { seed: 3 });
  // ------------------------------------------------ the glass bistro table by her (its top cracks with the air snap)
  const gT = glassTable(S, V3(0.22, DECK, -9.36), { tCrack: TP + SQZ.phone.dur * 0.7 });
  const spritzM = M(0xf08a2a, { rough: 0.3, x: { transparent: true, opacity: 0.85 } }), glassM = M(0xe8f0f0, { rough: 0.2, x: { transparent: true, opacity: 0.45 } });
  const drink = (p) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 10), spritzM); c.position.y = 0.06; g.add(c);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), glassM); s.position.y = 0.01; g.add(s); const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 10), M(0xf2c53a)); sl.position.set(0.02, 0.105, 0); sl.rotation.z = 0.4; g.add(sl);
    g.position.copy(p); S.scene.add(g); return g; };
  drink(V3(0.32, gT.topY, -9.42)); drink(V3(0.1, gT.topY, -9.25));
  // ------------------------------------------------ patrons on the lower terrace (the old man's table: W.terrace.tables[3] at (-0.9, -11.3))
  const TB = W.terrace.tables.find((t) => Math.abs(t.x + 0.9) < 0.01) ?? { x: -0.9, z: -11.3 }, TOPY = LOW + 0.77;
  // the old man (gag subject of s02): cardigan, panama, faces the table from its north side (toward the camera of s01)
  const OM = V3(-1.02, LOW, -11.92), omYaw = faceYaw(TB.x - OM.x, TB.z - OM.z);
  cafeChair(S, OM.clone(), omYaw);
  const oldMan = makePerson(S, { hair: 'short', hairCol: 0xe8e2d6, top: 0x8a6a4a, bot: 0x6a6a3a, coat: 0.12, height: 1.68, build: 1.12, fem: 0, skin: 0xc49272,
    hat: { k: 2, col: 0xf4f1ea, band: 0x24345a }, pose: 'sitSip' });
  oldMan.root.position.copy(OM).setY(LOW + SIT_DY); oldMan.root.rotation.y = omYaw;
  const omP = posePlayer(oldMan, [[-99, 'sitSip'], [1.95, 'sitBack', 0.12], [2.7, 'sitSip', 0.5], [6.2, 'sitStare', 0.5], [8.0, 'sitBack', 0.12], [8.45, 'sitStareD', 0.35], [9.0, 'sitPeer1', 0.45]]);
  const OM_TURN = -0.7;                                      // he turns toward s02's lens to peer through the pinhole at us
  // his espresso: the saucer sits on the table under where he holds the cup out; the cup rides in his right hand
  const cupAt = (pose) => { oldMan.setPose(pose); return handPoint(oldMan); };
  const holdP = cupAt('sitStare'); const sipP = cupAt('sitSip'); oldMan.setPose('sitSip');
  const saucerP = V3(holdP.x, TOPY, holdP.z);
  const cup = makeCup(S, saucerP.clone()); const cupObj = cup.cup, saucer = cup.saucer;
  S.scene.attach(cupObj);                                     // the cup moves on its own (his hand); the saucer stays in the group
  cupObj.position.copy(holdP).add(V3(0, -0.04, 0)); cupObj.updateMatrixWorld(true);
  const CUP = squeeze(S, { T: TC, dur: SQZ.cup.dur, c0: holdP.clone().add(V3(0, 0.0, 0)), shards: shardsFrom([cupObj], 700, { size: [0.004, 0.013] }), sources: [cupObj],
    drop: (f) => depthAt('cup', f), spin: 9, bead: { r: 0.01, minPx: 5, I: 10 }, streak: { len: 0.25, w: 0.004 }, light: { I: 2, dist: 2.5 } });
  const tSaucer = TC + Math.sqrt((2 * (holdP.y - (TOPY + 0.012))) / 9.81);
  const pin = hole(S, saucerP.clone().add(V3(0, 0.013, 0)), 0.022, { tHot: tSaucer, coolT: 2.5 }); cup.group.attach(pin.mesh);
  const clothHole = hole(S, V3(saucerP.x, TOPY + 0.001, saucerP.z), 0.03, { tHot: tSaucer + 0.004, coolT: 2 });
  // sunlight through the pinhole: a hot dot on both faces of the saucer (blooms) once he holds it up to his eye
  const pinLight = new THREE.Group(); for (const y of [-0.0075, 0.0075]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.009, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.86, 0.6).multiplyScalar(22), side: THREE.DoubleSide }));
    d.position.y = y; d.rotation.x = Math.PI / 2; pinLight.add(d); }
  { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,230,170,0.9)'); gr.addColorStop(0.5, 'rgba(255,190,110,0.25)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.setScalar(0.07); sp.position.y = 0.012; sp.renderOrder = 60; pinLight.add(sp); }
  saucer.add(pinLight); pinLight.visible = false;
  // the coffee: the espresso in the cup drops as a dark splash onto his lap and the table
  const cof = [], RC = rng(23);
  for (let i = 0; i < 140; i++) { const a = RC() * 6.283, s = RC() * 0.7; cof.push({ p: [holdP.x + (RC() - 0.5) * 0.03, holdP.y + 0.02, holdP.z + (RC() - 0.5) * 0.03], v: [Math.cos(a) * s, -0.3 - RC() * 0.9, Math.sin(a) * s], t0: TC + 0.02 + RC() * 0.06,
    size: 0.005 + RC() * 0.009, col: [0x5a3418, 0x4a2a14, 0x6a4020][i % 3], shape: i % 4 ? 3 : 1, drag: 1.0, floor: TOPY + 0.003, life: 1.6 + RC(), seed: RC() }); }
  const coffee = bits(S, cof);
  // a pinch of smoke from the pinhole
  const smoke2 = wisps(S, V3(saucerP.x, TOPY + 0.014, saucerP.z), tSaucer + 0.02, tSaucer + 1.1, { seed: 9, size: 0.012, every: 0.07, life: 1.0, buoy: 0.15 });
  // the waiter: navy waistcoat, white apron (bot), pours from a steel coffee pot into the cup the old man holds out
  const waiter = makePerson(S, { hair: 'short', hairCol: 0x1a1410, top: 0x1f2a3a, bot: 0xf2efe6, height: 1.8, build: 0.92, fem: 0, skin: 0xa8744e, pose: 'tray' });
  // place him so that his pouring hand lands just above and behind the cup the old man holds out
  waiter.setPose('pourHigh');
  const wDir = new THREE.Vector3(0.55, 0, -0.55).normalize(), WT = V3(holdP.x + wDir.x * 0.62, LOW, holdP.z + wDir.z * 0.62);
  waiter.root.position.copy(WT); waiter.root.rotation.y = faceYaw(-wDir.x, -wDir.z);
  { const hp0 = handPoint(waiter), want = holdP.clone().add(V3(wDir.x * 0.07, 0.2, wDir.z * 0.07)); waiter.root.position.x += want.x - hp0.x; waiter.root.position.z += want.z - hp0.z; }
  const WT1 = waiter.root.position.clone();
  const wkP = posePlayer(waiter, [[-99, 'tray'], [1.95, 'gape', 0.15], [3.6, 'tray', 0.5], [5.9, 'pourHigh', 0.1]]);
  // the pot: a steel coffee pot with a spout, carried in the right hand from 5.9; the tray before that
  const pot = new THREE.Group(); { const st = M(0xc8c8c8, { rough: 0.35 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.16, 8), st); pot.add(b);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.05, 8), st); lid.position.y = 0.105; pot.add(lid); const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), M(0x1f1f24)); h2.position.set(-0.08, 0.02, 0); pot.add(h2);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.1, 6), st); sp.position.set(0.085, 0.04, 0); sp.rotation.z = -1.0; pot.add(sp); pot.scale.setScalar(0.7); } S.scene.add(pot);
  const tray = new THREE.Group(); { tray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 16), M(0xc8c8c8, { rough: 0.35 })));
    for (const [x, z] of [[0.08, 0.05], [-0.07, 0.06], [0.0, -0.09]]) { const d = drink(V3(0, 0, 0)); d.position.set(x, 0.008, z); tray.add(d); } } S.scene.add(tray);
  waiter.setPose('pourHigh'); const potHand = handPoint(waiter); waiter.setPose('tray');
  // the pot in his hand, spout (local +X) turned toward the cup and tipped down; the stream falls from the spout tip
  pot.position.copy(potHand); pot.rotation.set(0, Math.atan2(wDir.z, -wDir.x), 0); pot.rotateZ(-0.6); pot.updateMatrixWorld(true);
  const spout = V3(0.13, 0.0, 0).applyMatrix4(pot.matrixWorld);   // (local; the 0.7 scale is in matrixWorld)
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 1, 6).translate(0, -0.5, 0), M(0x3a2010, { rough: 0.3 })); stream.position.copy(spout); S.scene.add(stream);
  const drip = []; for (let i = 0; i < 40; i++) drip.push({ p: [saucerP.x, TOPY + 0.02, saucerP.z], v: [(RC() - 0.5) * 0.8, 0.5 + RC() * 0.6, (RC() - 0.5) * 0.8], t0: TC + 0.1 + i * 0.09, size: 0.01 + RC() * 0.008, col: 0x3a2010, shape: 3, drag: 1, floor: TOPY + 0.004, life: 0.8, seed: RC() });
  const drips = bits(S, drip);
  // ------------------------------------------------ the neighbour with the big sun hat (her hat flies into the phone squeeze)
  const NB = V3(-0.42, LOW, -10.72), nbYaw = faceYaw(TB.x - NB.x, TB.z - NB.z);
  cafeChair(S, NB.clone(), nbYaw, 0x2f6f8a);
  const nb = makePerson(S, { hair: 'bun', fem: 0.85, top: 0xf4f1ea, bot: 0x4d6f9a, hairCol: 0x2a1d14, height: 1.64, build: 1.05, skin: 0xa86f4a, hat: { k: 1, col: 0xd2402e, band: 0xf2c53a }, pose: 'sitSpritz' });
  nb.root.position.copy(NB).setY(LOW + SIT_DY); nb.root.rotation.y = nbYaw;
  const nbP = posePlayer(nb, [[-99, 'sitSpritz'], [1.72, 'sitHands', 0.12], [3.4, 'sitPoint', 0.4]]);
  nb.setPose('sitSpritz'); const nbHat0 = headTop(nb);
  // it lands crooked on the glass table among the spritzes (a readable rest spot in frame 1's lower middle)
  const hatF = flyingHat(S, nb.hat, TP + 0.04, hand.clone().add(V3(-0.3, -0.32, 0.12)), { dur: SQZ.phone.dur - 0.06, fall: 0.5, land: V3(0.16, DECK + 0.76, -9.4), arc: 0.25, spin: 16, restTilt: 0.18 });
  const nbGlass = drink(V3(0, 0, 0));
  // ------------------------------------------------ the accordion player by the rail (stops mid-note at the squeeze)
  const AC = V3(0.62, LOW, -12.22), ac = makePerson(S, { hair: 'curly', hairCol: 0x3a3a3a, top: 0xd2402e, bot: 0x1f1f24, height: 1.76, build: 1.18, fem: 0, skin: 0xb07a52, hat: { k: 3, col: 0x24345a }, pose: 'accordion' });
  ac.root.position.copy(AC); ac.root.rotation.y = faceYaw(-0.6, 1);
  const acP = posePlayer(ac, [[-99, 'accordion'], [2.0, 'gape', 0.15], [3.8, 'accordion', 0.4]]);
  const acc = new THREE.Group(); { const red = M(0xc81e2e, { rough: 0.5 }), wh = M(0xf4f1ea); const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.22), red); a.position.x = -0.2; acc.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.22), red); b.position.x = 0.2; acc.add(b); const k = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.06), wh); k.position.set(0.255, 0, -0.06); acc.add(k);
    const bel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.2, 6, 1, 1), M(0x1f1f24)); acc.add(bel); acc.userData = { a, b, bel }; } S.scene.add(acc);
  // ------------------------------------------------ the inrush: everything loose on the tables and the flower boxes rushes into her hand
  const IN = [], RI = rng(29), k = 5.5, c = hand;
  const toward = (p, t0, size, col, shape, floor, speedK = 1) => { const d = c.clone().sub(V3(...p)), dist = d.length(); d.normalize();
    const v = dist * k * (0.78 + 0.3 * RI()) * speedK;
    IN.push({ p, v: [d.x * v, d.y * v + 0.6 * 9.81 / k, d.z * v], t0, size, col, shape, drag: k, floor, rest: true, spin: 1.6, seed: RI() }); };
  const lag = (p) => TP + 0.02 + 0.05 * Math.min(1, c.distanceTo(V3(...p)) / 4) + 0.03 * RI();
  const endFloor = floorAt(c);
  for (const t of W.terrace.tables) { const dd = Math.hypot(t.x - c.x, t.z - c.z); if (dd > 7) continue;
    for (let i = 0; i < 16; i++) { const a = RI() * 6.283, r = RI() * 0.36, p = [t.x + Math.cos(a) * r, TOPY + 0.004, t.z + Math.sin(a) * r];
      const card = RI() < 0.62; toward(p, lag(p), card ? 0.13 + RI() * 0.08 : 0.06,card ? [0xf4f1ea, 0xffffff, 0xf2e3b8][i % 3] : [0xe86aa0, 0xf4f1ea, 0x7fb8e6, 0xf2c53a][i % 4], card ? 1 : 2, Math.min(TOPY, endFloor)); } }
  // the menu card (the old man's table) and the bar's paper menus from the deck tables
  toward([TB.x + 0.15, TOPY + 0.006, TB.z + 0.1], TP + 0.05, 0.3, 0x1f3a2a, 1, LOW);
  toward([gT.group.position.x - 0.1, gT.topY + 0.004, gT.group.position.z + 0.08], TP + 0.03, 0.24, 0xf2e3b8, 1, endFloor);
  for (let i = 0; i < 18; i++) { const p = [gT.group.position.x + (RI() - 0.5) * 0.5, gT.topY + 0.004, gT.group.position.z + (RI() - 0.5) * 0.5]; toward(p, lag(p), 0.05 + RI() * 0.05, [0xf4f1ea, 0xe86aa0, 0xffffff][i % 3], RI() < 0.7 ? 1 : 2, endFloor); }
  // petals and leaves off the flower boxes on the rail (red / pink / white geraniums)
  for (let i = 0; i < 160; i++) { const p = [c.x - 3.2 + RI() * 6.4, LOW + 1.06 + RI() * 0.24, TERRACE.railZ - 0.24 + (RI() - 0.5) * 0.3]; if (Math.abs(p[0] - c.x) > 3.6) continue;
    toward(p, lag(p), 0.035 + RI() * 0.04, RI() < 0.7 ? [0xd8283a, 0xe8466a, 0xf2f0ea, 0xc81e2e][i % 4] : 0x3f7a34, RI() < 0.7 ? 1 : 0, Math.min(LOW + 1.0, endFloor)); }
  // napkins lifting off the deck floor round her feet
  for (let i = 0; i < 26; i++) { const a = RI() * 6.283, r = 0.6 + RI() * 2.2, p = [c.x + Math.cos(a) * r, DECK + 0.01, c.z + Math.sin(a) * r]; if (p[2] < TERRACE.deckZ || p[2] > -7.2) continue; toward(p, lag(p), 0.09 + RI() * 0.05, [0xf4f1ea, 0xffffff, 0xf2e3b8][i % 3], 1, DECK); }
  // the gust: napkins and paper from the tables outside the frame (left / right of the 35 mm view) sweep in across it
  for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, p = [c.x + side * (1.1 + RI() * 1.8), DECK + 0.3 + RI() * 2.6, c.z + (RI() - 0.3) * 2.2];
    IN.push(...[]); toward(p, TP + 0.01 + 0.06 * RI(), 0.12 + RI() * 0.1, [0xf4f1ea, 0xffffff, 0xf2e3b8, 0xe86aa0, 0x7fb8e6][i % 5], RI() < 0.75 ? 1 : 2, endFloor, 1.05);
    IN[IN.length - 1].rest = false; }
  const inrushB = bits(S, IN);
  // ------------------------------------------------ the napkin across the lens (5.75-6.0), drawn only when o.wipe
  const wipe = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5, 2, 2), M(0xf6f1e4, { rough: 0.95, x: { side: THREE.DoubleSide } }));
  { const pa = wipe.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, (Math.abs(pa.getX(i)) < 0.01 ? -0.04 : 0) + (pa.getY(i) > 0.2 ? 0.02 : 0)); wipe.geometry.computeVertexNormals(); }
  wipe.visible = false; S.scene.add(wipe);
  const T_WIPE = 5.74, WIPE_D = 0.26;
  // ------------------------------------------------ per frame
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  return { W, woman, oldMan, waiter, nb, ac, hand, holdP, saucerP, saucer, cup, TB, OM, T_WIPE,
    update(film, cam, st = {}) {
      W.update(film, { focus: st.focus ?? V3(0, 9, -12), box: st.box ?? 30 });
      // people (poses + the jump at 2.0)
      wP.apply(film); omP.apply(film); wkP.apply(film); nbP.apply(film); acP.apply(film);
      woman.root.position.y = WOMAN.pos.y + bump(film, 1.62, 0.06);
      oldMan.root.position.y = LOW + SIT_DY + bump(film, 1.98, 0.07) + bump(film, 7.82, 0.08);
      nb.root.position.y = LOW + SIT_DY + bump(film, 1.66, 0.1);
      waiter.root.position.y = LOW + bump(film, 1.97, 0.1);
      ac.root.position.y = LOW + bump(film, 1.99, 0.12);
      // her hat, the neighbour's spritz glass
      hatF.update(film, headTop(nb));
      nb.setPose(nbP.at(film)); const nh = handPoint(nb); nbGlass.position.copy(nh).add(V3(0, -0.05, 0)); nbGlass.visible = film < 1.72 || film > 3.4;
      if (film >= 1.72 && film < 3.4) { nbGlass.visible = true; nbGlass.position.set(NB.x + (TB.x - NB.x) * 0.45, TOPY, NB.z + (TB.z - NB.z) * 0.45); }   // put down on the table edge
      // the accordion (bellows breathe; frozen from 1.6, held out mid-note)
      { const wv = film < TP ? Math.sin(film * 3.1) : Math.sin(TP * 3.1); ac.root.updateMatrixWorld(true);
        acc.position.set(0, 1.15, -0.27).applyMatrix4(ac.root.matrixWorld); acc.quaternion.copy(ac.root.quaternion);
        const g = film >= 2.0 && film < 3.8 ? 0.5 : 1; acc.userData.bel.scale.x = (0.75 + 0.35 * wv) * g; acc.userData.a.position.x = -0.2 * acc.userData.bel.scale.x - 0.02; acc.userData.b.position.x = 0.2 * acc.userData.bel.scale.x + 0.02;
        if (g < 1) acc.position.y -= 0.25; }
      // squeezes
      PH.update(film, cam); holeP.update(film); puffB.update(film); smoke1.update(film); gT.update(film); inrushB.update(film);
      // the cup: in his hand (sip / hold out), squeezed at TC
      const hp = handPoint(oldMan); cupObj.position.copy(hp).add(V3(0, -0.04, 0)); cupObj.rotation.set(0, omYaw, 0);
      CUP.update(film, cam); coffee.update(film); smoke2.update(film); drips.update(film); pin.update(film); clothHole.update(film);
      // the saucer: on the table, lifted to his eye from 9.2 (sitPeer: both hands up)
      const peer = clamp((film - 9.0) / 0.45);
      const turn = OM_TURN * peer * peer * (3 - 2 * peer); oldMan.root.rotation.y = omYaw + turn;
      if (peer > 0) { oldMan.root.updateMatrixWorld(true); const hp2 = handPoint(oldMan), fy = omYaw + turn, fwd = V3(-Math.sin(fy), 0.12, -Math.cos(fy)).normalize();
        cup.group.position.lerpVectors(saucerP, hp2.clone().addScaledVector(fwd, 0.03), peer);
        cup.group.quaternion.slerpQuaternions(new THREE.Quaternion(), _q.setFromUnitVectors(V3(0, 1, 0), fwd), peer); }
      else { cup.group.position.copy(saucerP); cup.group.rotation.set(0, 0, 0); }
      pinLight.visible = film > tSaucer + 0.6 && peer > 0.6;
      // the waiter's tray / pot and the coffee stream (pours into the cup; from TC on into nothing, onto the table)
      const pour = film >= 5.9;
      tray.visible = !pour; pot.visible = pour; stream.visible = pour && film >= 6.72;
      if (!pour) { waiter.setPose(wkP.at(film)); const th = handPoint(waiter); tray.position.copy(th).add(V3(0, 0.02, 0)); tray.visible = !(film >= 1.95 && film < 3.6); }
      if (stream.visible) { // into the cup; once the cup is gone, straight down past where it was onto the table
        const end = film < TC + 0.12 ? holdP.clone().add(V3(0, 0.03, 0)) : V3(holdP.x, TOPY + 0.01, holdP.z);
        _v.subVectors(end, spout); stream.scale.y = Math.max(0.01, _v.length()); stream.position.copy(spout); stream.quaternion.setFromUnitVectors(V3(0, -1, 0), _v.normalize()); }
      // the napkin across the lens
      // o.wipe: [t0, t1, u0, u1] (film window -> sweep progress; u 0 = off left, 1 = off right). s01: 5.74-6.0 0->0.62; s02: 6.0-6.2 0.62->1.1
      const [w0, w1, u0, u1] = o.wipe || [0, 0, 0, 0];
      wipe.visible = !!o.wipe && film >= w0 && film < w1;
      if (wipe.visible && cam) { const u = u0 + (u1 - u0) * (film - w0) / (w1 - w0);
        _v.set(-0.55 + 1.1 * u, 0.08 - 0.12 * u, -0.42).applyQuaternion(cam.quaternion); wipe.position.copy(cam.position).add(_v);
        wipe.quaternion.copy(cam.quaternion).multiply(_q.setFromEuler(new THREE.Euler(0.3 - 0.5 * u, 0.4 - 0.8 * u, 0.6 * u))); }
    } };
}
