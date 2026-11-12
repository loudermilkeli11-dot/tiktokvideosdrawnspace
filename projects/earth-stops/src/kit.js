// earth-stops SHARED KIT (lead-owned; Builders import it, NEVER edit it). One look for the whole film (channel/references/LOOK.md):
//   look:   ONE golden afternoon sun from the WEST (screen-left in every ground set: long shadows point east = screen-right, the
//           way everything flies), warm haze, a warm grade, matte stylised low-poly materials (stylise), daywear palette.
//   sets:   cityWorld (the hero plaza: s01-s04, s09), bayWorld (the bay town: s05, s06), orbit helpers (s07, s08).
//   the event (all closed form in EVENT time e = story.ev(shot, tt); deterministic, safe for motion-blur sub-samples):
//           cityWorld.update(film, {...}) flings every loose car, prop, person, the hero, the fountain water and the leaves
//           east at V; trees strip and lean; createChips = low-poly debris (leaves, paper, glass, umbrella panels, shingles);
//           createDust = the thin crisp-edged tan dust sheet (NOT smoke).
//   frame:  balcony() = the foreground railing (LOOK rule 2). FRAME1_CAM / HERO_POS (s01 frame 0 == s09 last frame + 1/30 s).
//   helpers: poseCars / carQ, designDir / toDesign / inTypeZone / lookDir, dirLL / aimFor.
// East = +X in every ground set; the ground cameras look north (-Z), so east is screen-RIGHT. Nothing goes up or west.
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity, PERIOD, SL } from '@engine/city.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH as bayGround } from '@engine/bay.js';
import { lensFov } from '@engine/camera.js';
import { rng } from '@engine/util.js';
import { NOISE } from '@engine/glsl.js';
import { V, evAt, T_STOP, T_RESTORE, drift, hop, roll, leafLeft, lean, LEAF_E, SHUTTER_E } from './story.js';
export { PERIOD, SL };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ================================================================= LOOK
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a, 0x4e8f3a, 0xe8d24a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22, 0x7a2e2e);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a, 0x3a3a3a);
// ONE sun for every ground set: late afternoon, 28° high, from the west-south-west (screen-left, a little behind a north-looking camera)
// v4 (Commander 11-12 fix #3, golden light): the sun drops to ~19° (longer, visible shadows), warmer and a touch stronger;
// a deeper blue zenith over a warm golden horizon band; warmer haze; a gentle warm grade. Still full daylight.
export const SUN = new THREE.Vector3(-0.84, 0.33, 0.43).normalize();
export const SUN_COL = 0xffc683, SUN_I = 4.1;
export const SKY = { zen: 0x2f7ee6, hor: 0xead8a2, altI: 1.0 };   // zen must stay bright in LINEAR or the gold mixes it to lavender          // deep blue overhead, a warm golden band at the horizon (yellow-gold: a redder one blends to pink)
export const HAZE = { col: 0xeed3a0, near: 260, far: 5200 };    // distance haze (linear fog): towers soften, the skyline glows gold
export const HEMI = { sky: 0x9ab8e8, ground: 0x9a7650, i: 0.85 };
// warm grade (lift/gain) on top of ACES; dust shots push it to amber with gradeDust()
export const POST_DAY = { exposure: 1.02, bloom: 0.14, bloomThreshold: 1.8, bloomRadius: 0.6, vignette: 0.3, grain: 0.014, ca: 0.0008, sat: 1.14, contrast: 1.07, lift: [0.018, 0.012, 0.0], gain: [1.05, 1.01, 0.89] };
export const POST_ORBIT = { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.02, ca: 0.0006, sat: 1.1, contrast: 1.05, lift: [0.01, 0.006, 0.0], gain: [1.03, 1.0, 0.94] };
// k 0..1: how much tan dust is in the air (story: ramps with e). Call each frame after createStudio: gradeDust(S, k).
export function gradeDust(S, k) { const p = S.post.p; p.gain = [1.05 + 0.03 * k, 1.01 - 0.01 * k, 0.89 - 0.10 * k]; p.lift = [0.018 + 0.010 * k, 0.012 + 0.010 * k, 0.0]; p.sat = 1.14 - 0.12 * k; p.contrast = 1.07 - 0.04 * k; }
export const COL = { heroTop: 0xd9a21b /* mustard */, heroBot: 0x22252c, heroBag: 0x2b2f36, heroHair: 0x2a1d14, rail: 0x6a3222, railDark: 0x3c1c14, dust: 0x8f5c30 };   // dust: ochre, darker than the paving so it reads
// motion-blur samples (brief §6): 12 fast, 8 moving, 4 calm. s09 = s01's pre-stop value so the loop frames match.
export const SAMPLES = { s01_pre: 4, s01_plaza: 12, s02_street: 12, s03_towers: 8, s04_river: 8, s05_bay: 8, s06_town: 8, s07_coast: 4, s08_earth: 4, s09_loop: 4 };

