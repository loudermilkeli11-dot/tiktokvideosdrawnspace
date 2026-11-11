// s05_crash (film 10.5-13.5 s, story tau 16 -> 19). A rooftop camera bolted to a building on the bay's inner shore looks out over
// the beach and the bay. The lifted sea falls back: from 70 m at 59 m/s, its turquoise underside over the empty bay, it drops
// past us and at landsAt(5) (tau 17.09, shot 1.09 s) slams into its bed at 69 m/s. The bay erupts: a wall of spray along every
// shore and a field of white water across the bay; then a surge (bore) pours over the beach and the promenade into the town's
// streets, carrying boats with it. No people on screen. Heights from story.js (heightAt, landsAt).
// ?cx ?cz ?cy (rooftop height) ?b (bearing deg) ?pd (pitch deg) ?mm ?sb ?se (sun bearing rel., elevation)
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean, waveHeight } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH, sField, sGrad, onContour } from '@engine/bay.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { rng, clamp, sstep } from '@engine/util.js';
import { patchSlab, createBoats, createSpray } from '@engine/splash.js';
import { heightAt, landsAt, tauAt, SHOT } from './story.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
const S = createStudio({ samples: 2, shadows: false, near: 0.5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.5, bloomRadius: 0.55, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.55);
const T = SHOT.s05_crash.T, TAU0 = SHOT.s05_crash.tau0, LAND = landsAt(T), T_IMP = LAND - TAU0;   // impact at shot time ~1.09 s
const dirB = (b) => new THREE.Vector3(Math.sin(b * D2R), 0, -Math.cos(b * D2R));
const CAM = new THREE.Vector3(qn('cx', 92), 0, qn('cz', 62)); const G0 = groundH(CAM.x, CAM.z); CAM.y = G0 + qn('cy', 17);
const BEAR = qn('b', -30), PITCH = qn('pd', 0), MM = qn('mm', 24);
const sunB = BEAR + qn('sb', 70), sunE = qn('se', 48);
const SUN = dirB(sunB).multiplyScalar(Math.cos(sunE * D2R)).setY(Math.sin(sunE * D2R)).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
const ocean = createOcean(S, { slab: true, amp: 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: 0.25, foam: 0.9, rings: 230, segs: 360 });
ocean.add(scene);
const OU = ocean.U; OU.sunCol.value.set(0xfff4e2); OU.hazeD.value = 4000; OU.surgeH.value = 10.5; OU.surgeR.value = 135; OU.surgeV.value = 70;
const bay = createBay(S, { shadows: false, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0.0, moonLightI: 3.0, hemiI: 1.3, beamI: 0.0, boats: 0 });
bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
patchSlab(bay.terrain.material, OU, GROUND_GLSL, { seabed: true, noLamps: true });
patchSlab(bay.buildings.material, OU, GROUND_GLSL);
bay.pier.group.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial && !o.material.userData.slab) { o.material.userData.slab = 1; patchSlab(o.material, OU, GROUND_GLSL, { specK: 0.35, rough: 0.95 }); } });
// clear the sight line: drop only the buildings that would hide the beach in the middle of the frame
{ const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), M = bay.buildings;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, sc); const dx = p.x - CAM.x, dz = p.z - CAM.z, d = Math.hypot(dx, dz);
    const b = Math.atan2(dx, -dz) / D2R - BEAR; let D = 60; for (; D < 400; D += 4) { const w = CAM.clone().addScaledVector(dirB(BEAR + b), D); if (sField(w.x, w.z) < 0) break; }
    const yl = CAM.y - (CAM.y - 2) * d / D; if (d < 12 || (d < D && Math.abs(b) < 26 && p.y + sc.y > yl - 3)) { m4.makeScale(0, 0, 0); M.setMatrixAt(i, m4); } }
  M.instanceMatrix.needsUpdate = true; }
// our roof's edge: a concrete parapet and a steel rail just below the lens (it's a rooftop webcam)
{ const fw = dirB(BEAR), rt = new THREE.Vector3(-fw.z, 0, fw.x), c0 = CAM.clone().addScaledVector(fw, 4.6).setY(CAM.y - 3.3);
  const conc = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.9 }), steel = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.45, metalness: 0.7 });
  const par = new THREE.Mesh(new THREE.BoxGeometry(40, 1.1, 0.45), conc); par.position.copy(c0); par.rotation.y = Math.atan2(-fw.x, -fw.z); scene.add(par);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(40, 0.08, 0.55), steel); cap.position.copy(c0).setY(c0.y + 0.59); cap.rotation.y = par.rotation.y; scene.add(cap);
  for (let k = -8; k <= 8; k++) { const po = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), steel); po.position.copy(c0).addScaledVector(rt, k * 1.6).setY(c0.y + 0.85); scene.add(po); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(40, 0.06, 0.06), steel); rail.position.copy(c0).setY(c0.y + 1.1); rail.rotation.y = par.rotation.y; scene.add(rail); }
