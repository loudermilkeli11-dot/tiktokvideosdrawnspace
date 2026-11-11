// s07_clouds (film 15.0–20.0, step 2: the 1-minute flip, story tau 50 -> 55): 12-15 km up, above the cloud deck.
// The camera falls up with everyone (people, cars, pigeons, plaza debris) at ~1,800-1,940 km/h. A jet that was on
// approach when gravity flipped also has its own lift: it surges up past us, tumbling, gear still down, into the deep
// blue toward the Sun. Altitude comes ONLY from story.js (heightAt(tau, 60), tau = tauAt('s07_clouds', tt)): the deck
// below recedes at the law's speed (speedAt ~ 490-540 m/s here) as we rise from 12.3 to 14.8 km.
// ?tt=shot seconds (scrub), ?mm=lens
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createClouds } from '@engine/clouds.js';
import { createPlane } from '@engine/planes.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCrowd, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng, clamp } from '@engine/util.js';
import { heightAt, tauAt } from './story.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), SHOT = 's07_clouds';
// daywear palette (as in look.js)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a);
const PASS = 2.4;                                                    // shot time of the jet's closest pass
const S = createStudio({ samples: (t) => (Math.abs(t - 4 - PASS) < 0.8 ? 4 : t - 4 > 3.3 ? 3 : 2), far: 4e5,
  post: { exposure: 1.0, bloom: 0.09, bloomThreshold: 2.4, bloomRadius: 0.6, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.06 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.45);
const SUN = new THREE.Vector3(Math.sin(24 * D2R) * Math.cos(41 * D2R), Math.sin(41 * D2R), -Math.cos(24 * D2R) * Math.cos(41 * D2R)).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x0d2f86); sky.U.dayHor.value.set(0x8fb4e6); sky.U.altI.value = 1; sky.U.sunDisc.value = 1;
const CL = createClouds(S, { base: 2400, thick: 1450, cover: 0.8, hazeL: 175e3, sunI: 1.5, skyI: 0.6, seed: 3 });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.35);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.1); scene.add(hemi);   // blue sky above, the bright deck below
// ---- the jet (on approach when it flipped: gear down) ----
const jet = createPlane(S, { len: 62, span: 58, gear: true });
// Its path relative to us (we and the air fall up together, so in our frame there is no weight): it keeps flying through
// the air at ~100 m/s and its lift bends the path into a loop, carrying it up past us and away. Integrated once, deterministic.
const JP = [], JDT = 0.01, J0 = -1, JV = 100;
{ let p = new THREE.Vector3(); for (let t = J0; t <= 6.01; t += JDT) { const th = (44 - 15.5 * (t + 1)) * D2R;      // heading: up and toward us -> up and away
    const v = new THREE.Vector3(-0.16, Math.cos(th), Math.sin(th)).normalize().multiplyScalar(JV * (1 + 0.04 * t)); JP.push({ p: p.clone(), v }); p.addScaledVector(v, JDT); }
  const k = Math.round((PASS - J0) / JDT), off = new THREE.Vector3(26, -6, -64).sub(JP[k].p); JP.forEach((e) => e.p.add(off)); }
