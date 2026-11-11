// Organic human silhouettes: a posed signed-distance body (smooth-blended ellipsoids + round cones, real
// proportions, clothing, hair, bags) polygonized with surface nets at load time. No faces, no mannequin seams.
// Figures face -Z (away from a camera at +Z). Units: metres, feet on y = 0.
import * as THREE from 'three';

// ---------- small vector helpers (plain arrays, no allocation in the hot loop) ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const rotX = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const rotY = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const rotZ = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
// direction of a limb hanging down (0,-1,0), raised forward by `pitch` (toward -Z), out sideways by `abd`
const limbDir = (pitch, abd, side) => rotX(rotZ([0, -1, 0], side * abd), pitch); // legs
// 3x3 rotation (row-major array) from a lean (x), twist (y), roll (z)
function rotM(rx, ry, rz) {
  const e = new THREE.Euler(rx, ry, rz, 'YXZ'); const m = new THREE.Matrix4().makeRotationFromEuler(e).invert().elements; // inverse: world->local
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

// ---------- the body ----------
// Arms are posed by HAND TARGETS (two-bone IK, elbow pole hint), in body coords before lean (x right, y up, -z forward).
// Legs: [hipPitch, abduction, kneeBend] radians. head: [yaw, pitchUp]. lean: forward is negative. hip: weight shift.
const HANG = { R: { t: [0.235, 0.84, -0.02], pole: [0.4, 0, 0.6] }, L: { t: [-0.235, 0.84, -0.02], pole: [-0.4, 0, 0.6] } };
export const POSES = {
  stand: { R: HANG.R, L: { t: [-0.2, 0.86, -0.08], pole: [-0.4, 0, 0.6] }, legR: [0.02, 0.04, 0.03], legL: [-0.07, 0.07, 0.14], lean: 0.02, hip: 0.05 },
  phoneUp: { R: { t: [0.1, 1.86, -0.4], pole: [1, -0.5, 0.2] }, L: HANG.L, legR: [0.03, 0.05, 0.04], legL: [-0.08, 0.07, 0.14], lean: -0.03, head: [0, 0.22], hip: 0.05, phone: 'R' },
  filming: { R: { t: [0.06, 1.5, -0.4], pole: [1, -1, 0.3] }, L: { t: [-0.06, 1.5, -0.4], pole: [-1, -1, 0.3] }, legR: [0.02, 0.06, 0.04], legL: [-0.05, 0.06, 0.1], lean: -0.02, head: [0, 0.1], phone: 'both' },
  point: { R: { t: [0.3, 2.12, -0.48], pole: [1, -0.2, 0] }, L: HANG.L, legR: [0.05, 0.06, 0.05], legL: [-0.1, 0.06, 0.15], lean: -0.04, head: [0, 0.3], hip: -0.04 },
  handsHead: { R: { t: [0.07, 1.8, 0.0], pole: [1, 0.2, 0] }, L: { t: [-0.07, 1.8, 0.0], pole: [-1, 0.2, 0] }, legR: [0.02, 0.07, 0.05], legL: [-0.03, 0.07, 0.06], lean: 0.05, head: [0, 0.25] },
  shade: { R: { t: [0.03, 1.67, -0.15], pole: [1, -0.4, 0.1] }, L: HANG.L, legR: [0.04, 0.05, 0.05], legL: [-0.07, 0.06, 0.12], lean: -0.03, head: [0, 0.22], hip: 0.04 },
  arms: { R: { t: [-0.09, 1.2, -0.16], pole: [1, -1, 0.4] }, L: { t: [0.09, 1.17, -0.15], pole: [-1, -1, 0.4] }, legR: [0.02, 0.05, 0.04], legL: [-0.04, 0.05, 0.08], lean: 0.03 },
  rail: { R: { t: [0.17, 1.03, -0.52], pole: [0.6, -1, 0.4] }, L: { t: [-0.17, 1.03, -0.52], pole: [-0.6, -1, 0.4] }, legR: [0.22, 0.06, 0.12], legL: [-0.12, 0.06, 0.08], lean: -0.42, head: [0, 0.32] },
  pocket: { R: { t: [0.19, 0.98, -0.03], pole: [0.8, 0, 0.5] }, L: { t: [-0.19, 0.98, -0.03], pole: [-0.8, 0, 0.5] }, legR: [0.0, 0.04, 0.02], legL: [-0.1, 0.08, 0.16], lean: 0.01, hip: 0.06, head: [0.2, 0.15] },
};
// material slots (vertex attribute aSlot): 0 skin, 1 hair, 2 top, 3 bottom, 4 shoes, 5 bag
function ik(S, T, l1, l2, pole) {
  let d = [T[0] - S[0], T[1] - S[1], T[2] - S[2]]; let L = Math.hypot(...d); const maxL = (l1 + l2) * 0.995;
  if (L > maxL) { d = mul(d, maxL / L); L = maxL; } const u = mul(d, 1 / L);
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const pd = pole[0] * u[0] + pole[1] * u[1] + pole[2] * u[2]; let p = [pole[0] - u[0] * pd, pole[1] - u[1] * pd, pole[2] - u[2] * pd];
  const pl = Math.hypot(...p) || 1; p = mul(p, 1 / pl);
  const elbow = add(add(S, mul(u, a)), mul(p, h)); return { elbow, hand: add(S, d) };
}
export function bodyPrims(o = {}) {
  const P = { ...POSES.stand, ...(o.pose || {}) };
  const H = o.height ?? 1.75, s = H / 1.75, w = o.build ?? 1.0, fem = o.fem ?? 0.0;
  const prims = [];
  const E = (c, r, m, k = 0.05, slot = 2) => prims.push({ t: 1, c, r, m: m || rotM(0, 0, 0), k, slot });
  const C = (a, b, r1, r2, k = 0.035, slot = 2) => prims.push({ t: 2, a, b, r1, r2, k, slot });
  const hipY = 0.94 * s, hipShift = (P.hip ?? 0) * 0.04;
  const pelvis = [hipShift, hipY, 0];
  const lean = P.lean ?? 0, tw = P.twist ?? 0, roll = (P.hip ?? 0) * 0.6;
  const up = (v) => add(pelvis, rotY(rotZ(rotX([v[0], v[1] - hipY, v[2]], lean), -roll), tw)); // body coords -> posed
  const M = rotM(lean, tw, -roll);
  const puff = o.puffer ? 1.16 : 1.0, sl = o.puffer ? 1.3 : (o.coat ? 1.12 : 1.0);
  const shW = (0.175 - 0.02 * fem) * w * s, hpW = (0.13 + 0.03 * fem) * w * s;
  // torso: pelvis, waist, ribcage, upper chest; soft trapezius slope into the neck
  E(up([0, hipY + 0.02 * s, 0.012]), [hpW + 0.03, 0.115 * s, 0.105 * s], M, 0.07, 3);
  E(up([0, hipY + 0.19 * s, 0.006]), [(0.14 - 0.012 * fem) * w * s * puff, 0.13 * s, 0.098 * s * puff], M, 0.09);
  E(up([0, hipY + 0.36 * s, 0.01]), [(0.158 - 0.012 * fem) * w * s * puff, 0.15 * s, 0.108 * s * puff], M, 0.08);
  const shR = up([shW, hipY + 0.47 * s, 0.02]), shL = up([-shW, hipY + 0.47 * s, 0.02]);
  const trap = up([0, hipY + 0.535 * s, 0.025]);
  C(trap, shR, 0.068 * s * puff, 0.056 * s * puff, 0.07); C(trap, shL, 0.068 * s * puff, 0.056 * s * puff, 0.07);   // sloped trapezius
  E(shR, [0.062 * s * sl, 0.065 * s, 0.065 * s], M, 0.05); E(shL, [0.062 * s * sl, 0.065 * s, 0.065 * s], M, 0.05);  // deltoids
  const neck0 = up([0, hipY + 0.5 * s, 0.012]), neck1 = up([0, hipY + 0.585 * s, 0.0]);
  C(neck0, neck1, 0.058 * s, 0.05 * s, 0.05, 0);
  // head
  const [hy, hp] = P.head || [0, 0];
  const hM = rotM(lean - hp, tw + hy, -roll);
  const hd = (v) => add(neck1, rotY(rotZ(rotX(mul(v, s), lean - hp), -roll), tw + hy));
  const headC = hd([0, 0.085, -0.012]);
  E(headC, [0.075 * s, 0.1 * s, 0.092 * s], hM, 0.03, 0);
  E(hd([0, 0.02, -0.07]), [0.055 * s, 0.05 * s, 0.05 * s], hM, 0.04, 0);                        // jaw (seen as profile edge)
  const hair = o.hair || 'short';
  if (hair === 'short') E(hd([0, 0.11, 0.012]), [0.082, 0.085, 0.09].map((v) => v * s), hM, 0.02, 1);
  if (hair === 'long') { E(hd([0, 0.105, 0.015]), [0.088, 0.092, 0.097].map((v) => v * s), hM, 0.02, 1); E(hd([0, -0.03, 0.06]), [0.1, 0.17, 0.055].map((v) => v * s), hM, 0.06, 1); }
  if (hair === 'bun') { E(hd([0, 0.105, 0.012]), [0.083, 0.088, 0.093].map((v) => v * s), hM, 0.02, 1); E(hd([0, 0.175, 0.07]), [0.05, 0.047, 0.047].map((v) => v * s), hM, 0.025, 1); }
  if (hair === 'pony') { E(hd([0, 0.105, 0.012]), [0.083, 0.088, 0.093].map((v) => v * s), hM, 0.02, 1); C(hd([0, 0.125, 0.085]), hd([0, -0.04, 0.12]), 0.034 * s, 0.016 * s, 0.03, 1); }
  if (hair === 'hood') { E(hd([0, 0.09, 0.03]), [0.108, 0.125, 0.118].map((v) => v * s), hM, 0.03, 2); E(up([0, hipY + 0.52 * s, 0.1 * s]), [0.14 * s, 0.075 * s, 0.065 * s], M, 0.07, 2); }
  if (hair === 'cap') { E(hd([0, 0.135, 0.0]), [0.087, 0.06, 0.097].map((v) => v * s), hM, 0.015, 5); E(hd([0, 0.085, 0.03]), [0.08, 0.06, 0.08].map((v) => v * s), hM, 0.02, 1); }
  if (hair === 'curly') E(hd([0, 0.115, 0.01]), [0.105, 0.105, 0.11].map((v) => v * s), hM, 0.03, 1);
  // arms (IK to hand targets)
  const phone = [];
  for (const [side, key, sh] of [[1, 'R', shR], [-1, 'L', shL]]) {
    const A = P[key] || HANG[key]; const T = up([A.t[0] * w, A.t[1] * s, A.t[2] * s]);
    const pole = rotY(rotX(A.pole, lean), tw);
    const { elbow, hand } = ik(sh, T, 0.3 * s, 0.27 * s, pole);
    C(sh, elbow, 0.056 * s * sl, 0.046 * s * sl, 0.05);
    C(elbow, hand, 0.046 * s * sl, 0.033 * s, 0.025);
    const fd = mul([hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]], 1 / (0.27 * s));
    C(hand, add(hand, mul(fd, 0.075 * s)), 0.03 * s, 0.024 * s, 0.03, 0);
    if (P.phone === 'both' ? side === 1 : P.phone === key) phone.push({ p: add(hand, mul(fd, 0.1 * s)), d: fd });
  }
  // legs
  for (const [side, key] of [[1, 'legR'], [-1, 'legL']]) {
    const [pi, ab, kn] = P[key];
    const hipJ = add(pelvis, [side * hpW * 0.6, -0.05 * s - side * (P.hip ?? 0) * 0.025, 0.005]);
    const d1 = limbDir(pi, ab, side); const knee = add(hipJ, mul(d1, 0.44 * s));
    const d2 = limbDir(pi - kn, ab * 0.4, side); const ankle = add(knee, mul(d2, 0.42 * s));
    const tr = o.wide ? 1.18 : 1.0;
    C(hipJ, knee, 0.088 * s * w * tr, 0.058 * s * tr, 0.06, 3);
    C(knee, ankle, 0.056 * s * tr, 0.04 * s * tr, 0.025, 3);
    E(add(ankle, [0, -0.04 * s, -0.055 * s]), [0.047 * s, 0.042 * s, 0.125 * s], rotM(0, 0, 0), 0.025, 4);
  }
  if (o.coat) { const L = o.coat; C(up([0, hipY + 0.38 * s, 0.012]), up([0, hipY + (0.02 - L * 0.5) * s, 0.02]), 0.155 * w * s, (0.165 + 0.07 * L) * w * s, 0.07); }
  if (o.skirt) C(up([0, hipY + 0.05 * s, 0.01]), [hipShift, hipY - 0.36 * s, 0.01], 0.14 * w * s, 0.19 * w * s, 0.06, 3);
  if (o.bag === 'backpack') E(up([0, hipY + 0.33 * s, 0.155 * s]), [0.135 * s, 0.18 * s, 0.07 * s], M, 0.035, 5);
  if (o.bag === 'tote') { E(add(pelvis, [-0.22 * s, 0.02 * s, 0.03]), [0.03 * s, 0.15 * s, 0.13 * s], rotM(0, 0, 0.08), 0.02, 5); C(shL, add(pelvis, [-0.22 * s, 0.15 * s, 0.03]), 0.012, 0.012, 0.02, 5); }
  return { prims, phone, headC };
}