// ---------------------------------------------------------------- stylise: ONE matte low-poly family (no glossy photoreal)
// Facets on everything solid, matte paint, pale stylised glass with light mullions, faceted tree crowns. People stay smooth
// (surface nets at 1.8 cm facet into noise). Call once after createCity / createBay.
export function styliseMat(m, o = {}) {
  if (!m || !m.isMeshStandardMaterial) return m;
  m.flatShading = true; m.roughness = Math.max(m.roughness, o.rough ?? 0.6); m.metalness = Math.min(m.metalness, o.metal ?? 0.12);
  m.envMapIntensity = o.env ?? 0.55; m.needsUpdate = true; return m;
}
export function styliseCity(C) {
  const bMesh = C.group.children.find((m) => m.isInstancedMesh && m.count === C.buildings.length);
  if (bMesh) { const bm = bMesh.material, prev = bm.onBeforeCompile;
    bm.onBeforeCompile = (sh, r) => { prev(sh, r);
      sh.fragmentShader = sh.fragmentShader
        .replace('vec3(0.20,0.32,0.38), vec3(0.28,0.36,0.30)', 'vec3(0.40,0.56,0.66), vec3(0.47,0.60,0.62)')          // pale stylised glass
        .replace('vec3 wall = vGlass > 0.5 ? vec3(0.12,0.13,0.14) : stone;', 'vec3 wall = vGlass > 0.5 ? vec3(0.78,0.74,0.68) : stone;')   // light mullions
        .replace('vec3(0.05,0.06,0.07), glassT', 'vec3(0.20,0.26,0.32), glassT')
        .replace('roughnessFactor = mix(0.85, 0.08, glassy);', 'roughnessFactor = mix(0.9, 0.32, glassy);')
        .replace('metalnessFactor = mix(0.0, 0.85,', 'metalnessFactor = mix(0.0, 0.2,'); };
    bm.customProgramCacheKey = () => 'es-stylised-buildings'; bm.flatShading = true; bm.envMapIntensity = 0.6; bm.needsUpdate = true; }
  styliseMat(C.bodyM.material, { rough: 0.5, metal: 0.05 });
  C.cabM.material.color.set(0x34495c); styliseMat(C.cabM.material, { rough: 0.3, metal: 0.1, env: 0.8 });
  C.propMs.forEach((m) => styliseMat(m.material));
  C.group.children.forEach((m) => { if (m.isInstancedMesh && m.count === C.trees.length) styliseMat(m.material, { rough: 0.85 }); });
  C.group.children.forEach((m) => { if (m.isInstancedMesh && m.geometry.type === 'CylinderGeometry' && m.count !== C.trees.length && m !== C.whM) styliseMat(m.material, { rough: 0.6, metal: 0.1 }); });
  // faceted crowns (same lumpy shape as city.js, 80 faces instead of 20k) in bright stylised greens
  const can = C.group.children.find((m) => m.isInstancedMesh && m.count === C.trees.length && m.geometry.attributes.position.count > 1000);
  if (can) { let g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.18 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.sin(v.z * 3.7 + 1.1); p.setXYZ(i, v.x * k * 2.6, v.y * k * 2.2 + 5.6, v.z * k * 2.6); }
    g = g.toNonIndexed(); g.computeVertexNormals(); can.geometry = g;
    C.trees.forEach((t, i) => can.setColorAt(i, new THREE.Color().setHSL(0.25 + 0.06 * t.seed, 0.5 + 0.15 * t.seed, 0.30 + 0.08 * t.seed))); can.instanceColor.needsUpdate = true; }
  return C;
}

// skyline: cap building heights by distance from the plaza so the hero view has sky, a stepped skyline and hazed towers
// behind (the city's centre towers otherwise wall off the whole frame). o: { h0 38 (m at the plaza), k 0.75 (m per m beyond
// r0), r0 130, keep: [indices] (never capped, e.g. s03's hero towers) }. Updates matrices + the window-pattern sizes.
export function skyline(C, o = {}) {
  const bMesh = C.group.children.find((m) => m.isInstancedMesh && m.count === C.buildings.length); if (!bMesh) return;
  const aSize = bMesh.geometry.attributes.aSize, keep = new Set(o.keep ?? []), m4 = new THREE.Matrix4();
  C.buildings.forEach((b, i) => { if (keep.has(i)) return; const d = Math.hypot(b.x, b.z);
    const cap = (o.h0 ?? 20) + Math.max(0, d - (o.r0 ?? 190)) * (o.k ?? 0.55) + 22 * b.seed;
    if (b.h > cap) { b.h = cap; m4.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d)); bMesh.setMatrixAt(i, m4); aSize.setY(i, b.h); } });
  bMesh.instanceMatrix.needsUpdate = true; aSize.needsUpdate = true;
}