function jetAt(tt) {
  const i = clamp((tt - J0) / JDT, 0, JP.length - 1.001), k = Math.floor(i), u = i - k, A = JP[k], B = JP[k + 1];
  const p = A.p.clone().lerp(B.p, u), v = A.v.clone().lerp(B.v, u).normalize();
  // nose along the flight path, rolling (the crew has lost it), with a slow yaw wobble: it tumbles as it climbs
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), v);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), 2.0 + 0.95 * tt));
  q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2 * Math.sin(tt * 1.3), 0.28 * Math.sin(tt * 0.9 + 1), 0)));
  return { p, q, v };
}
const distToPath = (x) => { let m = 1e9; for (let k = 0; k < JP.length; k += 10) m = Math.min(m, JP[k].p.distanceTo(x)); return m; };
// camera: drifting with the crowd; it tilts to follow the jet (soft-limited) as it surges up past us
function camAt(tt) {
  const pos = new THREE.Vector3(0.4 * tt, 0.25 * tt, -0.3 * tt), J = jetAt(tt);
  const jd = J.p.clone().sub(pos), elJ = Math.atan2(jd.y, Math.hypot(jd.x, jd.z)) / D2R, azJ = Math.atan2(jd.x, -jd.z) / D2R;
  const soft = (x, lo, hi) => { const m = (lo + hi) / 2, h = (hi - lo) / 2; return m + h * Math.tanh((x - m) / h); };   // eases in and out of the limits
  const pitch = soft(elJ * 0.58 + 2, -31, 33) * D2R, yaw = soft(azJ * 0.3, -9, 10) * D2R;
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  return { pos, look: pos.clone().add(dir), mm: +(Q.get('mm') ?? 20), roll: -6 + 2.3 * tt };
}
// does a point moving as p0 + v*t ever cross the counter block (design px x 0-290, y 350-520) during the shot?
const tcam = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 1e5), tv = new THREE.Vector3();
function hitsCounter(p0, v) { for (let tt = 0; tt <= 5; tt += 0.25) { applyCam(tcam, camAt(tt)); tcam.updateMatrixWorld();
  tv.copy(p0).addScaledVector(v, tt).project(tcam); const x = (tv.x + 1) * 270, y = (1 - tv.y) * 480; if (tv.z < 1 && x > -10 && x < 300 && y > 345 && y < 525) return true; } return false; }
// does it ever line up with the jet as seen from the camera (no figure may appear to touch the jet)?
function nearJetOnScreen(p0, v) { for (let tt = 1.8; tt <= 5.0; tt += 0.06) { const c = camAt(tt).pos, J = jetAt(tt).p, P = p0.clone().addScaledVector(v, tt);
  const a = J.clone().sub(c), b = P.clone().sub(c), ang = a.angleTo(b), jr = Math.atan(33 / a.length()); if (ang < jr + 0.03) return true; } return false; }
// ---- people: the plaza crowd falling up around us, 10-70 m away, spread around the directions the camera sweeps ----
const R = rng(707), people = [];
for (let i = 0; i < 20000 && people.length < 62; i++) {
  const az = (R() - 0.5) * 64 * D2R, el = (R() * 2 - 1) * 64 * D2R, d = 10 + Math.pow(R(), 1.4) * 55;
  const x = Math.sin(az) * Math.cos(el) * d, y = Math.sin(el) * d, z = -Math.cos(az) * Math.cos(el) * d;
  if (distToPath(new THREE.Vector3(x, y, z)) < 40) continue;                                    // nobody near the jet's way
  const pp = { x, y, z, yaw: R() * 6.28, vx: (R() - 0.5) * 1.0, vy: (R() - 0.5) * 1.2, vz: (R() - 0.5) * 1.0 };
  const P0 = new THREE.Vector3(x, y, z), V0 = new THREE.Vector3(pp.vx, pp.vy, pp.vz);
  if ((d < 30 && hitsCounter(P0, V0)) || nearJetOnScreen(P0, V0)) continue;                     // keep the counter block calm; nobody seems to touch the jet
  people.push(pp);
}
const crowd = createCrowd(S, people, { poses: ['handsHead', 'point', 'phoneUp', 'arms', 'filming', 'handsHead', 'stand', 'point', 'shade', 'phoneUp'], rimI: 0.35, seed: 17 });
for (const m of crowd.meshes) for (const p of m.userData.list) { p.x0 = p.x; p.y0 = p.y; p.z0 = p.z; }
// ---- cars ----
const carCols = [0xb21d1d, 0xf2f2ee, 0x2a4f9a, 0xe0b23a, 0x1d1f24, 0x2f6b4a, 0xd96a2b, 0x8a8f96];
const wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14).rotateZ(Math.PI / 2);
const glassM = new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.06, metalness: 0.9 }), tyreM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
// side profiles (length along z, height y) extruded across the width with rounded edges: sedans and one bus
function extrudeProfile(pts, width, bevel = 0.06) {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(Math.PI / 2); return g;
}
const SEDAN = { body: [[-2.25, 0.3], [2.25, 0.3], [2.25, 0.74], [2.12, 0.92], [1.6, 0.97], [-0.62, 0.95], [-1.25, 0.88], [-2.15, 0.78], [-2.25, 0.62]],
  glass: [[-0.62, 0.94], [1.62, 0.96], [1.08, 1.37], [0.02, 1.37]], roof: [[0.0, 1.33], [1.1, 1.33], [1.07, 1.41], [0.03, 1.41]], W: 1.82, wz: 1.38 };
