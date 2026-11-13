// no-empty-space SHARED KIT (lead-owned; Builders import it, NEVER edit it). One look for the whole film (LOOK.md):
//   look:    ONE golden-hour sun low from the WEST (screen-left in the hero vantage, which looks north up the inlet), long
//            shadows to screen-right, warm haze, a warm grade that turns amber with dust (gradeDust) and clean/cold in space.
//   set:     harbourWorld(S, o) = the town "Porto" (harbour.js: terrain, ~7,000 pastel houses, church, quay, promenades, mole,
//            headland + the 381 m tower, the mountain, the ferry, the BAR DEL PORTO terrace), the sea (ocean.js), moored
//            fishing boats that bob, townsfolk with hats (full colour, varied), gulls, kites.
//   squeeze: squeeze(S, o) / bits(S, list) / inrushBits / hole (squeeze.js) with the kit's light baked in.
//   people:  makeHero (straw hat, lime-and-white stripes, red shorts, stocky), makePerson (any one-off character), townsfolk,
//            hats, POSES additions (sit, sitSip, lookHand, clickFob, patPockets, kneel, duck, holdHat, peer, cone, run, tray, pour).
//   props:   makeCar (the hero's red hatchback and parked cars), makeVespa, makeDog, makeFruitCart, makeGelatoCart, makeCup,
//            makePhone, signBoard.
//   camera:  FRAME1_CAM (s01 frame 0 == s12's terrace), lookDir, designDir, toDesign, inTypeZone, dirLL, aimFor.
// Units: metres, +Y up; the hero vantage looks north (-Z); east (+X) = screen-right; the sun comes from screen-left.
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean, waveHeight } from '@engine/ocean.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE, POSES } from '@engine/figure.js';
import { lensFov } from '@engine/camera.js';
import { rng } from '@engine/util.js';
import { buildTown, buildTerrace, towerGroup, mountainGroup, ferryGroup, boatGeometry, signBoard, plainMat, groundH, isLand,
  GROUND_GLSL, QUAY_Y, QUAY_Z, TERRACE, MOLE, HEAD, TOWER, MOUNT, CHURCH, FERRY, xW, xE, GB, patternMaterial, PAL } from './harbour.js';
import { createSqueeze, createBits, shardsFrom, inrushBits, createHole } from './squeeze.js';
export { groundH, isLand, QUAY_Y, QUAY_Z, TERRACE, MOLE, HEAD, TOWER, MOUNT, CHURCH, FERRY, xW, xE, GB, patternMaterial, PAL, signBoard, plainMat,
  shardsFrom, inrushBits, towerGroup, mountainGroup, ferryGroup };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ================================================================= LOOK (LOOK.md: golden light, haze, one warm grade)
// Mediterranean summer daywear: linen, navy, coral, turquoise, sun-yellow, stripes' colours; mutate BEFORE createCrowd.
PALETTE.top.splice(0, PALETTE.top.length, 0xf4f1ea, 0x24345a, 0xd2402e, 0xf08070, 0x2fa8a8, 0xf2c53a, 0x7fb8e6, 0xe86aa0, 0xf08a2a, 0x7a8a3a, 0xfafafa, 0x8a2b3a, 0x5a9ad8, 0xe8d24a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0xece6da, 0xc8b48a, 0x4d6f9a, 0x2a3550, 0xb8382e, 0x6a6a3a, 0x1f1f24, 0x8a6a4a, 0xf2efe6);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0xd8c08a, 0x8a8580, 0xe8e2d6, 0x3a3a3a);
// the sun: ~20° high from the west-south-west (screen-left, a little behind the north-looking hero camera)
export const SUN = new THREE.Vector3(-0.85, 0.34, 0.35).normalize();
export const SUN_COL = 0xffb460, SUN_I = 5.2;
export const SKY = { zen: 0x2f72d2, hor: 0xffc58a, gold: 1, goldH: 0.22, goldSun: 1.1 };
export const HAZE = { col: 0xf2c896, near: 380, far: 9000 };    // distance haze: the far shores, the tower and the mountain soften gold
export const HEMI = { sky: 0x8aaee8, ground: 0xa07650, i: 0.55 };
export const SKIN = 0xb98462;                                    // townsfolk skin (crowd material; one-offs vary it)
export const LOOK = { sunDir: SUN, sunCol: SUN_COL, sunI: 1.7, sky: HEMI.sky, gnd: HEMI.ground, fog: HAZE.col, fogN: HAZE.near, fogF: HAZE.far };
export const POST_DAY = { exposure: 1.0, bloom: 0.16, bloomThreshold: 1.6, bloomRadius: 0.6, vignette: 0.3, grain: 0.014, ca: 0.0008, sat: 1.18, contrast: 1.1, lift: [0.02, 0.01, 0.0], gain: [1.06, 1.0, 0.88] };
export const POST_ORBIT = { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.016, ca: 0.0005, sat: 1.08, contrast: 1.06, lift: [0.0, 0.004, 0.012], gain: [0.98, 1.0, 1.04] };
// k 0..1 = how much dust is in the air (s06-s08): warm gold -> amber dust. Call per frame after createStudio.
export function gradeDust(S, k) { const p = S.post.p; p.gain = [1.06 + 0.04 * k, 1.0 - 0.02 * k, 0.88 - 0.12 * k]; p.lift = [0.02 + 0.012 * k, 0.01 + 0.008 * k, 0.0]; p.sat = 1.18 - 0.1 * k; p.contrast = 1.1 - 0.04 * k; }
export const goldSky = (sky) => { const U = sky.U; if (U.altI) U.altI.value = 0; if (U.gold) { U.gold.value = SKY.gold; U.goldH.value = SKY.goldH; U.goldSun.value = SKY.goldSun; } };
// motion-blur samples (brief §6): 12 fast (s05, s06, s08), 8 moving (s01, s03, s07, s09), 4 calm. s12 = s01's pre-squeeze value.
export const SAMPLES = { s01_pre: 4, s01_phone: 8, s02_cup: 4, s03_car: 8, s04_hole: 4, s05_ferry: 12, s06_tower: 12, s07_drop: 8, s08_mountain: 12, s09_earth: 8, s10_speck: 4, s11_moon: 4, s12_loop: 4 };
export function styliseMat(m, o = {}) {
  if (!m || !m.isMeshStandardMaterial) return m;
  m.flatShading = true; m.roughness = Math.max(m.roughness, o.rough ?? 0.6); m.metalness = Math.min(m.metalness, o.metal ?? 0.1); m.envMapIntensity = o.env ?? 0.45; m.needsUpdate = true; return m;
}

