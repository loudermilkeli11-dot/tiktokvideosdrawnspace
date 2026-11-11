// s07_clouds (film 15.0–20.0, step 2: the 1-minute flip, story tau 50 -> 55): 12-15 km up, above the cloud deck.
// The camera falls up with everyone (people, cars, pigeons, plaza debris) at ~1,800-1,940 km/h. A jet that was on
// approach when gravity flipped also has its own lift: it surges up past us, tumbling, gear still down, into the deep
// blue toward the Sun. Altitude and speed come ONLY from story.js (heightAt / speedAt, T = 60).
// ?tt=shot seconds (scrub), ?mm=lens
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createClouds } from '@engine/clouds.js';
import { createPlane } from '@engine/planes.js';
import { createCrowd, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng, ease, clamp, lerp, keyed } from '@engine/util.js';
import { heightAt, tauAt } from './story.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), SHOT = 's07_clouds';
// daywear palette (as in look.js)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a);
const PASS = 2.3;                                                    // shot time of the jet's closest pass
const S = createStudio({ samples: (t) => (Math.abs(t - 4 - PASS) < 0.9 ? 4 : 2), far: 4e5,
  post: { exposure: 1.0, bloom: 0.09, bloomThreshold: 2.4, bloomRadius: 0.6, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.06 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.45);
const SUN = new THREE.Vector3(Math.sin(28 * D2R) * Math.cos(40 * D2R), Math.sin(40 * D2R), -Math.cos(28 * D2R) * Math.cos(40 * D2R)).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x0d2f86); sky.U.dayHor.value.set(0x8fb4e6); sky.U.altI.value = 1; sky.U.sunDisc.value = 1;
const CL = createClouds(S, { base: 2400, thick: 2100, cover: 0.7, hazeL: 190e3, sunI: 1.5, skyI: 0.6, seed: 3 });
CL.U.hazeCol.value.copy(sky.U.dayHor.value).multiplyScalar(1.5 * 1.35);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x6f9be0, 0xf4f6ff, 1.1); scene.add(hemi);   // blue sky above, the bright deck below
// ---- the jet (on approach when it flipped: gear down) ----
const jet = createPlane(S, { len: 62, span: 58, gear: true });
// ---- people: a loose cloud of the plaza crowd around us, at our height (spread +-40 m from where they started) ----
const R = rng(707), people = [];
for (let i = 0; i < 3000 && people.length < 70; i++) {
  const x = (R() - 0.5) * 260, z = -12 - R() * 230, y = (R() - 0.55) * 90;
  const d = Math.hypot(x, y, z); if (d < 11) continue;
  const sx = 270 + 270 * x / (-z * 0.55), sy = 480 - 480 * (y + z * Math.tan(12 * D2R)) / (-z * 0.9);   // rough design px at the opening frame
  if (sx > 10 && sx < 290 && sy > 350 && sy < 520) continue;                                            // keep the counter block calm
  people.push({ x, y, z, yaw: R() * 6.28, vx: (R() - 0.5) * 1.2, vy: (R() - 0.5) * 1.6, vz: (R() - 0.5) * 1.2 });
}
const crowd = createCrowd(S, people, { poses: ['handsHead', 'point', 'phoneUp', 'arms', 'filming', 'handsHead', 'stand', 'point', 'shade', 'phoneUp'], rimI: 0.35, seed: 17 });
for (const m of crowd.meshes) for (const p of m.userData.list) { p.x0 = p.x; p.y0 = p.y; p.z0 = p.z; }
// ---- cars ----
const carCols = [0xb21d1d, 0xf2f2ee, 0x2a4f9a, 0xe0b23a, 0x1d1f24, 0x2f6b4a, 0xd96a2b, 0x8a8f96];
const unit = new THREE.BoxGeometry(1, 1, 1), wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14).rotateZ(Math.PI / 2);
const glassM = new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.06, metalness: 0.9 }), tyreM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
const cars = [[-46, -14, -95], [38, 10, -70], [70, -30, -150], [-90, 22, -170], [18, -40, -120], [-28, 34, -60], [105, 18, -210]].map(([x, y, z], i) => {
  const g = new THREE.Group(), L = i === 3 ? 9 : 4.5, W = i === 3 ? 2.5 : 1.85, H = i === 3 ? 2.9 : 1.45;
  const body = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color: carCols[i % carCols.length], roughness: 0.3, metalness: 0.5 })); body.scale.set(W, H * 0.55, L); body.position.y = 0.32 + H * 0.275; g.add(body);
  const cab = new THREE.Mesh(unit, glassM); cab.scale.set(W * 0.86, H * 0.45, L * (i === 3 ? 0.9 : 0.5)); cab.position.set(0, 0.32 + H * 0.55 + H * 0.225, -L * 0.06); g.add(cab);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const w = new THREE.Mesh(wheelG, tyreM); w.position.set(sx * W * 0.45, 0.34, sz * L * 0.33); g.add(w); }
  const r = rng(40 + i); g.userData = { p: new THREE.Vector3(x, y, z), w: new THREE.Vector3((r() - 0.5) * 0.9, (r() - 0.5) * 0.7, (r() - 0.5) * 0.9), e0: new THREE.Euler(r() * 6, r() * 6, r() * 6), v: new THREE.Vector3((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2) };
  scene.add(g); return g;
});
// ---- plaza debris: benches, bins, planters, cafe tables, umbrellas; and paper sheets ----
const ND = 70, deb = [], debM = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), ND);
const PCOL = [0x6a4a30, 0x2d4a33, 0x8a7a68, 0xf2f2ee, 0xc0392b, 0x2a6fb0];
const RD = rng(91);
for (let i = 0; i < ND; i++) { const k = Math.floor(RD() * 6), dims = [[1.8, 0.5, 0.6], [0.55, 1.0, 0.55], [1.2, 0.7, 1.2], [0.8, 0.06, 0.8], [2.2, 0.08, 2.2], [0.5, 0.5, 0.5]][k];
  deb.push({ p: new THREE.Vector3((RD() - 0.5) * 240, (RD() - 0.5) * 100, -15 - RD() * 220), w: new THREE.Vector3((RD() - 0.5) * 2, (RD() - 0.5) * 2, (RD() - 0.5) * 2), e: new THREE.Euler(RD() * 6, RD() * 6, RD() * 6), dims, k });
  debM.setColorAt(i, new THREE.Color(PCOL[k])); }