const BUS = { body: [[-4.5, 0.32], [4.5, 0.32], [4.5, 2.75], [4.35, 2.92], [-4.3, 2.92], [-4.5, 2.7]], glass: [[-4.47, 1.35], [4.47, 1.35], [4.47, 2.42], [-4.47, 2.42]], W: 2.5, wz: 3.1, bus: true };
function makeCar(col, M) {
  const g = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: col, roughness: 0.28, metalness: 0.45 });
  g.add(new THREE.Mesh(extrudeProfile(M.body, M.W), paint));
  g.add(new THREE.Mesh(extrudeProfile(M.glass, M.bus ? M.W + 0.03 : M.W * 0.86, 0.04), glassM));
  if (M.roof) g.add(new THREE.Mesh(extrudeProfile(M.roof, M.W * 0.84, 0.03), paint));
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const w = new THREE.Mesh(wheelG, tyreM); w.position.set(sx * (M.W / 2 - 0.1), 0.34, sz * M.wz); g.add(w); }
  return g;
}
const cars = [[-30, -38, -48], [34, 14, -52], [52, -64, -80], [-55, 40, -70], [8, -80, -30], [-34, 66, -40], [70, 50, -95]].map(([x, y, z], i) => {
  const g = makeCar(carCols[i % carCols.length], i === 3 ? BUS : SEDAN);
  const r = rng(40 + i); g.userData = { p: new THREE.Vector3(x, y, z), w: new THREE.Vector3((r() - 0.5) * 0.9, (r() - 0.5) * 0.7, (r() - 0.5) * 0.9), e0: new THREE.Euler(r() * 6, r() * 6, r() * 6), v: new THREE.Vector3((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2) };
  scene.add(g); return g;
});
// one car was still driving when gravity flipped: it keeps its road speed (~36 km/h) relative to us and tumbles across the top of frame
{ const hc = cars[0]; hc.userData.hero = true; hc.userData.p.set(40, 1.2, -22); hc.userData.v.set(-10, 0.3, 0); hc.userData.w.set(0.7, 0.4, 1.1); }
// ---- plaza furniture falling up with us: cafe umbrellas, benches, bins, planters, cafe tables ----
function part(g, col, m) { g = g.index ? g.toNonIndexed() : g; if (m) g.applyMatrix4(m); g.deleteAttribute('uv'); const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const TM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
const PROPS = [
  (c) => mergeGeometries([part(new THREE.ConeGeometry(1.4, 0.55, 10, 1, true), c, TM(0, 2.3, 0)), part(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), 0xdddddd, TM(0, 1.2, 0)), part(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10), 0x333333, TM(0, 0.04, 0))]),
  () => mergeGeometries([part(new THREE.BoxGeometry(1.8, 0.07, 0.45), 0x7a5232, TM(0, 0.45, 0)), part(new THREE.BoxGeometry(1.8, 0.4, 0.06), 0x7a5232, TM(0, 0.75, 0.22, -0.15)),
    part(new THREE.BoxGeometry(0.06, 0.45, 0.45), 0x2b2e33, TM(-0.8, 0.22, 0)), part(new THREE.BoxGeometry(0.06, 0.45, 0.45), 0x2b2e33, TM(0.8, 0.22, 0))]),
  () => mergeGeometries([part(new THREE.CylinderGeometry(0.3, 0.27, 0.9, 12), 0x2d4a33, TM(0, 0.45, 0)), part(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12), 0x24382a, TM(0, 0.93, 0))]),
  () => mergeGeometries([part(new THREE.BoxGeometry(1.0, 0.6, 1.0), 0x9a948a, TM(0, 0.3, 0)), part(new THREE.IcosahedronGeometry(0.62, 1), 0x3f7a35, TM(0, 0.85, 0))]),
  (c) => mergeGeometries([part(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14), c, TM(0, 0.74, 0)), part(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), 0x333333, TM(0, 0.37, 0)), part(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 10), 0x333333, TM(0, 0.015, 0))]),
];
const propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide });
const UCOL = [0xd23b2f, 0xf2efe6, 0x2a6fb0, 0xf0b23a], deb = [], RD = rng(91);
for (let i = 0, n = 0; i < 400 && n < 26; i++) {
  const az = (RD() - 0.5) * 80 * D2R, el = (RD() * 2 - 1) * 60 * D2R, d = 24 + RD() * 46, p = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, -Math.cos(az) * Math.cos(el) * d);
  const v = new THREE.Vector3((RD() - 0.5) * 1.5, (RD() - 0.5) * 1.5, (RD() - 0.5) * 1.5), k = n % PROPS.length;
  if (distToPath(p) < 22 || (d < 30 && hitsCounter(p, v))) continue;
  const m = new THREE.Mesh(PROPS[k](UCOL[n % UCOL.length]), propMat); scene.add(m); n++;
  deb.push({ m, p, v, w: new THREE.Vector3((RD() - 0.5) * 1.6, (RD() - 0.5) * 1.6, (RD() - 0.5) * 1.6), e: new THREE.Euler(RD() * 6, RD() * 6, RD() * 6) });
}
const NP = 40, paper = [], papM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8, side: THREE.DoubleSide }), NP);
for (let i = 0; i < 400 && paper.length < NP; i++) { const az = (RD() - 0.5) * 80 * D2R, el = (RD() * 2 - 1) * 60 * D2R, d = 8 + RD() * 24;
  const p = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, -Math.cos(az) * Math.cos(el) * d); if (d < 18 && hitsCounter(p, new THREE.Vector3())) continue;
  paper.push({ p, w: new THREE.Vector3((RD() - 0.5) * 6, (RD() - 0.5) * 6, (RD() - 0.5) * 6), e: new THREE.Euler(RD() * 6, RD() * 6, RD() * 6) }); }
