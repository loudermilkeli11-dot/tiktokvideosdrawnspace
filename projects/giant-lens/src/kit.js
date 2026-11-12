// giant-lens SHARED KIT (lead-owned; Builders import it, never edit it). One look for the whole film.
//   look:    SUN (one sun for every set), palette (daywear), post presets, colours, samples per shot
//   sets:    cityWorld (noon plaza + avenues + towers: s01, s02, s03, s09), bayWorld (daylight bay, API R2: s04, s05),
//            orbit helpers (dirLL, aimFor: s08). The cloud deck (s06, s07) is API R3 with kit SUN + highSky colours.
//   the lens: lensRig(S, o) = N1 lens + N2 beam/spot, placed by the law (lens centre = spot + SUN·D, story.lensCentre)
//   frame 1:  FRAME1_CAM, HERO_POS/YAW, SPOT_F1, CAR_F1 (the parked car the s01 line burns to), frame1State(tt)
//   helpers: poseCars / carQ / tintCar (any car pose, scorched paint), camera helpers (designDir, toDesign, inTypeZone, lookDir)
// Page time t = shot time + 4. Every lens size / power / spot size comes from story.js.
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity, PERIOD, SL } from '@engine/city.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH as bayGround } from '@engine/bay.js';
import { lensFov } from '@engine/camera.js';
import { rng } from '@engine/util.js';
import { createLens, createBeam, createLensShadow } from './lens.js';
import { lensCentre, spotW, CMAX, D1, focusC, tempC } from './story.js';
export { PERIOD, SL };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ---------------------------------------------------------------- look
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a, 0x4e8f3a, 0xe8d24a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22, 0x7a2e2e);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a, 0x3a3a3a);
// ONE sun for every set: elevation 65° (noon), behind a camera that looks -Z, a little to its left. Lens axis = SUN, so the
// lens hangs 0.91·D above its spot and 0.42·D toward +Z (toward a -Z-looking camera). Ground cameras look roughly -Z (down-sun:
// front-lit, the lens hangs straight above its spot in frame, its face tilted 25° toward us so the glass reads).
export const SUN = new THREE.Vector3(-0.12, 0.906, 0.405).normalize();
export const POST_DAY = { exposure: 1.0, bloom: 0.1, bloomThreshold: 2.2, bloomRadius: 0.55, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 };
export const POST_HIGH = { exposure: 1.0, bloom: 0.12, bloomThreshold: 2.0, bloomRadius: 0.55, vignette: 0.25, grain: 0.015, ca: 0.0008, sat: 1.1, contrast: 1.05 };
export const POST_ORBIT = { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.025, ca: 0.0006, sat: 1.1, contrast: 1.05 };
export const SKY_DAY = { zen: 0x2f6fd0, hor: 0xa9cff0 };
export const SKY_HIGH = { zen: 0x0d2f86, hor: 0x8fb4e6 };                    // API R3 (s06/s07, with altI = 1, sunDisc = 1)
export const COL = { heroTop: 0x1d8a8c, heroBot: 0x22252c, heroBag: 0x2b2f36, heroHair: 0x2a1d14, char: 0x0b0806, carF1: 0x2f6fd8 };
// motion-blur samples per shot (brief §6; s09 = s01's 8 so the loop frames match)
export const SAMPLES = { s01_plaza: 8, s02_street: 12, s03_tower: 8, s04_bay: 12, s05_town: 8, s06_clouds: 8, s07_strato: 8, s08_orbit: 4, s09_loop: 8 };

// ---------------------------------------------------------------- lighting (sky + sun + hemi), every ground set
export function dayLights(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.7);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY_DAY.zen); sky.U.dayHor.value.set(o.hor ?? SKY_DAY.hor);
  const sun = new THREE.DirectionalLight(0xfff1df, o.sunI ?? 3.2); sun.castShadow = !!o.shadows; sun.shadow.mapSize.set(o.map ?? 2048, o.map ?? 2048);
  const b = o.box ?? 80;
  Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 10, far: o.far ?? 2000 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xb8d4f0, 0x8a8070, o.hemiI ?? 1.0); scene.add(hemi);
  if (o.fog !== false) scene.fog = new THREE.Fog(o.hor ?? SKY_DAY.hor, o.fog0 ?? 900, o.fog1 ?? 9000);   // distance haze only (not smoke)
  return { sky, sun, hemi,
    // focus: centre of the shadow box (put it between the spot and the lens so the lens shadow is in the box)
    update(S, t, focus = new THREE.Vector3(), box) {
      if (box) { const c = sun.shadow.camera; if (c.right !== box) { Object.assign(c, { left: -box, right: box, top: box, bottom: -box }); c.updateProjectionMatrix(); } }
      sun.position.copy(SUN).multiplyScalar(Math.max(600, (box ?? b) * 3)).add(focus); sun.target.position.copy(focus);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    } };
}

