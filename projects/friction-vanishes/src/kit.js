// friction-vanishes SHARED KIT (lead-owned; Builders import it, never edit it). One look for the whole film.
//   sets:    crossingWorld (flat noon downtown: frame 1 + the loop), hillWorld (N1: the 10 deg hill street + quay + harbour),
//            bayWorld (daylight bay, API R2), looseCity (city cars/props with no city, for the bay streets), orbit helpers (R4)
//   helpers: poseCars / poseProps (place cars/props with any position + quaternion), slipCrowd (N5 scripted falls),
//            spinCar (straight line + constant yaw rate: no friction = no turning), camera helpers, palette, post presets.
// Page time t = shot time + 4. Story clock: tauAt(shot, tt) from story.js. Every motion comes from story.js functions.
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity, PERIOD, SL } from '@engine/city.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH as bayGround } from '@engine/bay.js';
import { lensFov } from '@engine/camera.js';
import { rng, fbm, clamp, ease } from '@engine/util.js';
import { TAN, THETA, QUAY_H, STREET_LEN, V0, brakeCarX } from './story.js';
export { PERIOD, SL };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ---------------------------------------------------------------- look
// daywear: bright, varied coats (PALETTE is read when a crowd is built, so this runs at import)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a, 0x4e8f3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22, 0x7a2e2e);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a, 0x3a3a3a);
export const SUN = new THREE.Vector3(0.55, 0.72, 0.42).normalize();          // noon-ish, from behind-right of the frame-1 camera
export const POST_DAY = { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 };
export const POST_ORBIT = { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.025, ca: 0.0006, sat: 1.1, contrast: 1.05 };
export const COL = {
  heroCoat: 0xc4232b, heroBag: 0x3a2a1e, heroCar: 0xc81e1e, brake: 0xff2a1a,
  mud: 0x5a4330, mudWet: 0x3e2d1f, sediment: 0x8a6a45, rock: 0x7d7a74, quay: 0x8d877c, sky: 0xa9cff0,
};
// motion-blur samples by shot energy (brief §6): calm 4, moving 8, fast 12
export const SAMPLES = { calm: 4, moving: 8, fast: 12 };

// ---------------------------------------------------------------- lighting (sky + sun + hemi), shared by every ground set
export function dayLights(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.7);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(o.hor ?? COL.sky);
  const sun = new THREE.DirectionalLight(0xfff1df, o.sunI ?? 3.2); sun.castShadow = !!o.shadows; sun.shadow.mapSize.set(2048, 2048);
  const b = o.box ?? 80;
  Object.assign(sun.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 10, far: 1500 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xb8d4f0, 0x8a8070, o.hemiI ?? 1.0); scene.add(hemi);
  if (o.fog !== false) scene.fog = new THREE.Fog(o.hor ?? COL.sky, o.fog0 ?? 900, o.fog1 ?? 9000);   // distance haze only (not smoke)
  return { sky, sun, hemi,
    update(S, t, focus = new THREE.Vector3()) {
      sun.position.copy(SUN).multiplyScalar(600).add(focus); sun.target.position.copy(focus);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    } };
}

// ---------------------------------------------------------------- car / prop placement (any pose; replaces city.update for them)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
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
export function poseProps(C, getPose) {
  const ki = [0, 0, 0, 0];
  C.props.forEach((p, i) => { const P = getPose(p, i); const M = C.propMs[p.kind], j = ki[p.kind]++;
    if (!P) { M.setMatrixAt(j, ZERO_M); return; } _m.compose(P.p, P.q, _s.set(1, 1, 1)); M.setMatrixAt(j, _m); });
  C.propMs.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
}
// heading quaternion: yaw (0 = nose toward +Z as city cars; car local +Z is the nose), plus tumble euler
export const carQ = (yaw, rx = 0, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz, 'YXZ'));
export const yawFor = (dx, dz) => Math.atan2(dx, dz);              // car yaw whose nose points along (dx, dz)
// no friction = no turning: a car keeps its velocity AND its yaw rate (angular momentum). omega rad/s (turning car: v / R)
export function spinCar(p0, dir, v, yaw0, omega, tau) {
  const d = Math.max(tau, 0);
  return { x: p0.x + dir.x * v * d, z: p0.z + dir.z * v * d, yaw: yaw0 + omega * d };
}
export function setCarColor(C, i, hex) { C.bodyM.setColorAt(i, new THREE.Color(hex)); C.bodyM.instanceColor.needsUpdate = true; }
// brake lights: two small emissive blocks at the rear of a car (car local -Z is the rear), shown when on > 0
export function brakeLights(S, c) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: COL.brake, emissiveIntensity: 0, roughness: 0.4 });
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.05), m); b.position.set(sx * c.W * 0.36, 0.32 + c.H * 0.42, -c.L / 2 - 0.02); g.add(b); }
  S.scene.add(g); return { group: g, set(p, q, on) { g.position.copy(p); g.quaternion.copy(q); m.emissiveIntensity = 4 * on; } };
}