papM.count = paper.length; papM.frustumCulled = false; scene.add(papM);
const birds = createBirds(S, 14, { flap: 12, seed: 8, color: 0x4a505c });
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), sc = new THREE.Vector3();
S.run((t) => {
  const tt = Math.max(t - 4, 0) + +(Q.get('tt') ?? 0), tau = tauAt(SHOT, tt), alt = heightAt(tau, 60);
  // the jet
  const J = jetAt(tt); jet.root.position.copy(J.p); jet.root.quaternion.copy(J.q);
  // people drift and tumble slowly (everyone fell up together, so relative motion is gentle)
  for (const m of crowd.meshes) for (const p of m.userData.list) { p.x = p.x0 + p.vx * tt; p.y = p.y0 + p.vy * tt; p.z = p.z0 + p.vz * tt; }
  crowd.update(t, { agitation: 0.7, lift: 0, tumble: 2.2 + 0.3 * tt });
  for (const c of cars) { const u = c.userData; c.position.copy(u.p).addScaledVector(u.v, tt); c.rotation.set(u.e0.x + u.w.x * tt, u.e0.y + u.w.y * tt, u.e0.z + u.w.z * tt); }
  for (const d of deb) { d.m.position.copy(d.p).addScaledVector(d.v, tt); d.m.rotation.set(d.e.x + d.w.x * tt, d.e.y + d.w.y * tt, d.e.z + d.w.z * tt); }
  paper.forEach((d, i) => { qq.setFromEuler(ee.set(d.e.x + d.w.x * tt, d.e.y + d.w.y * tt, d.e.z + d.w.z * tt)); vv.copy(d.p).add(sc.set(Math.sin(tt * 1.3 + i) * 0.6, Math.sin(tt * 0.9 + i * 2) * 0.6, 0)); papM.setMatrixAt(i, m4.compose(vv, qq, sc.set(1, 1, 1))); });
  papM.instanceMatrix.needsUpdate = true;
  birds.update(t, (x) => new THREE.Vector3(-13 + (x - 4) * 4.2, -15 + (x - 4) * 5 + Math.sin(x * 0.7) * 1.5, -15), 3.5, 1.0);   // pigeons flap across, rising past us
  const C = camAt(tt), pos = C.pos;
  applyCam(camera, C, shake(t, 0.25 + 0.5 * Math.exp(-((tt - PASS) ** 2) / 0.3), 1.4, 7));
  sun.position.copy(SUN).multiplyScalar(500).add(pos); sun.target.position.copy(pos);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  CL.update(S, { alt, sunDir: SUN }); sky.U.dip.value = CL.dip;
  crowd.material.U.rimDir.value.copy(SUN).negate();                 // rim from the bright sky/deck on the side away from the Sun
});