// ---------------------------------------------------------------- car placement (any pose; replaces city.update for cars)
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3();
export const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
// getPose(c, i) -> { p: Vector3 (ground contact under the car centre), q: Quaternion } or null (hidden)
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
export const roofOf = (c, p) => new THREE.Vector3(p.x, 0.32 + c.H + 0.02, p.z);                                          // roof centre (flat pose)
// scorch a car's paint: k 0 = its own colour, 1 = charred (call every frame you change it; same clock => deterministic)
const _c0 = new THREE.Color(), _c1 = new THREE.Color(COL.char);
export function tintCar(C, i, k) { _c0.set(C.cars[i].col).lerp(_c1, Math.min(1, Math.max(0, k))); C.bodyM.setColorAt(i, _c0); C.bodyM.instanceColor.needsUpdate = true; }

// ---------------------------------------------------------------- the hero (the same person in s01, s02, s05, s09)
// featureless adult from behind: teal jacket, dark trousers, backpack, one hand shielding the eyes ('shade'). Place hero.root;
// other poses: precompute at load (API pitfall 16), e.g. ['shade', 'point', 'arms'].forEach((p) => hero.setPose(p)).
export function makeHero(S, o = {}) {
  const hero = createHero(S, { hair: 'short', coat: 0.32, bag: 'backpack', top: COL.heroTop, bot: COL.heroBot, hairCol: COL.heroHair, bagCol: COL.heroBag, height: 1.74, fem: 0.2, pose: o.pose ?? 'shade', rimI: 0.3 });
  hero.phone.visible = false; return hero;
}

// ---------------------------------------------------------------- camera helpers
export const designDir = (cam, x, y) => new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
export function toDesign(cam, p) { const v = p.clone().project(cam); if (v.z > 1) return null; return [(v.x + 1) * 270, (1 - v.y) * 480]; }
// type zones: counter block (x 50-290, y 370-500), caption band (y 560-640), title (y 120-300, s01/s09 only when title = true)
export function inTypeZone(cam, p, title = false) { const d = toDesign(cam, p); if (!d) return false; const [x, y] = d;
  return (x < 290 && y > 370 && y < 500) || (y > 560 && y < 640 && x > 100 && x < 440) || (title && y > 120 && y < 300 && x > 60 && x < 480); }
export const lookDir = (pos, yawDeg, pitchDeg) => pos.clone().add(new THREE.Vector3(Math.sin(yawDeg * D2R) * Math.cos(pitchDeg * D2R), Math.sin(pitchDeg * D2R), -Math.cos(yawDeg * D2R) * Math.cos(pitchDeg * D2R)));

// ================================================================= THE LENS RIG (N1 + N2), placed by the law
// o: { sky (createSky handle, so the glass refracts this sky), space, handleAngle, shadows (shadow-map casting; our renders show
//      none), shadowDecal true (the analytic lens shadow on the surface plane through the spot), shadowDark 0.42, beamCol }
// rig.set({ spot, D, C = CMAX, n = +Y, heat 0..1, glowR, handleAngle, beamI, coreI, discI, glowI, minPx, t, visible, lensVisible,
//           shadowVisible })
//   lens centre = spot + SUN·D (story.lensCentre); spot diameter = D/√C (never below θ·D: C ≤ CMAX).
export function lensRig(S, o = {}) {
  const lens = createLens(S, { sky: o.sky, space: o.space, shadows: o.shadows ?? true, zen: o.zen, hor: o.hor, ground: o.ground, sunI: o.sunI, handle: o.handle });
  const beam = createBeam(S, { beamCol: o.beamCol });
  const shadow = o.shadowDecal === false ? null : createLensShadow(S, { dark: o.shadowDark, handle: o.handle });
  const _h = new THREE.Vector3();
  const rig = { lens, beam, shadow, centre: new THREE.Vector3(), w: 0,
    set(st) {
      const D = st.D, C = Math.min(st.C ?? CMAX, CMAX), w = spotW(D, C), sun = st.sun ?? SUN, ha = st.handleAngle ?? o.handleAngle ?? 0;
      const c = lensCentre(st.spot, sun, D); rig.centre.copy(c); rig.w = w;
      lens.set({ centre: c, axis: sun, D, handleAngle: ha, sunDir: sun });
      lens.group.visible = st.lensVisible ?? true;
      if (shadow) { _h.set(Math.cos(ha), 0, -Math.sin(ha)).applyQuaternion(lens.group.quaternion); shadow.set({ centre: c, axis: sun, D, handleDir: _h, spot: st.spot, n: st.n ?? new THREE.Vector3(0, 1, 0), sun });
        shadow.mesh.visible = (st.shadowVisible ?? true) && (st.lensVisible ?? true); }
      beam.set({ spot: st.spot, lensC: c, D, w, n: st.n, C, heat: st.heat ?? 1, glowR: st.glowR ?? Math.max(w * 2.5, D * 0.012), beamI: st.beamI, coreI: st.coreI,
        discI: st.discI, glowI: st.glowI, minPx: st.minPx, t: st.t, visible: st.visible });
      return rig;
    } };
  return rig;
}