// ---------- SDF evaluation ----------
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function sdEll(px, py, pz, p) {
  const m = p.m; const dx = px - p.c[0], dy = py - p.c[1], dz = pz - p.c[2];
  const lx = (m[0] * dx + m[1] * dy + m[2] * dz) / p.r[0], ly = (m[3] * dx + m[4] * dy + m[5] * dz) / p.r[1], lz = (m[6] * dx + m[7] * dy + m[8] * dz) / p.r[2];
  const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
  const k1 = Math.sqrt((lx / p.r[0]) ** 2 + (ly / p.r[1]) ** 2 + (lz / p.r[2]) ** 2);
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(...p.r);
}
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
export function slotAt(prims, x, y, z) {
  let best = 1e9, slot = 2;
  for (const p of prims) { const d = p.t === 1 ? sdEll(x, y, z, p) : sdRoundCone(x, y, z, p.a, p.b, p.r1, p.r2); if (d < best) { best = d; slot = p.slot ?? 2; } }
  return slot;
}
export function makeSDF(prims) {
  // bounding spheres to skip far primitives
  for (const p of prims) {
    if (p.t === 1) { p.bc = p.c; p.br = Math.max(...p.r); }
    else { p.bc = mul(add(p.a, p.b), 0.5); p.br = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) / 2 + Math.max(p.r1, p.r2); }
  }
  return (x, y, z) => {
    let d = 1e9;
    for (const p of prims) {
      const bx = x - p.bc[0], by = y - p.bc[1], bz = z - p.bc[2];
      const lb = Math.sqrt(bx * bx + by * by + bz * bz) - p.br;
      if (lb > d + p.k) continue;
      const di = p.t === 1 ? sdEll(x, y, z, p) : sdRoundCone(x, y, z, p.a, p.b, p.r1, p.r2);
      d = d > 1e8 ? di : smin(d, di, p.k);
    }
    return d;
  };
}