// ---------------------------------------------------------------- N5: scripted slips (people lose their footing, sit down hard)
// replaces crowd.update. fallAt(p) -> story time of the slip (null = stays up); slide(p) -> [vx, vz] m/s kept after the slip
// (no friction: a walker keeps walking speed on the flat). Fall: 0.45 s, rotate back 70 deg about the waist, drop 0.5 m.
export function slipCrowd(crowd, t, tau, o = {}) {
  const ag = o.agitation ?? 0.25, fallAt = o.fallAt ?? (() => null), slide = o.slide ?? (() => null), ground = o.ground ?? (() => 0);
  const PIV = new THREE.Vector3(0, 0.95, 0), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), qx = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  const place = (p) => {
    const f = fallAt(p); const u = f == null ? 0 : ease.inCubic(clamp((tau - f) / 0.45)), arms = f == null ? 0 : clamp((tau - f) / 0.2);
    const sw = fbm(t * (0.5 + ag + arms) + p.seed * 50, 3) * (0.03 + 0.08 * ag) * (1 - u);
    qy.setFromEuler(e.set(0, (p.yaw || 0) + sw * 0.8, 0)); qx.setFromEuler(e.set(sw * 0.3 + (70 * D2R) * u, 0, sw * 0.5 + 0.15 * arms * Math.sin(p.seed * 40) * (1 - u)));
    q.copy(qy).multiply(qx);
    const off = PIV.clone().sub(PIV.clone().applyQuaternion(q));
    let x = p.x, z = p.z;
    if (p.walkV) { const yw = p.yaw || 0; x -= Math.sin(yw) * p.walkV * tau; z -= Math.cos(yw) * p.walkV * tau; }   // walking before tau 0, sliding on at the same speed after (no friction)
    const sv = f == null ? null : slide(p); if (sv && tau > f) { x += sv[0] * (tau - f); z += sv[1] * (tau - f); }
    return { x: x + off.x, y: ground(x, z) + (p.y0 ?? 0) + off.y - 0.5 * u, z: z + off.z };
  };
  for (const m of crowd.meshes) { m.userData.list.forEach((p, i) => { const P = place(p); m4.compose(_v.set(P.x, P.y, P.z), q, one); m.setMatrixAt(i, m4); }); m.instanceMatrix.needsUpdate = true; }
  for (const ph of crowd.phones) ph.visible = false;   // daylight: phones off (glowing screens read as night)
}

// ---------------------------------------------------------------- camera helpers
// world direction through a design pixel (540x960); call after applyCam
export const designDir = (cam, x, y) => new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
// design-pixel position of a world point (null if behind the camera)
export function toDesign(cam, p) { const v = p.clone().project(cam); if (v.z > 1) return null; return [(v.x + 1) * 270, (1 - v.y) * 480]; }
// keep big moving things out of the counter block (x 50-290, y 370-500) and the caption band (y 560-640)
export function inTypeZone(cam, p) { const d = toDesign(cam, p); if (!d) return false; const [x, y] = d; return (x < 290 && y > 370 && y < 500) || (y > 560 && y < 640 && x > 100 && x < 440); }
export const lookDir = (pos, yawDeg, pitchDeg) => pos.clone().add(new THREE.Vector3(Math.sin(yawDeg * D2R) * Math.cos(pitchDeg * D2R), Math.sin(pitchDeg * D2R), -Math.cos(yawDeg * D2R) * Math.cos(pitchDeg * D2R)));