// ---------------------------------------------------------------- lights (sky + golden sun + hemi + haze), every ground set
export function dayLights(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.55);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY.zen); sky.U.dayHor.value.set(o.hor ?? SKY.hor);
  if (sky.U.altI) sky.U.altI.value = SKY.altI;                    // v4: blue climbs faster + a thin golden band hugging the horizon
  const sun = new THREE.DirectionalLight(SUN_COL, o.sunI ?? SUN_I); sun.castShadow = !!o.shadows; sun.shadow.mapSize.set(o.map ?? 2048, o.map ?? 2048);
  const b = o.box ?? 90;
  Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 10, far: o.far ?? 2500 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(HEMI.sky, HEMI.ground, o.hemiI ?? HEMI.i); scene.add(hemi);
  if (o.fog !== false) scene.fog = new THREE.Fog(o.fogCol ?? HAZE.col, o.fog0 ?? HAZE.near, o.fog1 ?? HAZE.far);
  return { sky, sun, hemi,
    update(S, t, focus = new THREE.Vector3(), box) {
      if (box) { const c = sun.shadow.camera; if (c.right !== box) { Object.assign(c, { left: -box, right: box, top: box, bottom: -box }); c.updateProjectionMatrix(); } }
      sun.position.copy(SUN).multiplyScalar(Math.max(800, (box ?? b) * 4)).add(focus); sun.target.position.copy(focus);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    } };
}

// ---------------------------------------------------------------- car placement (any pose)
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3(), _q = new THREE.Quaternion();
export const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
export function poseCars(C, getPose) {
  C.cars.forEach((c, i) => {
    const P = getPose(c, i);
    if (!P) { C.bodyM.setMatrixAt(i, ZERO_M); C.cabM.setMatrixAt(i, ZERO_M); for (let k = 0; k < 4; k++) C.whM.setMatrixAt(i * 4 + k, ZERO_M); return; }
    const { p, q } = P;
    _m.compose(_v.copy(p).add(_o.set(0, 0.32, 0).applyQuaternion(q)), q, _s.set(c.W, c.H * 0.55, c.L)); C.bodyM.setMatrixAt(i, _m);
    _m.compose(_v.copy(p).add(_o.set(0, 0.32 + c.H * 0.55, -c.L * 0.06).applyQuaternion(q)), q, _s.set(c.W * 0.86, c.H * 0.45, c.L * 0.5)); C.cabM.setMatrixAt(i, _m);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], k) => { _m.compose(_v.copy(p).add(_o.set(sx * c.W * 0.45, 0.34, sz * c.L * 0.33).applyQuaternion(q)), q, _s.set(1, 1, 1)); C.whM.setMatrixAt(i * 4 + k, _m); });
  });
  C.bodyM.instanceMatrix.needsUpdate = C.cabM.instanceMatrix.needsUpdate = C.whM.instanceMatrix.needsUpdate = true;
}
export const carQ = (yaw, rx = 0, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz, 'YXZ'));   // yaw 0 = nose +Z
const ZAX = new THREE.Vector3(0, 0, 1);
// rolling east: rotation about world -Z by angle a (rad), applied after the object's own orientation
export const rollQ = (a, q0) => new THREE.Quaternion().setFromAxisAngle(ZAX, -a).multiply(q0);
export const wrapX = (x, span = 7 * PERIOD) => ((x + span / 2) % span + span) % span - span / 2;

// ---------------------------------------------------------------- the hero (s01, s09; tumbles away east at the stop)
export function makeHero(S, o = {}) {
  const hero = createHero(S, { hair: 'short', coat: 0.32, bag: 'backpack', top: COL.heroTop, bot: COL.heroBot, hairCol: COL.heroHair, bagCol: COL.heroBag, height: 1.74, fem: 0.2, pose: o.pose ?? 'pocket', rimI: 0.3 });
  hero.phone.visible = false; return hero;
}

// ---------------------------------------------------------------- camera helpers
export const designDir = (cam, x, y) => new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
export function toDesign(cam, p) { const v = p.clone().project(cam); if (v.z > 1) return null; return [(v.x + 1) * 270, (1 - v.y) * 480]; }
// type zones (design px): counter block (x 50-300, y 370-500), caption band (y 550-640), title (y 120-300, s01/s09 only)
export function inTypeZone(cam, p, title = false) { const d = toDesign(cam, p); if (!d) return false; const [x, y] = d;
  return (x < 300 && y > 370 && y < 500) || (y > 550 && y < 640 && x > 100 && x < 440) || (title && y > 120 && y < 300 && x > 60 && x < 480); }
export const lookDir = (pos, yawDeg, pitchDeg) => pos.clone().add(new THREE.Vector3(Math.sin(yawDeg * D2R) * Math.cos(pitchDeg * D2R), Math.sin(pitchDeg * D2R), -Math.cos(yawDeg * D2R) * Math.cos(pitchDeg * D2R)));