// ---------------------------------------------------------------- lights (sky + golden sun + hemi + haze)
export function dayLights(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.35);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY.zen); sky.U.dayHor.value.set(o.hor ?? SKY.hor); goldSky(sky);
  const sun = new THREE.DirectionalLight(SUN_COL, o.sunI ?? SUN_I); sun.castShadow = o.shadows !== false; sun.shadow.mapSize.set(o.map ?? 2048, o.map ?? 2048);
  const b = o.box ?? 60;
  Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 10, far: o.far ?? 3000 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(HEMI.sky, HEMI.ground, o.hemiI ?? HEMI.i); scene.add(hemi);
  if (o.fog !== false) scene.fog = new THREE.Fog(o.fogCol ?? HAZE.col, o.fog0 ?? HAZE.near, o.fog1 ?? HAZE.far);
  return { sky, sun, hemi,
    update(S, t, focus = new THREE.Vector3(), box) {
      if (box) { const c = sun.shadow.camera; if (c.right !== box) { Object.assign(c, { left: -box, right: box, top: box, bottom: -box }); c.updateProjectionMatrix(); } }
      sun.position.copy(SUN).multiplyScalar(Math.max(900, (box ?? b) * 5)).add(focus); sun.target.position.copy(focus);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    } };
}

// ================================================================= POSES (added to the shared table in every page that imports the kit)
// Hand targets are body coords (-z forward), metres. sit*: knees bent 90° (the hips at chair height: place the root at y = seat - 0.45).
Object.assign(POSES, {
  sit: { R: { t: [0.2, 0.95, -0.28], pole: [1, -0.6, 0.3] }, L: { t: [-0.2, 0.95, -0.28], pole: [-1, -0.6, 0.3] }, legR: [1.45, 0.08, 1.5], legL: [1.45, 0.08, 1.5], lean: -0.05, head: [0, 0] },
  sitSip: { R: { t: [0.12, 1.32, -0.2], pole: [1, -0.6, 0.3] }, L: { t: [-0.2, 0.95, -0.28], pole: [-1, -0.6, 0.3] }, legR: [1.45, 0.08, 1.5], legL: [1.45, 0.08, 1.5], lean: -0.03, head: [0, 0.05] },
  sitStare: { R: { t: [0.14, 1.28, -0.34], pole: [1, -0.6, 0.3] }, L: { t: [-0.22, 0.92, -0.25], pole: [-1, -0.6, 0.3] }, legR: [1.45, 0.08, 1.5], legL: [1.45, 0.08, 1.5], lean: -0.12, head: [0.15, -0.1] },
  sitPeer: { R: { t: [0.05, 1.5, -0.22], pole: [1, -0.4, 0.3] }, L: { t: [-0.05, 1.5, -0.22], pole: [-1, -0.4, 0.3] }, legR: [1.45, 0.08, 1.5], legL: [1.45, 0.08, 1.5], lean: -0.05, head: [0, 0.05] },
  selfie: { R: { t: [0.42, 1.95, -0.42], pole: [1, -0.2, 0.2] }, L: { t: [-0.12, 1.02, -0.12], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.06, 0.1, 0.15], lean: 0.08, head: [0.35, 0.35], hip: 0.08 },
  lookHand: { R: { t: [0.36, 1.9, -0.4], pole: [1, -0.2, 0.2] }, L: { t: [-0.2, 1.25, -0.3], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.1, 0.1, 0.2], lean: 0.14, head: [0.35, 0.5], hip: 0.04 },
  clickFob: { R: { t: [0.18, 1.32, -0.48], pole: [1, -0.4, 0.2] }, L: { t: [-0.2, 0.92, -0.05], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.02, head: [0, 0.05] },
  patPockets: { R: { t: [0.24, 0.95, 0.05], pole: [1, -0.3, -0.3] }, L: { t: [-0.24, 0.95, 0.05], pole: [-1, -0.3, -0.3] }, legR: [0.05, 0.1, 0.1], legL: [-0.05, 0.1, 0.1], lean: -0.12, head: [0, -0.35] },
  shrug: { R: { t: [0.5, 1.35, -0.25], pole: [1, -0.5, 0] }, L: { t: [-0.5, 1.35, -0.25], pole: [-1, -0.5, 0] }, legR: [0.05, 0.1, 0.05], legL: [-0.05, 0.1, 0.05], lean: 0.05, head: [0, 0.15] },
  lookUnder: { R: { t: [0.2, 0.55, -0.5], pole: [1, -0.4, 0.2] }, L: { t: [-0.25, 0.8, -0.45], pole: [-1, -0.4, 0.2] }, legR: [0.7, 0.1, 1.2], legL: [0.2, 0.1, 0.4], lean: -0.75, head: [0, -0.3] },
  kneel: { R: { t: [0.1, 0.45, -0.55], pole: [1, -0.4, 0.2] }, L: { t: [-0.25, 0.75, -0.25], pole: [-1, -0.4, 0.2] }, legR: [1.3, 0.1, 2.2], legL: [0.2, 0.1, 1.8], lean: -0.55, head: [0, -0.4] },
  duck: { R: { t: [0.12, 1.72, -0.05], pole: [1, -0.2, 0.2] }, L: { t: [-0.12, 1.72, -0.05], pole: [-1, -0.2, 0.2] }, legR: [0.6, 0.12, 1.1], legL: [0.6, 0.12, 1.1], lean: -0.6, head: [0, -0.4] },
  holdHat: { R: { t: [0.06, 1.86, -0.04], pole: [1, -0.2, 0.2] }, L: { t: [-0.2, 1.1, -0.3], pole: [-1, -0.6, 0.2] }, legR: [0.15, 0.12, 0.25], legL: [-0.1, 0.15, 0.1], lean: -0.25, head: [0, -0.2] },
  peer: { R: { t: [0.12, 1.55, -0.45], pole: [1, -0.3, 0.2] }, L: { t: [-0.12, 1.6, -0.4], pole: [-1, -0.3, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.15, head: [0, 0.05] },
  cone: { R: { t: [0.18, 1.35, -0.38], pole: [1, -0.5, 0.2] }, L: { t: [-0.2, 0.95, -0.15], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.05, head: [0.1, -0.1] },
  run: { R: { t: [0.25, 1.3, 0.25], pole: [1, -0.5, 0.2] }, L: { t: [-0.25, 1.05, -0.35], pole: [-1, -0.5, 0.2] }, legR: [0.7, 0.08, 0.9], legL: [-0.45, 0.08, 0.3], lean: -0.25, head: [0, 0.1] },
  tray: { R: { t: [0.32, 1.4, -0.35], pole: [1, -0.6, 0.2] }, L: { t: [-0.2, 0.95, -0.1], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: 0.0, head: [0, 0] },
  pour: { R: { t: [0.15, 1.15, -0.45], pole: [1, -0.6, 0.2] }, L: { t: [-0.2, 1.4, -0.3], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.2, head: [0, -0.3] },
  fish: { R: { t: [0.15, 1.25, -0.4], pole: [1, -0.6, 0.2] }, L: { t: [0.0, 1.05, -0.35], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.12, 0.05], legL: [-0.05, 0.12, 0.1], lean: 0.02, head: [0, -0.1] },
  accordion: { R: { t: [0.32, 1.15, -0.25], pole: [1, -0.6, 0.2] }, L: { t: [-0.32, 1.15, -0.25], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.1, 0.05], legL: [-0.05, 0.1, 0.1], lean: 0.05, head: [0.2, 0.1] },
  catch: { R: { t: [0.22, 1.25, -0.42], pole: [1, -0.4, 0.2] }, L: { t: [-0.22, 1.25, -0.42], pole: [-1, -0.4, 0.2] }, legR: [0.1, 0.12, 0.2], legL: [-0.2, 0.12, 0.15], lean: 0.18, head: [0, 0.1] },
});
// poses whose right hand holds something (the figure geometry then carries a hand anchor: handPoint())
for (const k of ['selfie', 'lookHand', 'clickFob', 'sitSip', 'sitStare', 'sitPeer', 'cone', 'tray', 'pour', 'peer', 'kneel', 'fish']) POSES[k].phone = 'R';
export const TOWN_POSES = ['stand', 'pocket', 'arms', 'point', 'shade', 'phoneUp', 'filming', 'stand', 'pocket', 'arms'];
// world position of a one-off character's right-hand anchor (poses above): where the phone / cup / fob / cone sits
export function handPoint(h) { h.root.updateMatrixWorld(true); const ph = h.mesh.geometry.userData.phone?.[0];
  return ph ? new THREE.Vector3(...ph.p).applyMatrix4(h.root.matrixWorld) : h.root.position.clone().setY(h.root.position.y + 1.2); }

// ================================================================= PEOPLE
// hats: instanced straw hats / sun hats / panamas / caps' brims. hat(i) kinds: 0 straw boater, 1 wide sun hat, 2 panama, 3 bucket
const HAT_COL = [0xe8d29a, 0xf2e3b8, 0xd9c08a, 0xf4f1ea, 0xd2402e, 0x24345a, 0x2fa8a8, 0xe86aa0, 0x1f1f24];
function hatGeos() {
  const crown = new THREE.CylinderGeometry(0.1, 0.115, 0.11, 10); crown.translate(0, 0.055, 0);
  const brim = [new THREE.CylinderGeometry(0.19, 0.19, 0.015, 14), new THREE.CylinderGeometry(0.28, 0.28, 0.012, 16), new THREE.CylinderGeometry(0.17, 0.17, 0.014, 12), new THREE.CylinderGeometry(0.15, 0.16, 0.05, 12)];
  const band = new THREE.CylinderGeometry(0.117, 0.117, 0.03, 10); band.translate(0, 0.02, 0);
  return { crown, brim, band };
}
// hats for a crowd: frac of people, returns { meshes, items: [{ p (person), y (crown base above the root), k }], update(t, fn?) }
// fn(item) -> { pos, quat } overrides a hat (a hat flying off in the inrush); otherwise it rides on the head.
export function crowdHats(S, crowd, o = {}) {
  const R = rng(o.seed ?? 71), G = hatGeos(), items = [];
  crowd.meshes.forEach((m) => { const hc = m.geometry.userData.headC ?? [0, 1.6, 0];
    m.userData.list.forEach((p) => { if (R() < (o.frac ?? 0.45)) items.push({ p, y: hc[1] + 0.07, dz: hc[2], k: Math.floor(R() * 4), col: HAT_COL[Math.floor(R() * HAT_COL.length)], sd: R() }); }); });
  const n = Math.max(1, items.length), M = (c) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
  const crownM = new THREE.InstancedMesh(G.crown, M(0xffffff), n), bandM = new THREE.InstancedMesh(G.band, M(0x3a2a20), n);
  const brimM = G.brim.map((g) => new THREE.InstancedMesh(g, M(0xffffff), n));
  const c = new THREE.Color(); items.forEach((it, i) => { crownM.setColorAt(i, c.set(it.col)); brimM.forEach((b) => b.setColorAt(i, c.set(it.col))); });
  [crownM, bandM, ...brimM].forEach((m) => { m.castShadow = true; m.frustumCulled = false; S.scene.add(m); });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0), YA = new THREE.Vector3(0, 1, 0);
  return { items, meshes: [crownM, bandM, ...brimM],
    update(t, fn) {
      items.forEach((it, i) => { const ov = fn && fn(it, i);
        if (ov === null) { crownM.setMatrixAt(i, Z); bandM.setMatrixAt(i, Z); brimM.forEach((b) => b.setMatrixAt(i, Z)); return; }
        if (ov) { _v.copy(ov.pos); _q.copy(ov.quat); } else { const p = it.p; _q.setFromAxisAngle(YA, p.yaw || 0); _v.set(0, it.y, it.dz).applyQuaternion(_q).add(_s.set(p.x, p.y ?? 0, p.z)); }
        _s.set(1, it.k === 3 ? 0.9 : 1, 1); _m.compose(_v, _q, _s); crownM.setMatrixAt(i, _m); bandM.setMatrixAt(i, _m);
        brimM.forEach((b, k) => b.setMatrixAt(i, k === it.k ? _m : Z)); });
      [crownM, bandM, ...brimM].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    } };
}
// townsfolk: createCrowd + hats + the kit skin. people: [{ x, z, y?, yaw, pose? }]. o: { poses, seed, hats 0.45, rimI }
export function townsfolk(S, people, o = {}) {
  const crowd = createCrowd(S, people, { poses: o.poses ?? TOWN_POSES, rimI: o.rimI ?? 0.22, seed: o.seed ?? 9, res: o.res ?? 0.018 });
  crowd.material.U.uSkin.value.set(o.skin ?? SKIN); crowd.phones.forEach((ph) => { ph.visible = !!o.phones; });
  const hats = crowdHats(S, crowd, { frac: o.hats ?? 0.45, seed: (o.seed ?? 9) + 3 });
  return { crowd, hats, update(t, st = {}) { crowd.update(t, { agitation: st.agitation ?? 0.2 }); hats.update(t, st.hat); } };
}
// one-off characters (gag subjects, the waiter, the gelato seller...): createHero with the kit look + optional hat.
// o: createHero opts + { skin, hat: { k 0..3, col } | false, stripes: [colA, colB, period m] (top), pose }
export function makePerson(S, o = {}) {
  const h = createHero(S, { hair: o.hair ?? 'short', coat: o.coat ?? 0, bag: o.bag ?? 'none', top: o.top ?? 0xf4f1ea, bot: o.bot ?? 0x2a3550, hairCol: o.hairCol ?? 0x3a2a1e,
    bagCol: o.bagCol ?? 0x8a6a4a, height: o.height ?? 1.72, build: o.build ?? 1, fem: o.fem ?? 0.1, pose: o.pose ?? 'stand', rimI: o.rimI ?? 0.3, res: o.res ?? 0.011 });
  h.phone.visible = false; h.material.U.uSkin.value.set(o.skin ?? SKIN);
  if (o.stripes) { const [a, b, per] = o.stripes, mat = h.material, prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => { prev(sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vObjY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vObjY; uniform vec3 uStrA, uStrB;`)
        .replace('diffuseColor.rgb = c; }', `if (sl > 1.5 && sl < 2.5) c = mod(floor(vObjY/${per.toFixed(3)}), 2.) < 1. ? uStrA : uStrB; diffuseColor.rgb = c; }`);
      sh.uniforms.uStrA = { value: new THREE.Color(a) }; sh.uniforms.uStrB = { value: new THREE.Color(b) }; };
    mat.customProgramCacheKey = () => `nes-stripes-${a}-${b}-${per}`; mat.needsUpdate = true; }
  if (o.hat !== false && o.hat) { const G = hatGeos(), col = o.hat.col ?? 0xe8d29a, M = styliseMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }));
    const hat = new THREE.Group(); hat.add(new THREE.Mesh(G.crown, M), new THREE.Mesh(G.brim[o.hat.k ?? 0], M), new THREE.Mesh(G.band, styliseMat(new THREE.MeshStandardMaterial({ color: o.hat.band ?? 0x2a3550 }))));
    hat.traverse((m) => { if (m.isMesh) m.castShadow = true; }); h.root.add(hat); h.hat = hat;
    h.syncHat = () => { const hc = h.mesh.geometry.userData.headC; if (hc && hat.parent === h.root) hat.position.set(hc[0], hc[1] + 0.07, hc[2]); }; h.syncHat();
    const sp = h.setPose; h.setPose = (p) => { sp(p); h.syncHat(); }; }
  return h;
}
// THE HERO: stocky, straw hat, lime-and-white striped shirt, red shorts, car keys. Seen from behind (no face).
export const HERO_LOOK = { top: 0x9acd32, stripe: 0xf4f1ea, bot: 0xd2402e, hat: 0xe8d29a };
export function makeHero(S, o = {}) {
  const h = makePerson(S, { hair: 'short', top: HERO_LOOK.top, bot: HERO_LOOK.bot, hairCol: 0x3a2a1e, height: 1.72, build: 1.28, fem: 0, pose: o.pose ?? 'pocket',
    stripes: [HERO_LOOK.top, HERO_LOOK.stripe, 0.07], hat: { k: 0, col: HERO_LOOK.hat, band: 0xd2402e }, skin: 0xc08a64 });
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.015), styliseMat(new THREE.MeshStandardMaterial({ color: 0x1f1f24 }))); h.root.add(keys); h.keys = keys;
  return h;
}

// ================================================================= PROPS (all flat-shaded, palette colours)
const M = (c, o = {}) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, ...(o.x ?? {}) }), o);
const addBox = (g, w, h, d, m, x, y, z, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; };
// a small hatchback (~3.9 m, nose -Z). Returns a Group (userData.parts for squeeze sampling); the hero's is red 0xd2402e.
export function makeCar(S, col = 0xd2402e, o = {}) {
  const g = new THREE.Group(), body = M(col, { rough: 0.5 }), glass = M(0x2a3a48, { rough: 0.3, env: 0.8 }), tyre = M(0x1c1c20), trim = M(0x2a2a2e), chrome = M(0xd8d8d8, { rough: 0.4 }), lamp = M(0xfff2d0);
  addBox(g, 1.68, 0.62, 3.85, body, 0, 0.55, 0);                                 // lower body
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 1.0, 4, 1), body); cab.rotation.y = Math.PI / 4; cab.scale.set(1.12, 0.62, 2.0); cab.position.set(0, 1.17, 0.25); cab.castShadow = true; g.add(cab);
  const win = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.78, 0.98, 4, 1), glass); win.rotation.y = Math.PI / 4; win.scale.set(1.13, 0.5, 1.96); win.position.set(0, 1.17, 0.25); g.add(win);
  for (const [x, z] of [[-0.78, -1.25], [0.78, -1.25], [-0.78, 1.2], [0.78, 1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 10), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.31, z); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.23, 8), chrome); hub.rotation.z = Math.PI / 2; hub.position.set(x, 0.31, z); g.add(hub); }
  addBox(g, 1.7, 0.16, 0.1, trim, 0, 0.32, -1.95); addBox(g, 1.7, 0.16, 0.1, trim, 0, 0.32, 1.95);
  addBox(g, 0.32, 0.14, 0.04, lamp, -0.6, 0.72, -1.94); addBox(g, 0.32, 0.14, 0.04, lamp, 0.6, 0.72, -1.94);
  addBox(g, 0.28, 0.12, 0.04, M(0xc81e2e), -0.62, 0.74, 1.94); addBox(g, 0.28, 0.12, 0.04, M(0xc81e2e), 0.62, 0.74, 1.94);
  addBox(g, 0.44, 0.1, 0.02, M(0xf4f1ea), 0, 0.42, 1.98);                        // plate
  g.userData.parts = g.children.slice(); if (o.add !== false) S.scene.add(g); return g;
}
export function makeVespa(S, col = 0x7fb8e6) {
  const g = new THREE.Group(), b = M(col, { rough: 0.45 }), d = M(0x2a2a2e), cr = M(0xd8d8d8, { rough: 0.4 });
  addBox(g, 0.42, 0.5, 0.75, b, 0, 0.55, 0.45); addBox(g, 0.3, 0.12, 0.8, d, 0, 0.86, 0.4); addBox(g, 0.38, 0.6, 0.08, b, 0, 0.62, -0.42);
  addBox(g, 0.12, 0.7, 0.12, cr, 0, 0.75, -0.55); addBox(g, 0.62, 0.05, 0.05, cr, 0, 1.12, -0.55);
  for (const z of [-0.6, 0.65]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), d); w.rotation.z = Math.PI / 2; w.position.set(0, 0.2, z); g.add(w); }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g); return g;
}
export function makeDog(S, col = 0xd8a24a) {
  const g = new THREE.Group(), c = M(col), dk = M(0x5a3a1e);
  addBox(g, 0.3, 0.3, 0.72, c, 0, 0.48, 0); addBox(g, 0.26, 0.26, 0.3, c, 0, 0.7, -0.44); addBox(g, 0.14, 0.12, 0.16, dk, 0, 0.64, -0.64);
  for (const x of [-0.1, 0.1]) addBox(g, 0.06, 0.14, 0.08, dk, x, 0.88, -0.4);
  for (const [x, z] of [[-0.1, -0.26], [0.1, -0.26], [-0.1, 0.26], [0.1, 0.26]]) addBox(g, 0.08, 0.34, 0.08, c, x, 0.17, z);
  const tail = addBox(g, 0.06, 0.06, 0.32, c, 0, 0.66, 0.46); tail.rotation.x = 0.6; g.userData.tail = tail;
  S.scene.add(g); return g;
}
// fruit cart full of lemons (LIMONI sign): returns { group, lemons: [world positions] } (lemons as bits for the inrush)
export function makeFruitCart(S, p, yaw = 0) {
  const g = new THREE.Group(), wood = M(0x8a5a34), lem = M(0xf2d33a), R = rng(13), lemons = [];
  addBox(g, 1.8, 0.5, 1.0, wood, 0, 0.75, 0); addBox(g, 1.9, 0.1, 1.1, M(0x6a4428), 0, 1.02, 0);
  for (const x of [-0.75, 0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12), M(0x4a3020)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, 0.55); g.add(w); }
  const lg = new THREE.IcosahedronGeometry(0.05, 0); lg.scale(1, 0.82, 0.82);
  const im = new THREE.InstancedMesh(lg, lem, 120), m4 = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) { const x = (R() - 0.5) * 1.6, z = (R() - 0.5) * 0.85, y = 1.1 + R() * 0.16; im.setMatrixAt(i, m4.makeTranslation(x, y, z)); lemons.push([x, y, z]); }
  g.add(im); g.position.copy(p); g.rotation.y = yaw; g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g);
  const sign = signBoard(S, 'LIMONI', p.clone().add(new THREE.Vector3(0, 1.75, 0)), 1.2, 0.36, yaw, { bg: '#f2d33a', fg: '#2a3550' }); g.attach(sign);
  g.updateMatrixWorld(true); const world = lemons.map((q) => new THREE.Vector3(...q).applyMatrix4(g.matrixWorld));
  return { group: g, lemonMesh: im, lemons: world };
}
// gelato cart (striped umbrella, GELATO sign): returns the Group
export function makeGelatoCart(S, p, yaw = 0) {
  const g = new THREE.Group();
  addBox(g, 1.5, 0.9, 0.8, M(0xf4f1ea), 0, 0.75, 0); addBox(g, 1.52, 0.18, 0.82, M(0xe86aa0), 0, 1.05, 0); addBox(g, 1.4, 0.06, 0.7, M(0x9fd6bd), 0, 1.23, 0);
  for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.42, 2, 1, true, k * Math.PI / 4, Math.PI / 4), M(k % 2 ? 0xf4f1ea : 0xe86aa0, { x: { side: THREE.DoubleSide } })); seg.position.y = 2.45; g.add(seg); }
  addBox(g, 0.04, 1.3, 0.04, M(0x5a5048), 0, 1.75, 0);
  for (const x of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), M(0x2a2a2e)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, 0.42); g.add(w); }
  g.position.copy(p); g.rotation.y = yaw; g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g);
  const sign = signBoard(S, 'GELATO', p.clone().add(new THREE.Vector3(0, 0.78, 0)), 1.1, 0.34, yaw, { bg: '#f4f1ea', fg: '#e8466a' }); g.attach(sign);
  return g;
}
// an espresso cup on its saucer (white, gold rim) at p: { group, cup (the squeezable part), saucer }
export function makeCup(S, p) {
  const g = new THREE.Group(), w = M(0xf6f3ec, { rough: 0.4 });
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.012, 16), w); saucer.position.y = 0.006; g.add(saucer);
  const cup = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.027, 0.06, 14), w); body.position.y = 0.042; cup.add(body);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 14), M(0x3a2010)); coffee.position.y = 0.068; cup.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 5, 10), w); handle.position.set(0.042, 0.045, 0); cup.add(handle);
  g.add(cup); g.position.copy(p); g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); S.scene.add(g); return { group: g, cup, saucer };
}
// a phone (15 cm, a case colour, a lit screen) : Group at p
export function makePhone(S, p, col = 0xe86aa0) {
  const g = new THREE.Group();
  addBox(g, 0.075, 0.15, 0.009, M(col, { rough: 0.5 }), 0, 0, 0);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfd8ff).multiplyScalar(1.6) })); scr.position.z = -0.0047; scr.rotation.y = Math.PI; g.add(scr);
  g.position.copy(p); S.scene.add(g); return g;
}

// ================================================================= THE SQUEEZE (squeeze.js with the kit's light)
export const squeeze = (S, o) => createSqueeze(S, { look: LOOK, ...o });
export const bits = (S, list, o = {}) => createBits(S, list, { look: LOOK, ...o });
export const hole = createHole;
export { inrushBits as inrush };

// ================================================================= THE HARBOUR WORLD (s01-s08, s12)
// FRAME1_CAM: standing on the bar's raised floor, 35 mm, looking north up the inlet: both house-lined shores converge on the
// mouth, the church dome on the left, the headland tower on the right, the flower-box rail across the lower frame.
export const lookDir = (pos, yawDeg, pitchDeg) => pos.clone().add(new THREE.Vector3(Math.sin(yawDeg * D2R) * Math.cos(pitchDeg * D2R), Math.sin(pitchDeg * D2R), -Math.cos(yawDeg * D2R) * Math.cos(pitchDeg * D2R)));
const F1_POS = new THREE.Vector3(qn('cx', 0), TERRACE.y + TERRACE.deckH + qn('ce', 1.65), qn('cz', -6.4));
export const FRAME1_CAM = { pos: F1_POS, look: lookDir(F1_POS, qn('yaw', 1.5), qn('pitch', -4)), mm: qn('mm', 35), roll: 0 };
// the selfie tourist (s01 gag subject: >= 1/4 of the frame): stands on the deck's front edge, phone held up and out
// (yaw 150°: she faces the camera's left, her right arm raises the phone up and out toward frame centre-right, x ~340 y ~430)
export const WOMAN = { pos: new THREE.Vector3(qn('wx', 0.8), TERRACE.y + TERRACE.deckH, qn('wz', -9.2)), yaw: qn('wyaw', 150) * D2R };
// where the hero's car is parked (s03), and his spot on the quay street; the ferry's berth (harbour.FERRY)
export const CAR = { pos: new THREE.Vector3(-8, QUAY_Y + 0.02, -27.5), yaw: Math.PI / 2 };   // parked along the quay street, nose west
export const HERO_QUAY = new THREE.Vector3(-14, QUAY_Y + 0.02, -24);
// people spots (the Builders add shot-specific people): [x0, x1, z0, z1, y, n, faceYaw?]
export const SPOTS = {
  quay: [-58, 58, -38.5, -16, QUAY_Y, 70],
  promW: [null, null, -44, -720, QUAY_Y, 70, 'W'], promE: [null, null, -44, -720, QUAY_Y, 70, 'E'],
  mole: [MOLE.x0 + 4, MOLE.x1 - 4, MOLE.z - 4.5, MOLE.z + 4.5, MOLE.y, 36],
  terrace: [TERRACE.x0 + 0.6, TERRACE.x1 - 0.6, TERRACE.railZ + 0.6, TERRACE.deckZ - 0.3, TERRACE.y, 12],
};
// o: { seed, shadows, box, keepOut: [[x, z, r]], spots: [...names] (default all), people (scale 1), boats 46, ferry true,
//      tower true, mountain true, terrace true, waveAmp 0.28, reflScale 0.25, skipHouses }
export function harbourWorld(S, o = {}) {
  const L = dayLights(S, { shadows: o.shadows ?? true, box: o.box ?? 60 });
  const R = rng(o.seed ?? 31), keep = o.keepOut ?? [[FRAME1_CAM.pos.x, FRAME1_CAM.pos.z, 3.0], [WOMAN.pos.x, WOMAN.pos.z, 1.0]];
  const away = (x, z) => !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr);
  const town = buildTown(S, { skipHouses: o.skipHouses });
  const ocean = createOcean(S, { amp: o.waveAmp ?? 0.28, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0b5f7a, shallow: 0x2fb3b5, amb: 0x6aa0c0, reflScale: o.reflScale ?? 0.25 });
  ocean.add(S.scene); ocean.U.sunCol.value.set(SUN_COL);
  const W = { ...L, town, ocean };
  if (o.terrace !== false) W.terrace = buildTerrace(S);
  if (o.tower !== false) W.tower = towerGroup(S);
  if (o.mountain !== false) W.mountain = mountainGroup(S);
  if (o.ferry !== false) { const f = ferryGroup(); f.position.set(FERRY.x, 0, FERRY.z); S.scene.add(f); W.ferry = f;
    W.ferrySign = signBoard(S, 'FERRY|FUORI SERVIZIO', new THREE.Vector3(xE(FERRY.z) + 4, QUAY_Y + 1.6, FERRY.z + 30), 2.4, 1.0, -Math.PI / 2, { bg: '#f4f1ea', fg: '#b8382e' }); }
  // story-prop signs along the quay street (fronts of the arcade under the terrace and the first row of houses)
  W.signs = [signBoard(S, 'PESCE FRESCO', new THREE.Vector3(-8, QUAY_Y + 3.1, TERRACE.z0 - 0.62), 3.6, 0.7, Math.PI, { bg: '#2f6f8a', fg: '#f4f1ea' }),
    signBoard(S, 'GELATERIA', new THREE.Vector3(8.5, QUAY_Y + 3.1, TERRACE.z0 - 0.62), 3.2, 0.7, Math.PI, { bg: '#f4f1ea', fg: '#e8466a' }),
    signBoard(S, 'SPRITZ 6 · CAFFÈ 1,5|GELATO 3', new THREE.Vector3(1.6, TERRACE.y + TERRACE.deckH + 0.9, TERRACE.deckZ + 0.4), 1.0, 0.7, Math.PI, { bg: '#1f2a24', fg: '#f4f1ea', weight: 600 })];
  // boats: gozzi moored bow-out along both promenades and the head quay, a few at anchor; they bob on the ocean's own waves
  const hullG = boatGeometry(), nB = o.boats ?? 46, BOATS = [], HC = [0x2f6fb8, 0xd2402e, 0xf2c53a, 0x2fa8a8, 0xf4f1ea, 0x24345a, 0x3f8a4a, 0xf08a2a];
  for (let i = 0; i < nB; i++) { const k = R(); let x, z, yaw;
    if (k < 0.25) { x = -50 + R() * 100; z = QUAY_Z - 5.2; yaw = 0; }
    else if (k < 0.85) { const side = R() < 0.5 ? -1 : 1; z = -60 - R() * 560; if (side > 0 && Math.abs(z - FERRY.z) < 48) z -= 100; const X = side < 0 ? xW : xE; x = X(z) - side * 5; yaw = side < 0 ? -Math.PI / 2 : Math.PI / 2; }
    else { x = (R() - 0.5) * 80; z = -400 - R() * 500; if (Math.abs(z - MOLE.z) < 20) z -= 40; yaw = R() * 6.28; }
    BOATS.push({ x, z, yaw: yaw + (R() - 0.5) * 0.12, s: 0.8 + R() * 0.45, col: HC[Math.floor(R() * HC.length)], ph: R() * 6.28 }); }
  const boatM = new THREE.InstancedMesh(hullG, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, side: THREE.DoubleSide }), BOATS.length);
  { const c = new THREE.Color(); BOATS.forEach((b, i) => boatM.setColorAt(i, c.set(b.col))); boatM.castShadow = true; boatM.receiveShadow = true; S.scene.add(boatM); }
  W.boats = BOATS; W.boatM = boatM;
  // townsfolk
  const people = [], put = (x, z, y, yaw, pose) => { if (away(x, z)) people.push({ x, z, y, yaw, pose }); };
  const want = o.spots ?? Object.keys(SPOTS), k = o.people ?? 1;
  for (const name of want) { const [x0, x1, z0, z1, y, n, side] = SPOTS[name];
    for (let i = 0; i < Math.round(n * k); i++) {
      if (side) { const z = z0 + (z1 - z0) * R(), X = side === 'W' ? xW : xE, x = X(z) + (side === 'W' ? -1 : 1) * (1.2 + R() * 7.5); put(x, z, y, R() < 0.5 ? (side === 'W' ? Math.PI / 2 : -Math.PI / 2) : R() * 6.28); }
      else put(x0 + (x1 - x0) * R(), z0 + (z1 - z0) * R(), y, R() * 6.28); } }
  W.folk = townsfolk(S, people, { seed: o.seed ?? 9 }); W.people = people;
  // gulls and kites (over the mole)
  W.birds = createBirds(S, 30, { flap: 8, seed: 5, color: 0xe9e6de });
  const kites = []; { const KC = [[0xd2402e, 0xf2c53a], [0x2fa8a8, 0xf4f1ea], [0xe86aa0, 0x24345a]];
    KC.forEach(([a, b], i) => { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, 0.9); sh.lineTo(0.55, 0); sh.lineTo(0, -1.1); sh.lineTo(-0.55, 0); sh.lineTo(0, 0.9);
      g.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), M(a, { x: { side: THREE.DoubleSide } })));
      for (let t = 0; t < 5; t++) addBox(g, 0.18, 0.12, 0.02, M(t % 2 ? a : b), 0, -1.3 - t * 0.35, 0);
      g.scale.setScalar(1.6); S.scene.add(g); kites.push({ g, x: -60 + i * 22, z: MOLE.z - 10 - i * 6, y: 28 + i * 6, ph: i * 2.1 }); }); }
  W.kites = kites;
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  W.update = (film, st = {}) => {
    const t = film + 4, amp = o.waveAmp ?? 0.28;
    W.sky.U.sunDir.value.copy(SUN);
    ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
    BOATS.forEach((b, i) => { const P = st.boatPose && st.boatPose(b, i, film);
      if (P === null) { boatM.setMatrixAt(i, _m4.makeScale(0, 0, 0)); return; }
      if (P) { boatM.setMatrixAt(i, _m4.compose(P.p, P.q, _s.setScalar(b.s))); return; }
      const y = waveHeight(b.x, b.z, t, amp, 0) - 0.35; _e.set(0.04 * Math.sin(t * 1.3 + b.ph), b.yaw, 0.06 * Math.sin(t * 1.1 + b.ph * 2), 'YXZ');
      boatM.setMatrixAt(i, _m4.compose(_v.set(b.x, y, b.z), _q.setFromEuler(_e), _s.setScalar(b.s))); });
    boatM.instanceMatrix.needsUpdate = true;
    W.folk.update(t, { agitation: st.agitation ?? 0.2, hat: st.hat });
    W.birds.update(t, st.birdPath ?? ((x) => new THREE.Vector3(-30 + Math.sin(x * 0.21) * 60, 38 + Math.sin(x) * 4, -260 + Math.cos(x * 0.17) * 80)), 14, 1.2);
    kites.forEach((kt) => { kt.g.position.set(kt.x + 1.5 * Math.sin(t * 0.7 + kt.ph), kt.y + 1.2 * Math.sin(t * 0.9 + kt.ph), kt.z); kt.g.rotation.set(0.1 * Math.sin(t * 1.3 + kt.ph), Math.PI, 0.25 * Math.sin(t * 0.8 + kt.ph)); });
    L.update(S, t, st.focus ?? S.camera.position.clone().setY(0), st.box);
  };
  return W;
}

// ================================================================= CAMERA HELPERS
export const designDir = (cam, x, y) => new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
export function toDesign(cam, p) { const v = p.clone().project(cam); if (v.z > 1) return null; return [(v.x + 1) * 270, (1 - v.y) * 480]; }
// type zones (design px): counter block (x 50-300, y 370-500), caption band (y 550-640, x 100-440), title (y 120-260; s01/s12)
export function inTypeZone(cam, p, title = false) { const d = toDesign(cam, p); if (!d) return false; const [x, y] = d;
  return (x < 300 && y > 370 && y < 500) || (y > 550 && y < 640 && x > 100 && x < 440) || (title && y > 120 && y < 260 && x > 60 && x < 480); }
export const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
export function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