// ================================================================= SET 1: the crossing (s01, s09). Flat noon downtown.
// The hero stands on the south kerb of the avenue z = SL(0) = 60, east of the junction with the street x = SL(0) = 60,
// watching the junction. The camera is ~25 m behind them (hero ~65 design px at 35 mm). The red hero car comes past the hero in
// the inner westbound lane (z = 61.75, moving -X) at 50 km/h, braking for the red light at the junction stop line.
export const FRAME1_CAM = { pos: new THREE.Vector3(112, 2.6, 68.6), look: new THREE.Vector3(58, 0.6, 62.0), mm: 35, roll: 0 };
export const HERO_POS = new THREE.Vector3(87.5, 0, 68.2), HERO_YAW = 72 * D2R;     // on the kerb (kerb line z = 67), facing the junction
export const HERO_CAR = { lane: 61.75, x0: 86, dir: -1 };                           // nose x at tau 0; x(tau) = x0 - brakeCarX(tau); a normal stop ends at the junction kerb (x 72)
export const STOP_LINE_X = HERO_CAR.x0 - 14.05;                                     // = where a normal stop from 50 km/h ends (story NORMAL_STOP)
export function crossingWorld(S, o = {}) {
  const L = dayLights(S, { shadows: o.shadows ?? true, box: 90, fog0: 700, fog1: 6000 });
  const C = createCity(S, { blocks: 3, seed: o.seed ?? 11, cars: 170 });
  const cam = FRAME1_CAM.pos;
  // people: the plaza (west of the junction), the avenue's north pavement and our south pavement; none within 9 m of the lens
  const R = rng(31), people = [];
  for (let i = 0; i < 3000 && people.length < 260; i++) {
    const a = R() * Math.PI * 2, r = 8 + Math.pow(R(), 0.6) * 38, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > PERIOD / 2 - 13 || Math.abs(z) > PERIOD / 2 - 13) continue;
    people.push({ x, z, yaw: R() * 6.28, walk: R() < 0.5 });
  }
  for (let i = 0; i < 70; i++) { const side = R() < 0.45 ? -1 : 1; const x = -60 + R() * 150, z = SL(0) + side * (8.6 + R() * 2.4);
    if (Math.hypot(x - cam.x, z - cam.z) < 9 || Math.hypot(x - HERO_POS.x, z - HERO_POS.z) < 2.5) continue;
    people.push({ x, z, yaw: R() < 0.5 ? Math.PI / 2 : -Math.PI / 2, walk: R() < 0.7 }); }
  const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'pocket', 'handsHead', 'stand'], rimI: 0.25, seed: 9 });
  crowd.meshes.forEach((m) => m.userData.list.forEach((p) => { p.walkV = p.walk ? 1.2 + 0.4 * ((p.seed * 7.3) % 1) : 0; }));
  const hero = createHero(S, { hair: 'short', coat: 0.55, bag: 'tote', top: COL.heroCoat, bot: 0x22252c, hairCol: 0x2a1d14, bagCol: COL.heroBag, height: 1.72, fem: 0.6, pose: 'stand', rimI: 0.35 });
  hero.phone.visible = false; hero.root.position.copy(HERO_POS); hero.root.rotation.y = HERO_YAW;
  const birds = createBirds(S, 22, { flap: 10, seed: 5, color: 0x4a505c });
  // the avenue and the cross street near the junction are clear ("the empty crossing"); props near the lens go
  C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; c.x0 = c.x; c.z0 = c.z;
    const onAve = c.lane.axis === 'x' && Math.abs(c.lane.c - SL(0)) < 8, onSt = c.lane.axis === 'z' && Math.abs(c.lane.c - SL(0)) < 8;
    c.gone = (onAve && c.x > -40 && c.x < 200) || (onSt && c.z > -10 && c.z < 140); });
  // trees whose canopy would hang in the lens go (city.js has no tree keepOut)
  C.group.children.filter((m) => m.isInstancedMesh && m.count === C.trees.length).forEach((M) => { C.trees.forEach((tr, i) => { if (Math.hypot(tr.x - cam.x, tr.z - cam.z) < 16) M.setMatrixAt(i, ZERO_M); }); M.instanceMatrix.needsUpdate = true; });
  const HC = C.cars[0]; Object.assign(HC, { L: 4.5, H: 1.45, W: 1.85, gone: false, hero: true }); setCarColor(C, 0, COL.heroCar);
  const BL = brakeLights(S, HC);
  C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; if (Math.hypot(p.x - cam.x, p.z - cam.z) < 12) p.y = -60; });
  const W = { ...L, C, crowd, hero, birds, people, HC, BL,
    heroCarPose(tau, T = 5) { const x = (o.carX0 ?? HERO_CAR.x0) - brakeCarX(tau, T); return { p: new THREE.Vector3(x + HC.L / 2, 0, HERO_CAR.lane), q: carQ(-Math.PI / 2) }; },
    // st: { tau, T, brake (0..1 brake-light level), carPose(c, i, tau) optional override for other cars, fallAt, slide, focus }
    update(t, st) {
      const tau = st.tau, T = st.T ?? 5;
      C.update(t, { lift: 0, tumble: 0 });                               // fountain jet + props (cars re-posed below)
      const hp = W.heroCarPose(tau, T);
      poseCars(C, (c, i) => { if (c.hero) return hp; if (c.gone) return null; if (st.carPose) { const P = st.carPose(c, i, tau); if (P !== undefined) return P; }
        const d = c.v * c.lane.dir * tau;                                  // traffic coasts on (drag changes it < 1% in 5 s)
        return { p: _v.set(c.lane.axis === 'x' ? c.x0 + d : c.x0, 0, c.lane.axis === 'z' ? c.z0 + d : c.z0).clone(), q: carQ(c.yaw) }; });
      BL.set(hp.p, hp.q, st.brake ?? (tau > -0.3 ? 1 : 0));
      slipCrowd(crowd, t, tau, { agitation: st.agitation ?? 0.25, fallAt: st.fallAt, slide: st.slide });
      birds.update(t, (x) => new THREE.Vector3(10 + x * 7, 26 + Math.sin(x) * 3, 20 + Math.sin(x * 0.7) * 10), 9, 1.0);
      L.update(S, t, st.focus ?? new THREE.Vector3(80, 0, 62));
    } };
  return W;
}