// ================================================================= SET 1: the noon city (s01, s02, s03, s09)
// city.js grid: plaza block at the origin (paving |x|,|z| < 48, fountain r 6.2 at 0,0); street centre lines at SL(k) = ±60, ±180...
// The frame-1 view stands in the plaza's SW quarter looking NE (down-sun) toward the east street x = 60, where CAR_F1 is parked
// at the plaza kerb. o: { seed, shadows, box, keepOut: [[x, z, r]] (no people/props there), clearTrees: [[x, z, r]], people 260 }
export function cityWorld(S, o = {}) {
  const L = dayLights(S, { shadows: o.shadows ?? true, box: o.box ?? 80, fog0: 900, fog1: 9000 });
  const C = createCity(S, { blocks: o.blocks ?? 3, seed: o.seed ?? 11, cars: o.cars ?? 170 });
  const keep = o.keepOut ?? [], away = (x, z, m = 0) => !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + m);
  const R = rng(31), people = [];
  for (let i = 0; i < 4000 && people.length < (o.people ?? 260); i++) {
    const a = R() * Math.PI * 2, r = 8 + Math.pow(R(), 0.6) * 38, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > PERIOD / 2 - 13 || Math.abs(z) > PERIOD / 2 - 13 || !away(x, z)) continue;
    people.push({ x, z, y: 0, yaw: R() * 6.28 });
  }
  for (let i = 0; i < 80; i++) { const side = R() < 0.5 ? -1 : 1, alongX = R() < 0.5; const u = (R() - 0.5) * 300, v = SL(alongX ? -1 : 0) + side * (8.6 + R() * 2.4);
    const x = alongX ? u : v, z = alongX ? v : u; if (!away(x, z)) continue;
    people.push({ x, z, y: 0, yaw: alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI) }); }
  const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'filming', 'handsHead', 'stand', 'pocket', 'arms'], rimI: 0.25, seed: 9 });
  crowd.phones.forEach((ph) => { ph.visible = false; });                                    // daylight: glowing screens read as night
  const hero = makeHero(S); hero.root.position.copy(HERO_POS); hero.root.rotation.y = HERO_YAW;
  const birds = createBirds(S, 22, { flap: 10, seed: 5, color: 0x4a505c });
  C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; c.x0 = c.x; c.z0 = c.z; });
  C.props.forEach((p) => { if (!away(p.x, p.z, 3)) p.y = -60; });
  const clear = o.clearTrees ?? [];
  if (clear.length) C.group.children.filter((m) => m.isInstancedMesh && m.count === C.trees.length).forEach((M) => {
    C.trees.forEach((tr, i) => { if (clear.some(([x, z, r]) => Math.hypot(tr.x - x, tr.z - z) < r)) M.setMatrixAt(i, ZERO_M); }); M.instanceMatrix.needsUpdate = true; });
  // the parked car of frame 1 (car 0, re-posed; kerbside lane of the east street, nose north)
  const HC = C.cars[0]; Object.assign(HC, { L: 4.6, H: 1.45, W: 1.85, parked: CAR_F1 }); C.bodyM.setColorAt(0, new THREE.Color(COL.carF1)); HC.col = COL.carF1; C.bodyM.instanceColor.needsUpdate = true;
  const W = { ...L, C, crowd, hero, birds, people, HC,
    // traffic: cars drive their lanes at their speed (page t); carPose(c, i, tt) -> {p, q} | null (hidden) | undefined (default)
    update(t, st = {}) {
      const tt = t - 4;
      C.update(t, { lift: 0, tumble: 0 });                                                  // fountain + props (cars re-posed below)
      poseCars(C, (c, i) => {
        if (st.carPose) { const P = st.carPose(c, i, tt); if (P !== undefined) return P; }
        if (c.parked) return { p: c.parked.p.clone(), q: carQ(c.parked.yaw) };
        const d = c.v * c.lane.dir * (tt + 40);
        let x = c.lane.axis === 'x' ? c.x0 + d : c.x0, z = c.lane.axis === 'z' ? c.z0 + d : c.z0;
        const span = 7 * PERIOD; x = ((x + span / 2) % span + span) % span - span / 2; z = ((z + span / 2) % span + span) % span - span / 2;   // wrap: endless traffic
        if (c.lane.axis === 'z' && Math.abs(c.lane.c - SL(0)) < 8 && Math.abs(z - CAR_F1.p.z) < 9) return null;     // never through the parked car
        return { p: _v.set(x, 0, z).clone(), q: carQ(c.lane.axis === 'x' ? (c.lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.lane.dir > 0 ? 0 : Math.PI)) };
      });
      crowd.update(t, { agitation: st.agitation ?? 0.25 });
      birds.update(t, (x) => new THREE.Vector3(-20 + x * 7, 34 + Math.sin(x) * 3, -40 + Math.sin(x * 0.7) * 10), 9, 1.0);
      L.update(S, t, st.focus ?? new THREE.Vector3(20, 0, -10), st.box);
    } };
  return W;
}