// ---------- surface nets polygonizer ----------
export function surfaceNets(f, bmin, bmax, h, slotFn) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const V = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[id(i, j, k)] = f(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const CV = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const [a, b, d] = corners[c]; cv[c] = V[id(i + a, j + b, k + d)]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [e0, e1] of edges) {
      const v0 = cv[e0], v1 = cv[e1]; if ((v0 < 0) === (v1 < 0)) continue;
      const t = v0 / (v0 - v1); const c0 = corners[e0], c1 = corners[e1];
      sx += c0[0] + (c1[0] - c0[0]) * t; sy += c0[1] + (c1[1] - c0[1]) * t; sz += c0[2] + (c1[2] - c0[2]) * t; n++;
    }
    CV[cid(i, j, k)] = pos.length / 3;
    pos.push(bmin[0] + (i + sx / n) * h, bmin[1] + (j + sy / n) * h, bmin[2] + (k + sz / n) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = V[id(i, j, k)] < 0;
    if (v0 !== (V[id(i + 1, j, k)] < 0)) quad(CV[cid(i, j - 1, k - 1)], CV[cid(i, j, k - 1)], CV[cid(i, j, k)], CV[cid(i, j - 1, k)], !v0);
    if (v0 !== (V[id(i, j + 1, k)] < 0)) quad(CV[cid(i - 1, j, k - 1)], CV[cid(i - 1, j, k)], CV[cid(i, j, k)], CV[cid(i, j, k - 1)], !v0);
    if (v0 !== (V[id(i, j, k + 1)] < 0)) quad(CV[cid(i - 1, j - 1, k)], CV[cid(i, j - 1, k)], CV[cid(i, j, k)], CV[cid(i - 1, j, k)], !v0);
  }
  // normals from the SDF gradient (smooth shading)
  const nrm = new Float32Array(pos.length); const e = h * 0.5;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const L = Math.hypot(gx, gy, gz) || 1; nrm[v] = gx / L; nrm[v + 1] = gy / L; nrm[v + 2] = gz / L;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx);
  if (slotFn) { const sl = new Float32Array(pos.length / 3); for (let v = 0; v < sl.length; v++) sl[v] = slotFn(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); g.setAttribute('aSlot', new THREE.BufferAttribute(sl, 1)); }
  return g;
}

