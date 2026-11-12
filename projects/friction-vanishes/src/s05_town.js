// s05_town (film 17.5-22.0, step 2, tau 55.5 -> 60). The bay in daylight from the headland, 50 mm, slow push. Friction has been gone
// for 55 s: the hillside town drains. Every loose thing (cars, benches, bins, tables, boats on trailers) slides down the town's own
// ground (bay groundH) by the SAME law as the hill street (a = g x slope - (k/m) v|v|, story.js KM), integrated once at load; buildings
// hold (DRAMATIZATION), so things pile against them or pour down the gaps between them (the streets), over the promenade wall and the
// drowned beach into the bay, where water drag stops them in the shallows. The beach sand has slumped (grains have no friction either):
// terrain + ocean depth lowered along the shore by up to 2 m (groupB patch). Water near shore churned brown-green. At tau 60 (film
// 22.0, the cut) grip returns: the hard cut lands on it. Opens on the tail of s04's muddy spray wipe clearing off the lens.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, rng, sstep } from '@engine/util.js';
import { waveHeight } from '@engine/ocean.js';
import { createSpray, createBoats } from '@engine/splash.js';
import { GROUND_GLSL, groundH, sField, sGrad } from '@engine/bay.js';
import { bayWorld, looseCity, poseCars, poseProps, POST_DAY, SUN, qn, D2R } from './kit.js';
import { tauAt, KM, G0 } from './story.js';
import { darkSpray, hideFromMirror } from './groupB_kit.js';
const S = createStudio({ samples: (t) => (t - 4 < 0.4 ? 12 : 8), shadows: false, near: 0.5, post: POST_DAY });
const W = bayWorld(S, {});
const { bay, ocean } = W;
const TAU0 = 55.5, page = (tau) => tau - TAU0 + 4;
// ---------- the slumped beach (JS + GLSL twins). D(tau): the sand let go from tau 0 and was flat by ~30 s ----------
const SLUMP = 1.6, slumpF = (s) => sstep(-30, -5, s) * (1 - sstep(8, 22, s)), slumpD = (tau) => SLUMP * clamp(tau / 30);
const SLUMP_GLSL = `uniform float uSlump; float slumpF(float s){ return smoothstep(-30., -5., s)*(1. - smoothstep(8., 22., s)); }`;
const gH = (x, z, tau = 60) => groundH(x, z) - slumpD(tau) * slumpF(sField(x, z));
{ // ocean: depth from the slumped ground + brown-green churn near the shore
  const m = ocean.mesh.material, G2 = GROUND_GLSL.replace('float groundH(vec2 p){', 'float groundH0(vec2 p){') + '\n' + SLUMP_GLSL + '\nfloat groundH(vec2 p){ return groundH0(p) - uSlump*slumpF(sField(p)); }';
  m.uniforms.uSlump = { value: SLUMP }; m.uniforms.uMud = { value: qn('mud', 1) };
  const sw = (s, a, b) => { if (!s.includes(a)) throw new Error('s05 ocean patch missed: ' + a.slice(0, 40)); return s.replace(a, b); };
  m.vertexShader = sw(m.vertexShader, GROUND_GLSL, G2); m.fragmentShader = sw(m.fragmentShader, GROUND_GLSL, G2 + '\nuniform float uMud;');
  m.fragmentShader = sw(m.fragmentShader, 'col = mix(col, foamLit, foam*0.85);', `col = mix(col, foamLit, foam*0.85);
    { float sF = sField(vWP.xz); float n1 = fbm2(vWP.xz*0.018 + vec2(time*0.02, -time*0.015)), n2 = fbm2(vWP.xz*0.07 - time*0.05);
      float mud = smoothstep(-150., -8., sF + 60.*(n1 - 0.5)) * (0.6 + 0.4*n2) * uMud;
      vec3 mudC = mix(vec3(0.30,0.21,0.11), vec3(0.22,0.20,0.10), n2) * (0.45 + sunCol*sunI*0.6*max(sunDir.y, 0.));
      col = mix(col, mix(mudC, R, F*0.45), clamp(mud, 0., 0.9)); }`);
  m.fragmentShader = sw(m.fragmentShader, 'float a = smoothstep(-0.05, 0.25, vDepth);', 'float a = smoothstep(-0.05, 0.25, level - groundH(vWP.xz));');   // per-pixel waterline
  m.needsUpdate = true;
  // terrain: lower the beach in the vertex shader
  const tm = bay.terrain.material, ob = tm.onBeforeCompile;
  tm.onBeforeCompile = (sh, r) => { ob(sh, r); sh.uniforms.uSlump = { value: SLUMP };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GROUND_GLSL + '\n' + SLUMP_GLSL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y -= uSlump*slumpF(sField(position.xz));'); };
  tm.customProgramCacheKey = () => 'fv-s05-slump'; tm.needsUpdate = true;
}
// ---------- camera: on the headland, looking along the bay's arm (town on the shore), 50 mm, slow push ----------
const CX = qn('cx', -470), CZ = qn('cz', -1520), CAM0 = new THREE.Vector3(CX, Math.max(groundH(CX, CZ), 0) + qn('ch', 30), CZ);
const LOOK = new THREE.Vector3(qn('lx', -720), qn('ly', -30), qn('lz', -1120)), MM = qn('mm', 50);
const fwd = LOOK.clone().sub(CAM0).setY(0).normalize();
{ // the headland's own buildings right in front of the lens would fill a third of the frame: they go
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), M = bay.buildings;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, s); if (Math.hypot(p.x - CX, p.z - CZ) < qn('clr', 260)) { M.setMatrixAt(i, m4.makeScale(0, 0, 0)); } }
  M.instanceMatrix.needsUpdate = true; }