// ================================================================= FOREGROUND FRAME: the balcony railing (LOOK rule 2)
// A painted wooden balcony rail across the bottom of the frame, d m ahead of the camera, its top h m below the eye.
// o: { d 1.1, h 0.45, len 7, yaw (deg, the facing; default from cam.look), col, floor true (slab edge under it) }
export function balcony(S, cam, o = {}) {
  const g = new THREE.Group(), d = o.d ?? 1.8, h = o.h ?? 0.95, len = o.len ?? 9;
  const mat = styliseMat(new THREE.MeshStandardMaterial({ color: o.col ?? COL.rail, roughness: 0.8 }), { rough: 0.8 });
  const dark = styliseMat(new THREE.MeshStandardMaterial({ color: COL.railDark, roughness: 0.9 }), { rough: 0.9 });
  const box = (w, hh, dd, x, y, z, m = mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); };
  box(len, 0.06, 0.09, 0, 0, 0); box(len, 0.04, 0.05, 0, -0.86, 0);                                       // top and bottom rails
  for (let x = -len / 2; x <= len / 2 + 1e-6; x += 0.13) box(0.025, 0.84, 0.025, x, -0.44, 0, dark);     // balusters
  for (let x = -len / 2; x <= len / 2 + 1e-6; x += 1.8) box(0.07, 0.98, 0.07, x, -0.47, 0);              // posts
  if (o.floor !== false) box(len, 0.12, 0.5, 0, -0.95, 0.1, styliseMat(new THREE.MeshStandardMaterial({ color: 0xb9ab98 })));
  const yaw = o.yaw != null ? o.yaw * D2R : Math.atan2(cam.look.x - cam.pos.x, -(cam.look.z - cam.pos.z));
  const f = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  g.position.copy(cam.pos).addScaledVector(f, d); g.position.y = cam.pos.y - h; g.rotation.y = -yaw;
  S.scene.add(g); return g;
}