// ---------------------------------------------------------------- frame 1 (s01 frame 0 == s09 last frame + 1/30 s)
// 28 mm, 5.5 m up on the plaza's south edge, behind the hero, looking north (-Z, down-sun). Spot on the paving 66 m out
// (y ≈ 540); the lens (20 m, axis = SUN) hangs above it (y ≈ 330); the fountain plays on the left; the parked blue car stands
// side-on 41 m out, right of centre: s01 drags the burn line diagonally toward us to its roof.
export const FRAME1_CAM = { pos: new THREE.Vector3(qn('cx', 14), qn('cy', 5.5), qn('cz', 46)), look: new THREE.Vector3(qn('lx', 17), qn('ly', 4.3), qn('lz', -22)), mm: qn('mm', 28), roll: 0 };
export const HERO_POS = new THREE.Vector3(13, 0, 26), HERO_YAW = -3.7 * D2R;              // 20 m ahead of the lens, facing the spot
export const SPOT_F1 = new THREE.Vector3(16, 0, -20);                                     // the spot at frame 1 (plaza paving)
export const CAR_F1 = { p: new THREE.Vector3(22, 0, 6), yaw: Math.PI / 2 };              // parked on the paving, side-on to the lens
export const HANDLE_F1 = qn('ha', 0.5);                                                   // handle angle about the lens axis (reads as "magnifying glass")
const _mid = (u) => [SPOT_F1.x + (CAR_F1.p.x - SPOT_F1.x) * u, SPOT_F1.z + (CAR_F1.p.z - SPOT_F1.z) * u];
export const KEEP_F1 = [[14, 46, 8],[SPOT_F1.x, SPOT_F1.z, 8], [..._mid(0.33), 7], [..._mid(0.66), 7], [CAR_F1.p.x, CAR_F1.p.z, 7], [HERO_POS.x, HERO_POS.z, 2.5]];
export const TREES_F1 = [[14, 34, 9], [16, -32, 9]];                                     // the near ring tree, and the one behind the spot
// lens/beam state at frame 1 for shot time tt (s01 uses tt >= 0 with its own spot path; s09 calls frame1State(0))
export function frame1State(tt, spot = SPOT_F1) {
  const C = focusC(tt), T = tempC(C);
  return { spot, D: D1, C, heat: Math.min(1, Math.max(0, (T - 300) / 2400)), glowR: 0.6 + 1.2 * Math.min(1, Math.max(0, (T - 300) / 2400)), handleAngle: HANDLE_F1, tempC: T };
}

// ================================================================= SET 2: the bay in daylight (s04, s05), API R2 + bay.js
// o: { shadows, box, waveAmp 0.45, reflScale 0.25, pierYaw }. Camera homes: beach (0, 1.7, 8) looking -Z (down-sun-ish).
export function bayWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', 0.55);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY_DAY.zen); sky.U.dayHor.value.set(0xa6cdee);
  scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
  const ocean = createOcean(S, { amp: o.waveAmp ?? 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: o.reflScale ?? 0.25 });
  ocean.add(scene); ocean.U.sunCol.value.set(0xfff4e2);
  const bay = createBay(S, { pierYaw: o.pierYaw ?? 3 * D2R, pierLen: 152, pierLights: 0, winI: 0, moonLightI: 3.0, hemiI: 1.3, beamI: 0, boats: 0, shadows: !!o.shadows });
  bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
  if (o.shadows && o.box) { const c = bay.moonLight.shadow.camera; Object.assign(c, { left: -o.box, right: o.box, top: o.box, bottom: -o.box, far: Math.max(2000, o.box * 4) }); c.updateProjectionMatrix(); }
  return { sky, ocean, bay, ground: bayGround,
    update(S, t, st = {}) {
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
      ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
      bay.update(S, t, { waveAmp: o.waveAmp ?? 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: st.focus ?? S.camera.position.clone() });
    } };
}

// ================================================================= SET 3: orbit (s08), API R4 (km, Earth at the origin)
export const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
export function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