// ================================================================= SET 2 (N1): the hill street. city.js tilted to 10 deg.
// Every street runs on one plane falling toward +Z at THETA (story.js): groundY(z) = QUAY_H + (ZQ - z) tan(theta).
// The main street is x = SL(0) = 60; its foot is the quay edge at z = ZQ (the harbour beyond, sea level y = 0);
// its top is TOP_Z = ZQ - STREET_LEN (400 m up, y = 72.5). Buildings stay vertical (base on the downhill corner, uphill side buried).
// The street's foot ZF is the near kerb of the flat quay road (the cross street z = SL(2) = 300, 24 m wide incl. pavements),
// so a camera standing on the quay road sees the street climb away from flat ground (that is what sells the hill).
export const MAIN_X = SL(0), ZF = SL(2) - 12, ZQ = SL(2) + 12, TOP_Z = ZF - STREET_LEN;   // 60, 288, 312, -112
export const groundY = (x, z) => (z > ZQ ? -12 : z >= ZF ? QUAY_H : QUAY_H + (ZF - z) * TAN);
export const onHill = (x, z, dy = 0) => new THREE.Vector3(x, groundY(x, z) + dy, z);
export const SLOPE_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THETA * D2R);   // tilts a flat pose onto the street
export const hillQ = (yaw, rx = 0, rz = 0) => SLOPE_Q.clone().multiply(carQ(yaw, rx, rz));
// the bottom junction of the main street with the quay road (z = SL(2) = 300) and the top junction (z = SL(-1) = -60 is the
// last junction below TOP_Z; the street continues uphill beyond the 400 m mark)
export const HILL_BOTTOM = new THREE.Vector3(MAIN_X, groundY(0, SL(2)), SL(2)), HILL_TOP = new THREE.Vector3(MAIN_X, groundY(0, TOP_Z), TOP_Z);
export function hillWorld(S, o = {}) {
  const { scene } = S;
  const L = dayLights(S, { shadows: o.shadows ?? true, box: o.box ?? 120, fog0: 600, fog1: 7000 });
  const C = createCity(S, { blocks: 4, seed: o.seed ?? 23, cars: o.cars ?? 260, props: o.props ?? 260 });
  const kids = C.group.children;
  // ground: the flat 8 km plane becomes the tilted plane ending at the quay; beyond the town the streets fade to scrub
  const ground = kids.find((m) => m.geometry && m.geometry.type === 'PlaneGeometry');
  { const plane = (z0, z1) => { const g = new THREE.PlaneGeometry(10000, z1 - z0, 1, 1).rotateX(-Math.PI / 2); g.translate(0, 0, (z0 + z1) / 2);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i))); g.computeVertexNormals(); return g; };
    ground.geometry = plane(ZF - 6000, ZF);
    const flat = new THREE.Mesh(plane(ZF, ZQ), ground.material); flat.receiveShadow = true; C.group.add(flat);
    const ob = ground.material.onBeforeCompile; const ext = (4 + 0.5) * PERIOD;
    ground.material.onBeforeCompile = (sh, r) => { ob(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace('diffuseColor.rgb = col;', `
        float town = 1. - smoothstep(${ext.toFixed(1)}, ${(ext + 60).toFixed(1)}, max(abs(p.x), abs(p.y)));
        vec3 scrub = mix(vec3(0.30,0.33,0.18), vec3(0.42,0.38,0.26), vn2(p*0.02)*0.5+0.5) * (0.85 + 0.3*vn2(p*0.3));
        col = mix(scrub, col, town);
        float quayEdge = smoothstep(${(ZQ - 1.2).toFixed(1)}, ${(ZQ - 0.2).toFixed(1)}, p.y);
        col = mix(col, vec3(0.62,0.6,0.56), quayEdge);
        diffuseColor.rgb = col;`); };
    ground.material.customProgramCacheKey = () => 'fv-hill-ground'; ground.material.needsUpdate = true; }
  // static instances onto the slope; anything past the quay edge is removed
  const bMesh = kids.find((m) => m.isInstancedMesh && m.geometry.attributes.aSize);
  const aSize = bMesh.geometry.attributes.aSize;
  C.buildings.forEach((b, i) => {
    if (b.z + b.d / 2 > ZQ - 14) { bMesh.setMatrixAt(i, ZERO_M); return; }                 // keep the quay road + its pavement
    const y0 = groundY(b.x, b.z + b.d / 2) - 0.3, h = b.h + b.d * TAN + 0.3;
    _m.compose(_v.set(b.x, y0, b.z), _q.identity(), _s.set(b.w, h, b.d)); bMesh.setMatrixAt(i, _m); aSize.setY(i, h);
  });
  bMesh.instanceMatrix.needsUpdate = true; aSize.needsUpdate = true;
  const statics = kids.filter((m) => m.isInstancedMesh && m !== bMesh && m !== C.bodyM && m !== C.cabM && m !== C.whM && m !== C.dropM && !C.propMs.includes(m));
  for (const M of statics) { for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, _m); _m.decompose(_v, _q, _s);
      if (_v.z > ZQ - 1) { M.setMatrixAt(i, ZERO_M); continue; } _v.y += groundY(_v.x, _v.z); _m.compose(_v, _q, _s); M.setMatrixAt(i, _m); }
    M.instanceMatrix.needsUpdate = true; }
  C.disc.visible = false; C.dropM.visible = false;
  kids.filter((m) => m.geometry && m.geometry.type === 'TorusGeometry').forEach((m) => { m.visible = false; });
  // the quay wall (stone, 14 m deep face) and a low kerb along the edge
  const quayMat = new THREE.MeshStandardMaterial({ color: COL.quay, roughness: 0.85 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(10000, QUAY_H + 12, 3), quayMat); wall.position.set(0, (QUAY_H - 12) / 2, ZQ - 1.5); wall.receiveShadow = true; scene.add(wall);
  // harbour water (daylight ocean, API R2); the ground GLSL makes it deep right off the wall
  const ocean = createOcean(S, { amp: o.waveAmp ?? 0.25, level: 0, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: o.reflScale ?? 0.25,
    groundGLSL: `float groundH(vec2 p){ return mix(-11., 8., smoothstep(${(ZQ + 4).toFixed(1)}, ${ZQ.toFixed(1)}, p.y)); }` });
  ocean.add(scene); ocean.U.sunCol.value.set(0xfff4e2);
  // cars and props: memory of their start; per-object tumble axes
  C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; c.x0 = c.x; c.z0 = c.z; c.gone = c.z > ZQ - 4; });
  C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; p.x0 = p.x; p.z0 = p.z; p.gone = p.z > ZQ - 2; });
  const birds = createBirds(S, 20, { flap: 10, seed: 7, color: 0x4a505c });
  const W = { ...L, C, ocean, wall, birds, ground,
    // st: { tau, carPose(c, i, tau) -> {p, q} | null | undefined (default: parked on the slope), propPose(p, i, tau), focus }
    update(t, st = {}) {
      const tau = st.tau ?? 0;
      poseCars(C, (c, i) => { if (c.gone) return null; if (st.carPose) { const P = st.carPose(c, i, tau); if (P !== undefined) return P; }
        return { p: onHill(c.x0, c.z0), q: hillQ(c.yaw) }; });
      poseProps(C, (p, i) => { if (p.gone || p.y < -10) return null; if (st.propPose) { const P = st.propPose(p, i, tau); if (P !== undefined) return P; }
        return { p: onHill(p.x0, p.z0), q: hillQ(p.yaw) }; });
      ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
      birds.update(t, (x) => new THREE.Vector3(MAIN_X - 60 + x * 7, 110 + Math.sin(x) * 3, 120 + Math.sin(x * 0.7) * 10), 10, 1.0);
      L.update(S, t, st.focus ?? HILL_BOTTOM);
    } };
  return W;
}