// ================================================================= LOW-POLY DEBRIS: createChips (closed form in event time e)
// list: [{ p: [x, y, z] (where it lets go), t0 (e at release), size (m), col (hex), kind 0 leaf/paper (flutter), 1 glass
//          (glints), 2 heavy (panels, shingles, signs: tumbles, drops to the ground and skids), shape 0 tetra / 1 flat card }]
// It sits at p before t0 if o.rest (e.g. umbrella panels) else is hidden. After release: x = p.x + V·(e - t0) (wraps inside
// o.wrap = [x0, x1] for an endless upwind stream), real gravity in e with a floor at 0.03 m, flutter in y/z, tumble.
// update(e). Cheap: one InstancedMesh, positions on the GPU.
export function createChips(S, list, o = {}) {
  const N = list.length, card = new THREE.PlaneGeometry(1, 0.7), tet = new THREE.TetrahedronGeometry(0.6);
  const mk = (base) => { const g = new THREE.InstancedBufferGeometry(); const b = base.index ? base.toNonIndexed() : base; b.computeVertexNormals();
    g.setAttribute('position', b.attributes.position); g.setAttribute('normal', b.attributes.normal); return g; };
  // v4: shape 2 = steel beam (long thin box), 3 = concrete slab (thick block); only built when a list uses them
  const GEOS = [tet, card, new THREE.BoxGeometry(1.6, 0.16, 0.16), new THREE.BoxGeometry(1.0, 0.32, 0.75)];
  const groups = [0, 1, 2, 3].map((shape) => list.filter((c) => (c.shape ?? 0) === shape));
  const U = { e: { value: 0 }, V: { value: V }, wrap: { value: new THREE.Vector3(o.wrap?.[0] ?? 0, o.wrap?.[1] ?? 0, o.wrap ? 1 : 0) }, rest: { value: o.rest ? 1 : 0 },
    sunDir: { value: SUN.clone() }, sunCol: { value: new THREE.Color(SUN_COL).multiplyScalar(o.sunI ?? 1.6) }, skyCol: { value: new THREE.Color(HEMI.sky).multiplyScalar(0.55) },
    gndCol: { value: new THREE.Color(HEMI.ground).multiplyScalar(0.45) }, fogCol: { value: new THREE.Color(HAZE.col) }, fogN: { value: o.fogNear ?? HAZE.near }, fogF: { value: o.fogFar ?? HAZE.far },
    grav: { value: o.gravity ?? 9.81 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aP; attribute vec4 aS; attribute vec3 aC; uniform float e, V, rest, grav; uniform vec3 wrap;
      varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vW; varying float vSeed;
      mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
        return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }
      void main(){ float age = e - aP.w, sz = aS.x, sd = aS.y, kind = aS.z; vC = aC; vK = kind; vSeed = sd;
        if (age < 0. && rest < 0.5) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float a = max(age, 0.);
        vec3 p = aP.xyz; p.x += V*a;
        if (wrap.z > 0.5) p.x = wrap.x + mod(p.x - wrap.x, wrap.y - wrap.x);
        float fl = kind < 0.5 ? 1. : kind < 1.5 ? 0.5 : 0.25;                       // flutter: leaves most, heavy least
        float g = kind < 0.5 ? grav*0.18 : kind < 1.5 ? grav*0.6 : grav;             // leaves ride the flow, heavy parts fall
        p.y += fl*0.9*sin(a*(5. + 7.*sd) + sd*6.28)*min(1., a/0.04) - 0.5*g*a*a;
        p.z += fl*1.2*sin(a*(3. + 4.*sd) + sd*17.)*min(1., a/0.06);
        p.y = max(p.y, 0.03 + sz*0.2);
        vec3 spin = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), -(2.0 + 4.0*fract(sd*3.7)))*a*(kind < 0.5 ? 9. : kind < 1.5 ? 5. : 3.)
                    + vec3(sd*6.28, fract(sd*5.1)*6.28, fract(sd*9.7)*6.28);
        mat3 R = rot(spin); vec3 lp = R*(position*sz); vN = normalize(R*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
      varying vec3 vN; varying vec3 vC; varying float vK; varying vec3 vW; varying float vSeed;
      void main(){ vec3 n = normalize(vN); vec3 Vd = normalize(cameraPosition - vW); if (dot(n, Vd) < 0.) n = -n;
        float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5);
        vec3 col = vC*(sunCol*dif + amb);
        if (vK > 0.5 && vK < 1.5) { vec3 h = normalize(sunDir + Vd); col += sunCol*pow(max(dot(n, h), 0.), 60.)*1.4 + vec3(0.25, 0.32, 0.4)*0.3; }   // glass glint
        float d = length(cameraPosition - vW); col = mix(col, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.));
        gl_FragColor = vec4(col, 1.); }` });
  const meshes = groups.map((L, shape) => { if (!L.length) return null;
    const g = mk(GEOS[shape]), aP = new Float32Array(L.length * 4), aS = new Float32Array(L.length * 4), aC = new Float32Array(L.length * 3), c = new THREE.Color();
    L.forEach((q, i) => { aP.set([q.p[0], q.p[1], q.p[2], q.t0 ?? 0], i * 4); aS.set([q.size ?? 0.2, q.seed ?? ((i * 0.6180339) % 1), q.kind ?? 0, 0], i * 4); c.set(q.col ?? 0x8a8a80); c.toArray(aC, i * 3); });
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3));
    g.instanceCount = L.length; const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.castShadow = false; S.scene.add(m); return m; }).filter(Boolean);
  return { meshes, U, update(e) { U.e.value = e; } };
}

// ================================================================= THE DUST SHEET: createDust (thin, crisp-edged, tan; NOT smoke)
// Vertical sheets (facing +Z, the north-looking cameras) of tan grit whipped off the ground. A ragged but CRISP top edge, long
// streaks along x that slide east at V·e, lit by the sun. layers: [{ x0, x1, z, h (max height m), op (0..1) }].
// update(e, amt 0..1) (amt: how much dust has been lifted; default 1 - exp(-e/0.25)).
export function createDust(S, layers, o = {}) {
  const U = { e: { value: 0 }, V: { value: V }, amt: { value: 0 }, col: { value: new THREE.Color(o.col ?? COL.dust) }, sunCol: { value: new THREE.Color(SUN_COL) },
    fogCol: { value: new THREE.Color(HAZE.col) }, fogN: { value: HAZE.near }, fogF: { value: HAZE.far } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${NOISE} uniform float e, V, amt, fogN, fogF, H, OP, SEED; uniform vec3 col, sunCol, fogCol; varying vec3 vW; varying vec2 vUv;
      void main(){ float x = vW.x - V*e;                                             // the pattern rides the flow east
        float edge = H*amt*(0.45 + 0.55*clamp(0.5 + 0.6*fbm2(vec2(x*0.011, SEED)), 0., 1.));
        float a = 1. - smoothstep(edge - 0.35, edge + 0.05, vW.y);                      // crisp top edge
        float st = fbm2(vec2(x*0.018, vW.y*0.22 + SEED*3.));                            // streaks stretched along the flow
        float dens = clamp(0.55 + 0.6*st, 0., 1.)*(0.75 + 0.25*smoothstep(0., edge, edge - vW.y));
        float side = smoothstep(0., 0.08, vUv.x)*(1. - smoothstep(0.92, 1., vUv.x));   // (smoothstep needs edge0 < edge1)
        a *= min(1., dens*1.5)*side*OP*amt;
        vec3 c = col*(0.62 + 0.5*clamp(vW.y/max(edge, 0.5), 0., 1.))*mix(vec3(1.), sunCol, 0.35);
        float d = length(cameraPosition - vW); c = mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.));
        gl_FragColor = vec4(c, clamp(a, 0., 0.92)); }` });
  const meshes = layers.map((L, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L.x1 - L.x0, L.h * 1.2), mat.clone());
    m.material.uniforms = { ...U, H: { value: L.h }, OP: { value: L.op ?? 0.8 }, SEED: { value: i * 3.17 + 1 } };
    m.position.set((L.x0 + L.x1) / 2, L.h * 0.6, L.z); m.renderOrder = 20 + i; S.scene.add(m); return m; });
  return { meshes, U, update(e, amt) { U.e.value = e; U.amt.value = amt ?? 1 - Math.exp(-Math.max(0, e) / 0.15); } };
}