debM.frustumCulled = false; scene.add(debM);
const NP = 90, paper = [], papM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8, side: THREE.DoubleSide }), NP);
for (let i = 0; i < NP; i++) paper.push({ p: new THREE.Vector3((RD() - 0.5) * 80, (RD() - 0.5) * 50, -6 - RD() * 70), w: new THREE.Vector3((RD() - 0.5) * 6, (RD() - 0.5) * 6, (RD() - 0.5) * 6), e: new THREE.Euler(RD() * 6, RD() * 6, RD() * 6) });
papM.frustumCulled = false; scene.add(papM);
const birds = createBirds(S, 16, { flap: 12, seed: 8, color: 0x3d424c });
// ---- the jet's path (relative to us): from below-front, a curving surge up past the camera, then away up toward the Sun ----
function jetAt(tt) {
  const s = tt - PASS;
  const p = new THREE.Vector3(24 + 9 * s, 150 * s + 4.9 * s * s, -58 - 14 * s - 3 * s * s);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(90 * D2R - 0.32 * s, 0.12 * s, 0.55 * s + 0.4, 'XYZ'));
  return { p, q };
}
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), sc = new THREE.Vector3();
S.run((t) => {
  const tt = Math.max(t - 4, 0) + +(Q.get('tt') ?? 0), tau = tauAt(SHOT, tt), alt = heightAt(tau, 60);
  // the jet
  const J = jetAt(tt); jet.root.position.copy(J.p); jet.root.quaternion.copy(J.q);
  // people drift and tumble slowly (everyone fell up together, so relative motion is gentle)
  for (const m of crowd.meshes) for (const p of m.userData.list) { p.x = p.x0 + p.vx * tt; p.y = p.y0 + p.vy * tt; p.z = p.z0 + p.vz * tt; }
  crowd.update(t, { agitation: 0.7, lift: 0, tumble: 2.2 + 0.3 * tt });
  for (const c of cars) { const u = c.userData; c.position.copy(u.p).addScaledVector(u.v, tt); c.rotation.set(u.e0.x + u.w.x * tt, u.e0.y + u.w.y * tt, u.e0.z + u.w.z * tt); }
  deb.forEach((d, i) => { qq.setFromEuler(ee.set(d.e.x + d.w.x * tt, d.e.y + d.w.y * tt, d.e.z + d.w.z * tt)); debM.setMatrixAt(i, m4.compose(d.p, qq, sc.set(...d.dims))); });
  debM.instanceMatrix.needsUpdate = true;
  paper.forEach((d, i) => { qq.setFromEuler(ee.set(d.e.x + d.w.x * tt, d.e.y + d.w.y * tt, d.e.z + d.w.z * tt)); vv.copy(d.p).add(sc.set(Math.sin(tt * 1.3 + i) * 0.6, Math.sin(tt * 0.9 + i * 2) * 0.6, 0)); papM.setMatrixAt(i, m4.compose(vv, qq, sc.set(1, 1, 1))); });
  papM.instanceMatrix.needsUpdate = true;
  birds.update(t, (x) => new THREE.Vector3(-60 + (x - 4) * 7, 6 + Math.sin(x * 0.7) * 2, -55), 7, 1.0);
  // camera: drifting with the crowd; tilts up to follow the jet as it surges past
  const pitch = keyed([[0, -13], [1.0, -12], [3.4, 24, 'inOutCubic'], [5, 30, 'outCubic']], tt) * D2R;
  const yaw = keyed([[0, -4], [1.0, -3], [3.4, 6], [5, 9]], tt) * D2R;
  const roll = keyed([[0, -5], [5, 4, 'inOutSine']], tt);
  const pos = new THREE.Vector3(0.4 * tt, 0.25 * tt, -0.3 * tt);
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  applyCam(camera, { pos, look: pos.clone().add(dir), mm: +(Q.get('mm') ?? 20), roll }, shake(t, 0.25 + 0.5 * Math.exp(-((tt - PASS) ** 2) / 0.3), 1.4, 7));
  sun.position.copy(SUN).multiplyScalar(500).add(pos); sun.target.position.copy(pos);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  CL.update(S, { alt, sunDir: SUN }); sky.U.dip.value = CL.dip;
  for (const m of [crowd.material]) m.U.rimDir.value.copy(SUN).negate();
});