// ---------- buildings: footprints in a grid (things can't pass through them: they hold) ----------
const BL = []; { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler(), M = bay.buildings;
  for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(p, q, s); if (s.x < 0.01) continue; e.setFromQuaternion(q, 'YXZ'); BL.push({ x: p.x, z: p.z, c: Math.cos(e.y), sn: Math.sin(e.y), hw: s.x / 2 + 1.2, hd: s.z / 2 + 1.2 }); } }
const CELL = 30, grid = new Map(), key = (i, j) => i * 100003 + j;
BL.forEach((b) => { const r = Math.hypot(b.hw, b.hd); for (let i = Math.floor((b.x - r) / CELL); i <= Math.floor((b.x + r) / CELL); i++) for (let j = Math.floor((b.z - r) / CELL); j <= Math.floor((b.z + r) / CELL); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); } });
const inBuilding = (x, z) => { const l = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))); if (!l) return false;
  for (const b of l) { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.sn, lz = dx * b.sn + dz * b.c; if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return true; } return false; };
// ---------- the slide, integrated once from rest (dt 0.05 s, up to 60.2 s). Land: g along the local slope minus air drag (story.js KM);
// water: buoyant (gravity x 0.3) with heavy water drag, so they glide into the shallows and stall there (staged).
// DRAMATIZATION (staged release): most loose things first jammed in piles against the buildings (which hold); piles let go one after
// another, so each object starts its slide from rest at its own release time o.tr (>= 0). Same law, staged start. ----------
const DT = 0.05, NS = Math.ceil(60.3 / DT);
function integrate(x0, z0, kw = 0.06) {
  const X = new Float32Array(NS + 1), Z = new Float32Array(NS + 1); let x = x0, z = z0, vx = 0, vz = 0, tw = -1, blocked = false;
  for (let i = 0; i <= NS; i++) { X[i] = x; Z[i] = z; const tau = i * DT;
    if (blocked) continue;
    const e = 0.8, h = gH(x, z), gx = (gH(x + e, z) - gH(x - e, z)) / (2 * e), gz = (gH(x, z + e) - gH(x, z - e)) / (2 * e), g2 = 1 + gx * gx + gz * gz;
    const wet = h < -0.6, v = Math.hypot(vx, vz), kg = wet ? 0.3 : 1, kd = wet ? kw : KM;
    if (wet && tw < 0) tw = tau;
    vx += (-G0 * kg * gx / g2 - kd * v * vx) * DT; vz += (-G0 * kg * gz / g2 - kd * v * vz) * DT;
    const nx = x + vx * DT, nz = z + vz * DT;
    if (inBuilding(nx, nz)) { blocked = true; vx = vz = 0; continue; }
    x = nx; z = nz; }
  return { X, Z, tw, blocked };
}
const at = (o, tau) => { const f = clamp((tau - (o.tr || 0)) / DT, 0, NS - 1e-3), i = Math.floor(f), u = f - i; return [o.X[i] + (o.X[i + 1] - o.X[i]) * u, o.Z[i] + (o.Z[i + 1] - o.Z[i]) * u]; };
// candidates: loose things on the land inside the camera's view wedge; keep the ones whose slide is in view during the shot
const C = looseCity(S, { cars: 300, props: 260, seed: 31 });
const R = rng(505), view = (x, z, deg = 15, far = 1400) => { const d = new THREE.Vector3(x - CAM0.x, 0, z - CAM0.z); const L = d.length(); if (L < 120 || L > far) return false; return Math.abs(Math.atan2(d.x * fwd.z - d.z * fwd.x, d.x * fwd.x + d.z * fwd.z)) < deg * D2R; };
const objs = [];
// arrive: the absolute water-entry window [a0, a1] wanted for this group; the release time is chosen so the slide (from rest) ends there
function pickStarts(n, sMin, sMax, a0, a1, tag) {
  for (let tries = 0; tries < 9000 && n > 0; tries++) {
    const a = R() * Math.PI * 2, r = 800 + sMin + R() * (sMax - sMin), x = Math.sin(a) * r, z = -800 + Math.cos(a) * r;
    const s = sField(x, z); if (s < sMin || s > sMax || !view(x, z, 22, 1700) || inBuilding(x, z)) continue;
    const o = integrate(x, z, tag === 'boat' ? 0.12 : 0.06); if (o.blocked || o.tw < 0 || o.tw > a1) continue;
    o.tr = Math.max(0, a0 + R() * (a1 - a0) - o.tw); o.tw += o.tr;
    const [xe, ze] = at(o, 57.7); if (!view(xe, ze, 13)) continue;
    o.tag = tag; o.seed = R(); o.yaw = Math.atan2(...sGrad(x, z)) + Math.PI / 2 + (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.3; o.w = R() < 0.3 ? (R() - 0.5) * 1.2 : 0;
    objs.push(o); n--; }
}
pickStarts(qn('np', 130), 35, 600, 54.5, 61, 'car');       // pouring over the promenade during the shot
pickStarts(qn('nn', 70), 35, 400, 30, 54.5, 'car');        // already in the shallows
pickStarts(qn('nc', 60), 60, 600, 61, 72, 'car');          // still sliding through the town
pickStarts(70, 32, 600, 40, 61, 'prop');
pickStarts(8, 4, 36, 45, 60, 'boat');
if (qn('dbg', 0)) console.error('s05 objs', objs.length, 'cars', objs.filter((o) => o.tag === 'car').length, 'in-shot entries', objs.filter((o) => o.tw > 55.5 && o.tw < 60).length);
// bind to instances
const cars = objs.filter((o) => o.tag === 'car'), props = objs.filter((o) => o.tag === 'prop'), boats = objs.filter((o) => o.tag === 'boat');
cars.forEach((o, i) => { if (i < C.cars.length) o.c = C.cars[i]; }); props.forEach((o, i) => { if (i < C.props.length) o.p = C.props[i]; });
const BT = createBoats(S, Math.max(boats.length, 1), { seed: 21 });
// ---------- splashes where things hit the water during (or just before) the shot ----------
const SR = rng(55), parts = [];
for (const o of objs) { if (o.tw < TAU0 - 3.5 || o.tw > 60.2) continue;
  const i = Math.round((o.tw - o.tr) / DT), x = o.X[i], z = o.Z[i], vx = (o.X[i] - o.X[i - 1]) / DT, vz = (o.Z[i] - o.Z[i - 1]) / DT, v = Math.hypot(vx, vz), k = clamp(v / 20, 0.3, 1.6) * (o.tag === 'prop' ? 0.3 : o.tag === 'boat' ? 1.3 : 1);
  for (let n = 0; n < 60 * k; n++) { const kind = SR() < 0.25 ? 1 : 0, f = SR() < 0.5, a = SR() * 6.283, vh = f ? v * (0.15 + 0.35 * SR()) : 1 + 4 * SR();
    parts.push({ p: [x + (SR() - 0.5) * 2, 0.2, z + (SR() - 0.5) * 2], v: f ? [vx / v * vh + (SR() - 0.5) * 3, 2 + 7 * SR() * k, vz / v * vh + (SR() - 0.5) * 3] : [Math.cos(a) * vh, 3 + 9 * SR() * k, Math.sin(a) * vh],
      t0: page(o.tw) + SR() * 0.2, size: kind ? 0.9 + SR() * 1.6 : 0.25 + SR() * 0.4, drag: kind ? 0.4 : 0.15, life: 4, kind, shade: 0.85 }); } }
const spray = createSpray(S, parts, { hazeD: 4000 }); spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 20;
// the tail of s04's muddy wipe: big dark drops right on the lens, falling out of frame in the first 0.4 s
const TR = rng(66), tail = [];
for (let k = 0; k < 900; k++) { const d = 0.6 + TR() * 3.5, ux = (TR() - 0.5) * 1.3, uy = (TR() - 0.5) * 2.0 + 0.4;
  const p = CAM0.clone().addScaledVector(fwd, d).add(new THREE.Vector3(-fwd.z * ux * d, uy * d, fwd.x * ux * d));
  tail.push({ p: [p.x, p.y, p.z], v: [(TR() - 0.5) * 3, -2 - TR() * 6, (TR() - 0.5) * 3], t0: 3.55 + TR() * 0.3, size: TR() < 0.5 ? 0.12 + TR() * 0.4 : 0.03 + TR() * 0.05, drag: 0.05, life: 1.1, kind: TR() < 0.55 ? 1 : 0, shade: 0.6 }); }
const wipe = darkSpray(S, tail, { amb: 0x3b3326, sunI: 0.3 }); wipe.U.sunDir.value.copy(SUN);
hideFromMirror(ocean, [spray.mesh, wipe.mesh]);
// ---------- pose ----------
const up = new THREE.Vector3(0, 1, 0), qn_ = new THREE.Quaternion(), qy = new THREE.Quaternion(), nrm = new THREE.Vector3();
function poseOf(o, tau, t) {
  const [x, z] = at(o, tau), h = gH(x, z, tau), e = 1.2, gx = (gH(x + e, z) - gH(x - e, z)) / (2 * e), gz = (gH(x, z + e) - gH(x, z - e)) / (2 * e);
  const yaw = o.yaw + o.w * tau; qy.setFromAxisAngle(up, yaw);
  if (h > -0.6) { qn_.setFromUnitVectors(up, nrm.set(-gx, 1, -gz).normalize()); return { p: new THREE.Vector3(x, h, z), q: qn_.clone().multiply(qy) }; }
  const dw = o.tw > 0 ? Math.max(tau - o.tw, 0) : 0, float = o.tag === 'boat' ? 0.1 : o.tag === 'prop' ? -0.15 : -0.7 - 0.25 * Math.min(dw / 6, 1);
  const y = Math.max(h, float + waveHeight(x, z, t, 0.45, 0) * 0.8);
  const rk = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25 * Math.sin(dw * 1.3 + o.seed * 7) * (o.tag === 'boat' ? 0.4 : 1), 0, 0.2 * Math.sin(dw * 1.1 + o.seed * 3)));
  return { p: new THREE.Vector3(x, y, z), q: qy.clone().multiply(rk) };
}
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s05_town', tt), u = ease.inOutSine(clamp(tt / 4.5));
  const pos = CAM0.clone().addScaledVector(fwd, 30 * u); pos.y -= 2 * u;                  // slow push along the arm
  applyCam(S.camera, { pos, look: LOOK, mm: MM + 4 * u, roll: 0 }, shake(t, 0.025, 0.6, 7));
  W.update(S, t, { focus: LOOK });
  poseCars(C, (c, i) => { const o = cars[i]; return o && o.c ? poseOf(o, tau, t) : null; });
  poseProps(C, (p, i) => { const o = props.find((q) => q.p === p); return o ? poseOf(o, tau, t) : null; });
  boats.forEach((o, i) => { const P = poseOf(o, tau, t); BT.setBoat(i, P.p.add(new THREE.Vector3(0, 0.5, 0)), P.q, 7 + o.seed * 5); }); BT.commit();
  spray.update(t); wipe.update(t);
});