// build one figure geometry (+ phone anchors). res = cell size in metres (0.012 hero, 0.018 crowd)
export function figureGeometry(o = {}, res = 0.016) {
  const { prims, phone, headC } = bodyPrims(o);
  const f = makeSDF(prims);
  const H = (o.height ?? 1.75);
  const g = surfaceNets(f, [-0.75, -0.04, -0.75], [0.75, H * 1.32, 0.75], res, (x, y, z) => slotAt(prims, x, y, z));
  g.userData = { phone, headC };
  return g;
}

// Material: per-vertex slot -> colour. Per-instance palette via InstancedBufferAttributes aHair, aTop, aBot (vec3);
// non-instanced meshes use uniforms. Plus a rim light from the bright sky/moon behind the figures.
export function figureMaterial(o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0 });
  const U = { rimCol: { value: new THREE.Color(o.rimCol ?? 0xcfdcff) }, rimI: { value: o.rimI ?? 0.6 }, rimDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
    uHair: { value: new THREE.Color(o.hair ?? 0x1a1410) }, uTop: { value: new THREE.Color(o.top ?? 0x2b2f38) }, uBot: { value: new THREE.Color(o.bot ?? 0x1c1d22) },
    uSkin: { value: new THREE.Color(o.skin ?? 0x6b4a3a) }, uShoe: { value: new THREE.Color(0x111111) }, uBag: { value: new THREE.Color(o.bag ?? 0x3a2f26) } };
  const inst = !!o.instanced;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aSlot; varying float vSlot; ${inst ? 'attribute vec3 aHair, aTop, aBot; varying vec3 vHair, vTop, vBot;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vSlot = aSlot; ${inst ? 'vHair = aHair; vTop = aTop; vBot = aBot;' : ''}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 rimCol, rimDir, uHair, uTop, uBot, uSkin, uShoe, uBag; uniform float rimI; varying float vSlot;
      ${inst ? 'varying vec3 vHair, vTop, vBot;' : ''}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 cH = ${inst ? 'vHair' : 'uHair'}, cT = ${inst ? 'vTop' : 'uTop'}, cB = ${inst ? 'vBot' : 'uBot'};
          float sl = floor(vSlot + 0.5);
          vec3 c = sl < 0.5 ? uSkin : sl < 1.5 ? cH : sl < 2.5 ? cT : sl < 3.5 ? cB : sl < 4.5 ? uShoe : uBag;
          diffuseColor.rgb = c; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 Vv = normalize(vViewPosition); float fr = pow(1. - abs(dot(normal, -Vv)), 3.0);
          vec3 Lv = normalize((viewMatrix * vec4(rimDir, 0.)).xyz); float back = clamp(dot(-Vv, Lv)*0.5+0.5, 0., 1.);
          float side = clamp(dot(normal, Lv)*0.6 + 0.4, 0., 1.);
          totalEmissiveRadiance += rimCol * rimI * fr * side * (0.35 + 0.65*back); }`);
  };
  mat.U = U; return mat;
}
export const PALETTE = {
  hair: [0x0f0b08, 0x1c140e, 0x2e2118, 0x4a3a2a, 0x6b5a45, 0x8a8580, 0x121212],
  top: [0x262a33, 0x3a3f4a, 0x4b2a2a, 0x2c3a2e, 0x55504a, 0x6a5038, 0x1a1c22, 0x3d4f66, 0x5c3d52, 0x7a6a55],
  bot: [0x15161a, 0x22252c, 0x2b3445, 0x33302b, 0x1d1f24, 0x3b3a36],
};

// a varied cast of crowd variants (deterministic). Each: { geo, phone, opts }
export function castVariants(rng, poses, n = 14, res = 0.018) {
  const hairs = ['short', 'short', 'curly', 'hood', 'cap', 'short'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const fem = rng() < 0.5 ? 0.9 : 0.05;
    const o = {
      pose: POSES[poses[i % poses.length]], fem, height: fem > 0.5 ? 1.58 + rng() * 0.16 : 1.68 + rng() * 0.2, build: 0.88 + rng() * 0.3,
      hair: fem > 0.5 ? ['long', 'bun', 'pony', 'long', 'curly', 'hood'][Math.floor(rng() * 6)] : hairs[Math.floor(rng() * hairs.length)],
      coat: rng() < 0.45 ? 0.25 + rng() * 0.5 : 0, puffer: rng() < 0.2, skirt: fem > 0.5 && rng() < 0.2,
      bag: rng() < 0.25 ? 'backpack' : rng() < 0.15 ? 'tote' : 'none', wide: rng() < 0.2,
    };
    const geo = figureGeometry(o, res);
    out.push({ geo, phone: geo.userData.phone, opts: o });
  }
  return out;
}