// ================================================================= SET 3: the bay in daylight (s05, s06, s07), API R2 + bay.js
export function bayWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', 0.55);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
  scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
  const ocean = createOcean(S, { amp: o.waveAmp ?? 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: o.reflScale ?? 0.25 });
  ocean.add(scene); ocean.U.sunCol.value.set(0xfff4e2);
  const bay = createBay(S, { pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0, moonLightI: 3.0, hemiI: 1.3, beamI: 0, boats: 0, shadows: !!o.shadows });
  bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
  return { sky, ocean, bay, ground: bayGround,
    update(S, t, st = {}) {
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
      ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
      bay.update(S, t, { waveAmp: o.waveAmp ?? 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: st.focus ?? S.camera.position.clone() });
    } };
}
// city cars + props without the city (for the bay streets): pose them with poseCars / poseProps (ground from bay groundH)
export function looseCity(S, o = {}) {
  const C = createCity(S, { blocks: 0, seed: o.seed ?? 31, cars: o.cars ?? 120, props: o.props ?? 120 });
  const keep = new Set([C.bodyM, C.cabM, C.whM, ...C.propMs]);
  C.group.children.forEach((m) => { if (!keep.has(m)) m.visible = false; });
  C.cars.forEach((c, i) => { const r = rng(900 + i); c.rx = (r() - 0.5) * 1.6; c.rz = (r() - 0.5) * 1.6; c.ry = (r() - 0.5) * 1.2; });
  C.props.forEach((p, i) => { const r = rng(1500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; });
  return C;
}

// ================================================================= SET 4: orbit (s08), API R4 (km, Earth at the origin)
export const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
export function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