// boats: on the falling sea in view; the ones near our shore get picked up by the surge and carried into the streets
const BR = rng(14), boats = [];
for (let i = 0; i < 6000 && boats.length < 20; i++) { const near = boats.length < 9; const p = CAM.clone().addScaledVector(dirB(BEAR + (BR() - 0.5) * (near ? 34 : 50)), near ? 110 + BR() * 140 : 250 + BR() * 900);
  const s = sField(p.x, p.z); if (s > (near ? -14 : -30) || (near && s < -90)) continue; if (boats.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < 35)) continue;
  boats.push({ x: p.x, z: p.z, s0: s, sEnd: 18 + BR() * 45, yaw: BR() * 6.28, L: 7 + BR() * 9, carry: near, spin: (BR() - 0.5) * 2.4, roll: (BR() - 0.5) * 1.6, ph: BR() * 6 }); }
const BT = createBoats(S, boats.length, { seed: 9 }); BT.materials.forEach((m) => patchSlab(m, OU, GROUND_GLSL));
// ---------- spray (all born at the impact or after it; ballistic with drag, gravity back to normal) ----------
const SR = rng(77), parts = [];
const shore = []; for (let a = -168; a <= 168; a += 0.9) { const c = onContour(800 * Math.sin(a * D2R), -800 + 800 * Math.cos(a * D2R), 0); if (!c.ok) continue; const [gx, gz] = sGrad(c.x, c.z), gl = Math.hypot(gx, gz) || 1; shore.push({ x: c.x, z: c.z, nx: gx / gl, nz: gz / gl }); }
const camD = (x, z) => Math.hypot(x - CAM.x, z - CAM.z);
const lump = (a) => 0.55 + 0.45 * Math.sin(a * 0.11 + 1.3) * Math.sin(a * 0.037 + 0.4) + 0.25 * Math.sin(a * 0.53);   // the wall is ragged: some sections shoot higher
for (const sp of shore) { const d = camD(sp.x, sp.z), nearK = d < 420 ? 1 : 0, L = lump(Math.atan2(sp.x, sp.z + 800) / D2R * 3);   // the wall along every shore:
  const vk = nearK ? 0.55 + 0.35 * sstep(60, 400, d) : 1, J = nearK ? 3 : 1, per = nearK ? 18 : 8;                                   // coherent jets + a dense low base
  for (let jn = 0; jn < J; jn++) { const vv = vk * (20 + Math.pow(SR(), 0.6) * 46) * (0.55 + 0.6 * L), vh = 4 + SR() * 22, side = (SR() - 0.5) * 8, j0 = (SR() - 0.5) * (nearK ? 7 : 12);
    for (let k = 0; k < per; k++) { const u = 0.55 + 0.5 * SR(), kind = SR() < 0.55 ? 1 : 0, j = j0 + (SR() - 0.5) * 3;
      parts.push({ p: [sp.x + sp.nz * j + sp.nx * (SR() * 4 - 6), 0.5 + SR() * 2, sp.z - sp.nx * j + sp.nz * (SR() * 4 - 6)], v: [(sp.nx * vh + sp.nz * side) * u + (SR() - 0.5) * 1.5, vv * u, (sp.nz * vh - sp.nx * side) * u + (SR() - 0.5) * 1.5],
        t0: T_IMP + 4 + SR() * 0.16, size: kind === 1 ? (nearK ? 1.4 + SR() * 2.4 : 4 + SR() * 8) : (nearK ? 0.35 + SR() * 0.6 : 0.6 + SR() * 1.2), drag: kind === 1 ? 0.3 : 0.1, life: 8, kind }); } }
  for (let k = 0; k < (nearK ? 8 : 6); k++) { const j = (SR() - 0.5) * (nearK ? 8 : 12), vv = 3 + SR() * 12;
    parts.push({ p: [sp.x + sp.nz * j + sp.nx * (SR() * 6 - 6), 0.5, sp.z - sp.nx * j + sp.nz * (SR() * 6 - 6)], v: [sp.nx * (6 + SR() * 14), vv, sp.nz * (6 + SR() * 14)],
      t0: T_IMP + 4 + SR() * 0.25, size: nearK ? 2.5 + SR() * 3 : 6 + SR() * 9, drag: 0.5, life: 8, kind: 1 }); }
}
// THE ERUPTION: the deep bay held the most water (up to 28 m), so it rebounds hardest: ~160 coherent jets across the bay, 60-150 m
// up by the end of the shot (top speed 60-110 m/s scaled by the depth), crowned with droplets; side-lit by the sun
const sunH = new THREE.Vector2(SUN.x, SUN.z).normalize();
const ridge = (x, z) => 0.72 + 0.28 * Math.sin(x * 0.011 + 0.7) * Math.sin(z * 0.009 + 1.9) + 0.18 * Math.sin(x * 0.037 - z * 0.029);   // towers and dips along the wall
for (let i = 0, nj = 0; i < 20000 && nj < 190; i++) { const c = CAM.clone().addScaledVector(dirB(BEAR + (SR() - 0.5) * 70), 240 + Math.pow(SR(), 1.3) * 1100);
  const sf = sField(c.x, c.z); if (sf > -110) continue; nj++;
  const df = clamp(-groundH(c.x, c.z) / 28, 0.3, 1), d = camD(c.x, c.z), vmax = (78 + 44 * SR()) * (0.55 + 0.45 * Math.pow(df, 0.7)) * ridge(c.x, c.z);
  const tx = (SR() - 0.5) * 0.24, tz = (SR() - 0.5) * 0.24, m = 120 + Math.floor(SR() * 80), rad = 8 + SR() * 14;
  for (let k = 0; k < m; k++) { const u = k % 2 ? 0.15 + 0.85 * Math.sqrt(SR()) : 0.12 + 0.6 * SR(), a2 = SR() * 6.283, rr = Math.sqrt(SR()) * rad, ox = Math.cos(a2), oz = Math.sin(a2), kind = SR() < (u > 0.85 ? 0.35 : 0.7) ? 1 : 0;
    const jx = tx + (SR() - 0.5) * 0.07 + ox * 0.05, jz = tz + (SR() - 0.5) * 0.07 + oz * 0.05;
    parts.push({ p: [c.x + ox * rr, 0.5 + SR() * 2, c.z + oz * rr], v: [jx * vmax * u, vmax * u, jz * vmax * u], shade: 0.6 + 0.4 * Math.max(0, ox * sunH.x + oz * sunH.y) + 0.12 * (u - 0.5),
      t0: T_IMP + 4 + SR() * 0.12, size: kind === 1 ? (3 + SR() * 6) * (0.55 + d / 1100) : (0.8 + SR() * 1.6) * (0.6 + d / 1200), drag: kind === 1 ? 0.12 : 0.05, life: 8, kind }); } }