// ================================================================= SET 1: the hero plaza (s01, s02, s03, s04, s09)
// city.js grid: plaza paving |x|,|z| < 48, fountain r 6.2 at the origin; street centre lines at SL(k) = ±60, ±180 ...
// The hero vantage (FRAME1_CAM): a 2nd-floor balcony over the south street (z 64), looking north across the plaza at the
// towers. East (+X) = screen-right. The hero stands on the south edge of the paving, 26 m ahead, back to us.
// o: { seed, shadows, box, keepOut: [[x, z, r]], clearTrees: [[x, z, r]], people 240, leaves: { x, z, r, per } (leaf chips from
//      the trees in that circle), cars, blocks }
// update(film, st): film = film time (s). Everything (traffic, sway, the stop, the fling) is a function of film time only:
//   pre-stop the world lives (traffic, crowd sway, fountain jet); from T_STOP every loose thing goes east at V (story.drift),
//   wrapping cars/props through the 7-block city so the upwind stream never ends. st: { focus, box, agitation, carPose(c,i,e),
//   noFling (freeze at e = 0) }
export const FRAME1_CAM = { pos: new THREE.Vector3(qn('cx', -2), qn('cy', 7.5), qn('cz', 64)), look: new THREE.Vector3(qn('lx', 4), qn('ly', 0), qn('lz', -40)), mm: qn('mm', 32), roll: 0 };
export const HERO_POS = new THREE.Vector3(qn('hx', 1.5), 0, qn('hz', 38)), HERO_YAW = 4 * D2R;
export const KEEP_F1 = [[FRAME1_CAM.pos.x, FRAME1_CAM.pos.z, 12], [HERO_POS.x, HERO_POS.z, 3]];
// trees on the view line (street row z 49.6 and the plaza ring's south arc), so the plaza reads; the rest stay as framing
export const TREES_F1 = [[-2, 49.6, 17], [0, 34, 14]];
export function cityWorld(S, o = {}) {
  const L = dayLights(S, { shadows: o.shadows ?? true, box: o.box ?? 90 });
  const C = createCity(S, { blocks: o.blocks ?? 3, seed: o.seed ?? 11, cars: o.cars ?? 170 });
  styliseCity(C);
  if (o.skyline !== false) skyline(C, o.skyline ?? {});
  const keep = o.keepOut ?? KEEP_F1, away = (x, z, m = 0) => !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + m);
  const R = rng(31), people = [];
  for (let i = 0; i < 4000 && people.length < (o.people ?? 240); i++) {
    const a = R() * Math.PI * 2, r = 8 + Math.pow(R(), 0.6) * 38, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > PERIOD / 2 - 13 || Math.abs(z) > PERIOD / 2 - 13 || !away(x, z)) continue;
    people.push({ x, z, y: 0, yaw: R() * 6.28 });
  }
  for (let i = 0; i < 90; i++) { const side = R() < 0.5 ? -1 : 1, alongX = R() < 0.5; const u = (R() - 0.5) * 300, v = SL(alongX ? -1 : 0) + side * (8.6 + R() * 2.4);
    const x = alongX ? u : v, z = alongX ? v : u; if (!away(x, z)) continue;
    people.push({ x, z, y: 0, yaw: alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI) }); }
  const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'filming', 'pocket', 'stand'], rimI: 0.25, seed: 9 });
  crowd.phones.forEach((ph) => { ph.visible = false; });
  crowd.meshes.forEach((m) => m.userData.list.forEach((p, i) => { p.x0 = p.x; p.z0 = p.z; p.sd = (i * 0.37 + p.seed) % 1; }));
  const hero = makeHero(S); hero.root.position.copy(HERO_POS); hero.root.rotation.y = HERO_YAW;
  const birds = createBirds(S, 22, { flap: 10, seed: 5, color: 0x4a505c });
  C.cars.forEach((c, i) => { const r = rng(100 + i); c.sd = r(); c.x0 = c.x; c.z0 = c.z; });
  C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = -1 - r() * 2; p.ry = (r() - 0.5) * 2; p.x0 = p.x; p.sd = r(); if (!away(p.x, p.z, 3)) p.y = -60; p.y0 = p.y; });
  const treeMs = C.group.children.filter((m) => m.isInstancedMesh && m.count === C.trees.length);   // [canopy, trunk]
  const can = treeMs.find((m) => m.instanceColor), trunk = treeMs.find((m) => !m.instanceColor);
  const clear = o.clearTrees ?? TREES_F1, gone = C.trees.map((tr) => clear.some(([x, z, r]) => Math.hypot(tr.x - x, tr.z - z) < r));
  const canCol = C.trees.map((t, i) => { const c = new THREE.Color(); can.getColorAt(i, c); return c; }), BARK = new THREE.Color(0x4a3426);
  // leaves: chips born inside the canopies of the trees in o.leaves (default: around the plaza), released over LEAF_E
  let leaves = null;
  { const lf = o.leaves ?? { x: 0, z: 0, r: 160, per: 60 }, LR = rng(77), list = [];
    C.trees.forEach((tr, i) => { if (gone[i] || Math.hypot(tr.x - lf.x, tr.z - lf.z) > lf.r) return;
      for (let k = 0; k < lf.per; k++) { const a = LR() * 6.28, rr = Math.sqrt(LR()) * 2.4 * tr.s;
        list.push({ p: [tr.x + Math.cos(a) * rr, (5.6 + (LR() - 0.4) * 3.6) * tr.s, tr.z + Math.sin(a) * rr], t0: LEAF_E * Math.pow(LR(), 1.6), size: 0.16 + LR() * 0.16, shape: 1, kind: 0,
          col: new THREE.Color().setHSL(0.22 + 0.08 * LR(), 0.55, 0.3 + 0.12 * LR()).getHex() }); } });
    leaves = createChips(S, list); }
  const ND = C.drops.length;
  const W = { ...L, C, crowd, hero, birds, people, leaves, can, trunk,
    update(film, st = {}) {
      const t = film + 4, e = st.noFling ? 0 : evAt(film), dx = drift(e);
      const tr = Math.min(film, T_STOP);                                                   // traffic clock stops with the ground
      C.props.forEach((p) => { p.x = e > 0 && p.y0 > -10 ? wrapX(p.x0 + dx) : p.x0; p.y = p.y0 + (p.y0 > -10 ? hop(e, p.sd) * 0.6 : 0); });
      C.update(t, { lift: 0, tumble: roll(e, 0.5) });
      // the fountain: its jet and pool keep going east as one sheet of water + droplets
      if (e > 0) { C.disc.position.x = dx; C.disc.scale.set(1 + 2 * Math.min(1, e / 0.05), 1, Math.max(0.15, 1 - e * 6)); C.disc.visible = dx < 200;
        const ph0 = (T_STOP + 4) * 0.45;
        C.drops.forEach((d, i) => { const ph = (ph0 + d.ph) % 1, rr = 0.15 + ph * (1.2 + 2.4 * ((d.a * 7.1) % 1));
          const y0 = d.jet ? 0.6 + 7.5 * 4 * ph * (1 - ph) : 0.6, yy = Math.max(0.05, y0 - 0.5 * 9.81 * e * e);
          _m.compose(_v.set(Math.cos(d.a) * (d.jet ? rr : d.r) + dx * (0.9 + 0.1 * d.ph), yy, Math.sin(d.a) * (d.jet ? rr : d.r)), _q.identity(), _s.setScalar(d.s * (1 + 3 * Math.min(1, e / 0.05)))); C.dropM.setMatrixAt(i, _m); });
        C.dropM.instanceMatrix.needsUpdate = true; }
      else C.disc.position.x = 0, C.disc.scale.set(1, 1, 1), C.disc.visible = true;
      poseCars(C, (c, i) => {
        if (st.carPose) { const P = st.carPose(c, i, e); if (P !== undefined) return P; }
        const d = c.v * c.lane.dir * (tr + 40);
        let x = c.lane.axis === 'x' ? c.x0 + d : c.x0, z = c.lane.axis === 'z' ? c.z0 + d : c.z0;
        x = wrapX(x); z = wrapX(z);
        const q0 = carQ(c.lane.axis === 'x' ? (c.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.lane.dir > 0 ? 0 : Math.PI));
        if (e <= 0) return { p: _v.set(x, 0, z).clone(), q: q0 };
        const a = roll(e, c.sd) * 0.6, lift = 0.5 * Math.max(c.W, c.H) * Math.abs(Math.sin(a));
        return { p: new THREE.Vector3(wrapX(x + dx), hop(e, c.sd) * 0.7 + lift, z), q: rollQ(a, q0) };
      });
      // trees: crowns strip to bare wood, trunks lean east
      const lf = leafLeft(e), ln = lean(e) * D2R;
      C.trees.forEach((tq, i) => {
        if (gone[i]) { can.setMatrixAt(i, ZERO_M); trunk.setMatrixAt(i, ZERO_M); return; }
        _q.setFromAxisAngle(ZAX, -ln * (0.7 + 0.6 * tq.seed)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tq.seed * 6.28));
        _m.compose(_v.set(tq.x, 0, tq.z), _q, _s.setScalar(tq.s)); trunk.setMatrixAt(i, _m);
        _m.compose(_v.set(tq.x + (1 - lf) * 1.2, 0, tq.z), _q, _s.set(tq.s * lf, tq.s * (0.55 + 0.45 * lf), tq.s * lf)); can.setMatrixAt(i, _m);
        if (e > 0) can.setColorAt(i, _c.copy(canCol[i]).lerp(BARK, (1 - lf) / (1 - 0.22)));
      });
      can.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = true; if (e > 0) can.instanceColor.needsUpdate = true;
      // people: walk/sway before; at the stop they topple east and roll away with the flow (no wrap: they leave and are gone)
      crowd.update(t, { agitation: st.agitation ?? (e > 0 ? 0.0 : 0.22) });
      if (e > 0) crowd.meshes.forEach((m) => { m.userData.list.forEach((p, i) => {
        const a = Math.min(1.45, e / 0.035) + roll(e, p.sd) * 0.8, x = p.x0 + dx;
        if (x > 900) { m.setMatrixAt(i, ZERO_M); return; }
        _q.setFromAxisAngle(ZAX, -a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw || 0));
        _o.set(0, 0.95, 0); const piv = _o.clone().sub(_o.clone().applyQuaternion(_q));
        _m.compose(_v.set(x + piv.x, hop(e, p.sd) * 0.5 + 0.25 * Math.abs(Math.sin(a)) + piv.y, p.z0 + piv.z), _q, _s.set(1, 1, 1)); m.setMatrixAt(i, _m); });
        m.instanceMatrix.needsUpdate = true; });
      // the hero: same law as the crowd
      { const a = e > 0 ? Math.min(1.45, e / 0.035) + roll(e, 0.4) * 0.8 : 0;
        hero.root.position.set(HERO_POS.x + dx, e > 0 ? hop(e, 0.4) * 0.5 + 0.25 * Math.abs(Math.sin(a)) : 0, HERO_POS.z);
        hero.root.quaternion.setFromAxisAngle(ZAX, -a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), HERO_YAW));
        hero.root.visible = dx < 900; }
      leaves.update(e);
      birds.update(t, (x) => new THREE.Vector3(-20 + x * 7 + (e > 0 ? dx : 0), 34 + Math.sin(x) * 3, -40 + Math.sin(x * 0.7) * 10), 9, 1.0);
      L.update(S, t, st.focus ?? new THREE.Vector3(0, 0, 0), st.box);
    } };
  return W;
}
const _c = new THREE.Color();