for (let i = 0; i < 3500; i++) { const p = CAM.clone().addScaledVector(dirB(BEAR + (SR() - 0.5) * 64), 140 + Math.pow(SR(), 0.8) * 1500); if (sField(p.x, p.z) > -15) continue;   // and low white water between them
  parts.push({ p: [p.x, 0.3, p.z], v: [(SR() - 0.5) * 8, 4 + SR() * 12, (SR() - 0.5) * 8], t0: T_IMP + 4 + SR() * 0.2, size: 5 + SR() * 8, drag: 0.4, life: 8, kind: 1 }); }
// spray off the surge front as it runs inland (our shore only)
for (let k = 0; k < 40; k++) { const ts = 0.05 + k * 0.05, front = OU.surgeR.value * (1 - Math.exp(-ts * OU.surgeV.value / OU.surgeR.value)), fv = OU.surgeV.value * Math.exp(-ts * OU.surgeV.value / OU.surgeR.value);
  for (const sp of shore) { if (camD(sp.x, sp.z) > 360 || SR() > 0.3) continue; const x = sp.x + sp.nx * front, z = sp.z + sp.nz * front, g = groundH(x, z);
    parts.push({ p: [x + (SR() - 0.5) * 4, g + 1 + SR() * 3, z + (SR() - 0.5) * 4], v: [sp.nx * fv * 0.7 + (SR() - 0.5) * 5, 5 + SR() * 12, sp.nz * fv * 0.7 + (SR() - 0.5) * 5],
      t0: T_IMP + 4 + ts, size: SR() < 0.4 ? 1.5 + SR() * 2.5 : 0.5 + SR() * 0.8, drag: 0.5, life: 2, kind: SR() < 0.4 ? 1 : 0 }); } }
const spray = createSpray(S, parts);
{ const ob = ocean.refl.onBeforeRender; ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob(r, sc, cam); spray.mesh.visible = true; }; }   // no spray in the mirror
spray.U.sunDir.value.copy(SUN); spray.U.hazeD.value = 4000; spray.U.streak.value = +(Q.get("stk") ?? 1 / 15);   // long streaks: jets of water, not flakes
console.log('spray particles', parts.length, 'boats', boats.length, 'impact at shot t', T_IMP.toFixed(3));
const q = new THREE.Quaternion(), e = new THREE.Euler(), bp = new THREE.Vector3();
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s05_crash', tt), H = heightAt(tau, T), ts = tt - T_IMP;   // ts: seconds since the impact
  // camera: bolted to the roof; the building shudders at the impact
  const kk = kick(tt, T_IMP, 1.6), sh = shake(t, 0.03 + 1.1 * kk, 7 + 3 * kk, 5);
  const dir = dirB(BEAR); dir.y = Math.tan(PITCH * D2R); dir.normalize();
  applyCam(camera, { pos: CAM, look: CAM.clone().add(dir), mm: MM, roll: 0 }, sh);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  OU.sunDir.value.copy(SUN); OU.sunI.value = 1.0; OU.moonI.value = 0; OU.moonDir.value.copy(SUN); OU.lift.value = H;
  OU.churn.value = ts > 0 ? sstep(0, 0.12, ts) : 0; OU.surgeT.value = ts > 0 ? ts : -1;
  OU.amp.value = ts > 0 ? 0.45 + 1.4 * sstep(0, 0.4, ts) : 0.45;
  ocean.refl.visible = ts < 0.25;                                     // after the slam the bay is white water: no mirror needed
  ocean.mesh.update(S, t);
  bay.update(S, t, { waveAmp: 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: CAM.clone() });
  spray.update(t);
  // boats: ride the falling sea; at the impact they are flung; ours ride the surge front inland, tumbling
  boats.forEach((b, i) => {
    let x = b.x, z = b.z, y, rx = 0, rz = 0, yaw = b.yaw;
    if (ts <= 0) { y = H + waveHeight(x, z, t, 0.45, 0) + 0.1; rx = 0.05 * Math.sin(t * 1.3 + b.ph); rz = 0.06 * Math.sin(t * 1.1 + b.ph); }
    else if (b.carry) { const [gx, gz] = sGrad(x, z), gl = Math.hypot(gx, gz) || 1, nx = gx / gl, nz = gz / gl;
      const R0 = OU.surgeR.value, V0 = OU.surgeV.value, travel = (b.sEnd - b.s0) * (1 - Math.exp(-ts * V0 * 0.9 / (b.sEnd - b.s0)));
      x = b.x + nx * travel; z = b.z + nz * travel; const s = sField(x, z), front = R0 * (1 - Math.exp(-ts * V0 / R0));
      const W = 10.5 * (1 - 0.35 * clamp(s / Math.max(front, 1))) * sstep(-320, -30, s) * sstep(-1.5, 9, front - s);
      y = Math.max(W, groundH(x, z) + 0.6) + 0.4 * Math.sin(ts * 5 + b.ph); yaw = b.yaw + b.spin * ts; rx = b.roll * Math.sin(ts * 2.2 + b.ph) * 0.6; rz = b.roll * ts * 0.5; }
    else { y = waveHeight(x, z, t, 1.6, 0) + 2.5 * Math.sin(x * 0.031 + t * 1.3) * Math.sin(z * 0.027 - t * 1.1) + 3 * sstep(0, 0.3, ts) * Math.exp(-ts * 1.5) * Math.sin(ts * 9 + b.ph);
      rx = 0.35 * Math.sin(ts * 3 + b.ph); rz = 0.4 * Math.sin(ts * 2.6 + b.ph * 2); yaw = b.yaw + b.spin * ts * 0.4; }
    q.setFromEuler(e.set(rx, yaw, rz, 'YXZ')); BT.setBoat(i, bp.set(x, y, z), q, b.L);
  });
  BT.commit();
});