// ================================================================= SET 2: the bay town (s05, s06), API R2 + bay.js
// The bay vantage: a hillside terrace behind the town's south shore, looking north over the town and the whole bay to the
// sea (mouth at -Z); east = screen-right, so the west half drains (left) and the east shore heaps and floods (right).
// BAY_CAM is the lead's start point (y from groundH at load); Group C owns the final framing and the sea effect.
export const BAY_CAM = { pos: new THREE.Vector3(qn('bx', 0), 0, qn('bz', 420)), up: qn('by', 70), look: new THREE.Vector3(qn('blx', 40), qn('bly', -60), qn('blz', -900)), mm: qn('bmm', 20), roll: 0 };
export function bayWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', 0.5);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY.zen); sky.U.dayHor.value.set(SKY.hor);
  scene.fog = new THREE.Fog(HAZE.col, o.fog0 ?? 900, o.fog1 ?? 16000);
  const ocean = createOcean(S, { amp: o.waveAmp ?? 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0d5a72, shallow: 0x35b0b0, amb: 0x6a98b8, reflScale: o.reflScale ?? 0.25, slab: !!o.slab });
  ocean.add(scene); ocean.U.sunCol.value.set(SUN_COL);
  const bay = createBay(S, { pierYaw: o.pierYaw ?? 3 * D2R, pierLen: 152, pierLights: 0, winI: 0, moonLightI: SUN_I, hemiI: 1.25, beamI: 0, boats: 0, shadows: !!o.shadows });
  bay.moonLight.color.set(SUN_COL); bay.hemi.color.set(HEMI.sky); bay.hemi.groundColor.set(HEMI.ground);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
  bay.group.traverse((m) => { if (m.isMesh && m.material && !Array.isArray(m.material)) styliseMat(m.material, { rough: 0.7 }); });
  return { sky, ocean, bay, ground: bayGround,
    camPos: () => { const p = BAY_CAM.pos.clone(); p.y = Math.max(bayGround(p.x, p.z), 0) + BAY_CAM.up; return p; },
    update(S, t, st = {}) {
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
      ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
      bay.update(S, t, { waveAmp: o.waveAmp ?? 0.45, level: 0, moonDir: SUN, moonLightI: SUN_I, shadowCenter: st.focus ?? S.camera.position.clone() });
    } };
}

// ================================================================= SET 3: orbit (s07, s08), API R4 (km, Earth at the origin)
export const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
export function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
// Earth's spin in the orbit shots (rad about +Y): turning at the real sidereal rate × FILM_SPIN (so it reads), frozen while
// e is inside (0, 5), turning again after T_RESTORE. Pass film time.
export const FILM_SPIN = 0.004;                              // rad per film second before the stop (only the frozen yaw depends on it)
export const RESTART_SPIN = 0.04;                            // rad per film second after T_RESTORE: 5.7° over s08's last 2.5 s, so the restart reads (phase 3, group B request 3; DRAMATIZATION of rate)
export function earthYaw(film, yaw0 = 0) { const T0 = T_STOP, T1 = T_RESTORE; return yaw0 + FILM_SPIN * Math.min(film, T0) + RESTART_SPIN * Math.max(0, film - T1); }
export { SHUTTER_E };
