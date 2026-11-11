// Low-poly airliner: a generic twin-engine jet in a white/blue livery (NO real airline names or logos). About 2.1k triangles (2.7k with gear down).
// Units: metres. Plane space: nose toward -Z, up +Y, right wing +X, origin at the middle of the fuselage.
//
//   import { createPlane, createPlanes } from '@engine/planes.js';
//   const jet = createPlane(S, { gear: true });          // -> { root: Group, mesh, material, len, span, U }
//   jet.root.position.set(x, y, z); jet.root.quaternion.copy(q);   // place it like any Object3D (root is already in S.scene)
//   const fleet = createPlanes(S, 12, { scale: 1 });    // -> { mesh: InstancedMesh, set(i, pos, quat, scale = 1), len, span }
//   fleet.set(0, new THREE.Vector3(...), new THREE.Quaternion()); // call set() for every instance you use, each frame they move
// opts (all optional): len 40 | span 36 | scale 1 | gear false (landing gear down, on approach) | body 0xf3f5f8 (paint)
//   blue 0x163f8f (belly, tail) | accent 0x3d8fe0 (cheatline, tail sweep) | lights 1 (red/green wingtip nav lights, steady)
//   shadows false (castShadow/receiveShadow) | add true (add to S.scene) | instanced: see createPlanes.
// planeGeometry(opts) and planeMaterial(opts) are exported too (one merged geometry, one MeshStandardMaterial).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// part ids (aPart): 0 fuselage, 1 wing, 2 tailplane, 3 fin, 4 nacelle, 5 fan face, 6 exhaust/gear metal, 7 tyres, 8 nav light
function finish(g, part, uvFn) {
  const p = g.attributes.position, n = p.count;
  const a = new Float32Array(n).fill(part), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const r = uvFn ? uvFn(p.getX(i), p.getY(i), p.getZ(i), i) : [0, 0]; uv[i * 2] = r[0]; uv[i * 2 + 1] = r[1]; }
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  g.setAttribute('aPart', new THREE.BufferAttribute(a, 1)); g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
  return g;
}
// lathe around the Z axis: rings [[z, r, cy(centre y), ey(vertical squash)], ...], K segments, no seam (wrapped indices)
function lathe(rings, K, part, close = [false, false]) {
  const pos = [], idx = [], uv = [];
  rings.forEach(([z, r, cy = 0, ey = 1], j) => { for (let k = 0; k < K; k++) { const t = (k / K) * Math.PI * 2 - Math.PI / 2;
    pos.push(Math.cos(t) * r, cy + Math.sin(t) * r * ey, z); uv.push(j / (rings.length - 1), Math.sin(t)); } });
  for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < K; k++) { const a = j * K + k, b = j * K + (k + 1) % K, c = a + K, d = b + K; idx.push(a, b, c, b, d, c); }
  for (const [end, on] of [[0, close[0]], [1, close[1]]]) { if (!on) continue; const j = end ? rings.length - 1 : 0, [z, , cy = 0] = rings[j]; const ci = pos.length / 3; pos.push(0, cy, z); uv.push(end, 0);
    for (let k = 0; k < K; k++) { const a = j * K + k, b = j * K + (k + 1) % K; if (end) idx.push(ci, a, b); else idx.push(ci, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const u = new Float32Array(uv); return finish(g, part, (x, y, z, i) => [u[i * 2], u[i * 2 + 1]]);
}
// lofted airfoil surface. secs: [{x, y, z (leading edge), c (chord), t (thickness/chord)}] along the span (+X). Tip capped.
const AF = [0, 0.03, 0.12, 0.3, 0.55, 0.8, 1.0];
function airfoilLoop(t) {
  const yt = (x) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const up = AF.map((x) => [x, yt(x) * 1.15]), lo = AF.slice(1, -1).reverse().map((x) => [x, -yt(x) * 0.75]);
  return up.concat(lo);  // [chordFrac, yOffset/chord]
}
function wing(secs, part) {
  const pos = [], idx = [], uv = []; let L = 0;
  secs.forEach((s, j) => { const loop = airfoilLoop(s.t); L = loop.length;
    loop.forEach(([u, v]) => { pos.push(s.x, s.y + v * s.c, s.z + u * s.c); uv.push(u, j / (secs.length - 1)); }); });
  for (let j = 0; j < secs.length - 1; j++) for (let k = 0; k < L; k++) { const a = j * L + k, b = j * L + (k + 1) % L, c = a + L, d = b + L; idx.push(a, b, c, b, d, c); }
  const j = secs.length - 1; for (let k = 1; k < L - 1; k++) idx.push(j * L, j * L + k, j * L + k + 1);   // tip cap (fan)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const u = new Float32Array(uv); return finish(g, part, (x, y, z, i) => [u[i * 2], u[i * 2 + 1]]);
}
// mirror across x = 0 (left side from the right side), keeping faces outward
function mirrorX(g) {
  const m = g.index ? g.toNonIndexed() : g.clone(); m.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  for (const a of Object.values(m.attributes)) { const n = a.itemSize, A = a.array; for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { const t = A[(i + 1) * n + k]; A[(i + 1) * n + k] = A[(i + 2) * n + k]; A[(i + 2) * n + k] = t; } }
  return m;
}
const prim = (g, part, m) => { if (m) g.applyMatrix4(m); return finish(g, part); };
const M = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));

export function planeGeometry(o = {}) {
  const len = o.len ?? 40, span = o.span ?? 36, sL = len / 40, sS = span / 36, D2R = Math.PI / 180;
  const parts = [];
  // fuselage: rounded nose, constant barrel, up-swept tail cone
  const F = [[-20, 0.05, -0.55], [-19.7, 0.5, -0.47], [-19.2, 0.9, -0.38], [-18.4, 1.3, -0.25], [-17.4, 1.62, -0.13], [-16.3, 1.84, -0.05], [-15.0, 1.96, -0.01], [-13.5, 2.0, 0],
    [-8, 2.0, 0], [-2, 2.0, 0], [4, 2.0, 0], [8.5, 2.0, 0], [10.5, 1.93, 0.08], [12.5, 1.74, 0.29], [14.5, 1.45, 0.58], [16.3, 1.1, 0.92], [18, 0.72, 1.27], [19.3, 0.38, 1.55], [20, 0.12, 1.66]];
  parts.push(lathe(F.map(([z, r, cy]) => [z * sL, r * sL, cy * sL, 1]), 28, 0, [true, true]));
  // wings: root (inside the body), kink, tip; swept 27 deg, 6 deg dihedral; plus a canted winglet
  const sw = Math.tan(27 * D2R), dh = Math.tan(6 * D2R), hs = span / 2;
  const W = [{ x: 1.2 * sL, z: -4.0 * sL, c: 7.4 * sL, t: 0.13 }, { x: 6.6 * sS, c: 4.4 * sL, t: 0.11 }, { x: hs - 0.25 * sS, c: 1.5 * sL, t: 0.09 }]
    .map((s) => ({ ...s, y: -1.05 * sL + (s.x - 1.2 * sL) * dh, z: s.z ?? -4.0 * sL + (s.x - 1.2 * sL) * sw }));
  const wingR = wing(W, 1);
  const tip = W[2], wl = wing([{ x: 0, y: 0, z: 0, c: 1.45 * sL, t: 0.08 }, { x: 2.3 * sL, y: 0, z: 1.25 * sL, c: 0.55 * sL, t: 0.07 }], 3);
  wl.applyMatrix4(M(tip.x - 0.05, tip.y + 0.05, tip.z + 0.05, 0, 0, 72 * D2R));
  // engines under the wings: nacelle (open lathe), dark fan face, grey exhaust cone, pylon
  const eng = []; const R = 1.08 * sL, EL = 4.6 * sL, ex = 5.9 * sS, ey = -1.05 * sL + (ex - 1.2 * sL) * dh - 1.55 * sL, ez = -4.0 * sL + (ex - 1.2 * sL) * sw - 2.6 * sL;
  eng.push(lathe([[-EL / 2, R * 0.86], [-EL / 2 + 0.25 * sL, R * 0.99], [-EL / 2 + 1.2 * sL, R], [EL / 2 - 1.0 * sL, R * 0.88], [EL / 2, R * 0.66]], 20, 4));
  eng.push(lathe([[-EL / 2 + 0.05, R * 0.8], [-EL / 2 + 0.45 * sL, R * 0.78]], 20, 6));                       // intake lip (inner)
  eng.push(lathe([[-EL / 2 + 0.45 * sL, R * 0.78], [-EL / 2 + 0.5 * sL, 0.0]], 20, 5));                        // fan face
  eng.push(lathe([[EL / 2 - 0.2 * sL, R * 0.6], [EL / 2 + 0.9 * sL, R * 0.32], [EL / 2 + 1.5 * sL, 0.05]], 14, 6));   // exhaust cone
  eng.push(prim(new THREE.BoxGeometry(0.42 * sL, 1.5 * sL, 4.2 * sL), 4, M(0, R + 0.45 * sL, 1.7 * sL)));    // pylon
  const engR = mergeGeometries(eng.map((g) => (g.index ? g.toNonIndexed() : g))); engR.applyMatrix4(M(ex, ey, ez));
  // tailplane + fin
  const tsw = Math.tan(32 * D2R), tdh = Math.tan(6 * D2R);
  const T = [{ x: 0.6 * sL, c: 4.1 * sL, t: 0.1 }, { x: 6.6 * sL, c: 1.5 * sL, t: 0.08 }].map((s) => ({ ...s, y: 0.55 * sL + (s.x - 0.6 * sL) * tdh, z: 13.6 * sL + (s.x - 0.6 * sL) * tsw }));
  const tailR = wing(T, 2);
  const fsw = Math.tan(38 * D2R);
  const fin = wing([{ x: 0, y: 0, z: 0, c: 7.6 * sL, t: 0.1 }, { x: 6.8 * sL, y: 0, z: 6.8 * sL * fsw, c: 2.6 * sL, t: 0.08 }], 3);
  fin.applyMatrix4(M(0, 1.45 * sL, 11.4 * sL, 0, 0, Math.PI / 2));
  parts.push(wingR, mirrorX(wingR), wl, mirrorX(wl), engR, mirrorX(engR), tailR, mirrorX(tailR), fin);
  // nav lights at the wingtips (steady red left / green right): uv.x = 1 marks green
  const lamp = (x, green) => { const g = prim(new THREE.IcosahedronGeometry(0.16 * sL, 1), 8, M(x, tip.y + 0.05, tip.z + tip.c * 0.3)); const u = g.attributes.aUV; for (let i = 0; i < u.count; i++) u.setX(i, green ? 1 : 0); return g; };
  if (o.lights ?? 1) parts.push(lamp(tip.x + 0.1, true), lamp(-tip.x - 0.1, false));
  // landing gear (down, on approach): nose leg + twin wheels, two main legs with 4 wheels each
  if (o.gear) {
    const leg = (x, top, z, h, r) => prim(new THREE.CylinderGeometry(r, r, h, 8), 6, M(x, top - h / 2, z));
    const wheel = (x, y, z, rr) => prim(new THREE.CylinderGeometry(rr, rr, 0.34 * sL, 12), 7, M(x, y, z, 0, 0, Math.PI / 2));
    const nTop = -1.7 * sL, nh = 1.9 * sL, mTop = -0.9 * sL, mh = 2.9 * sL, nz = -15.2 * sL, mz = 0.9 * sL, mx = 2.9 * sS;
    parts.push(leg(0, nTop, nz, nh, 0.13 * sL), wheel(-0.25 * sL, nTop - nh, nz, 0.4 * sL), wheel(0.25 * sL, nTop - nh, nz, 0.4 * sL));
    for (const sx of [-1, 1]) { parts.push(leg(sx * mx, mTop, mz, mh, 0.2 * sL));
      for (const dz of [-0.62, 0.62]) for (const dx of [-0.33, 0.33]) parts.push(wheel(sx * mx + dx * sL, mTop - mh, mz + dz * sL, 0.55 * sL)); }
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeBoundingSphere(); g.userData = { len, span };
  return g;
}

export function planeMaterial(o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.05 });
  const U = { cBody: { value: new THREE.Color(o.body ?? 0xf3f5f8) }, cBlue: { value: new THREE.Color(o.blue ?? 0x163f8f) }, cAcc: { value: new THREE.Color(o.accent ?? 0x3d8fe0) },
    cWing: { value: new THREE.Color(o.wing ?? 0xb9c0c8) }, lightI: { value: o.lightI ?? 6 }, sL: { value: (o.len ?? 40) / 40 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPart; attribute vec2 aUV; varying float vPart; varying vec2 vUV; varying vec3 vLoc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPart = aPart; vUV = aUV; vLoc = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 cBody, cBlue, cAcc, cWing; uniform float lightI, sL; varying float vPart; varying vec2 vUV; varying vec3 vLoc; float pRough = 0.32; vec3 pEmit = vec3(0.);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float pt = floor(vPart + 0.5); vec3 c = cBody; vec3 L = vLoc / sL;
        if (pt < 0.5) {                                                   // fuselage: white top, accent cheatline, blue belly, windows
          float s = vUV.y;                                                 // sin(angle around the axis): +1 top, -1 belly
          c = mix(c, cAcc, smoothstep(-0.19, -0.21, s));
          c = mix(c, cBlue, smoothstep(-0.29, -0.31, s));
          float wz = fract((L.z + 0.2) / 0.95);
          float win = smoothstep(0.19, 0.16, abs(wz - 0.5)) * smoothstep(0.1, 0.08, abs(s - 0.33)) * step(-14.6, L.z) * step(L.z, 11.5);
          float ck = step(-18.3, L.z) * step(L.z, -16.75) * smoothstep(0.2, 0.24, s) * smoothstep(0.62, 0.58, s) * step(0.1, fract((L.z + 18.3) / 0.52));
          c = mix(c, vec3(0.025, 0.035, 0.05), max(win, ck));
          pRough = mix(0.3, 0.06, max(win, ck));
        } else if (pt < 1.5) { c = cWing; pRough = 0.42; }               // wings
        else if (pt < 2.5) { c = cWing; pRough = 0.42; }                 // tailplane
        else if (pt < 3.5) {                                              // fin + winglets: blue with a lighter sweep (generic, no logo)
          float u = vUV.x, v = vUV.y;
          c = mix(cBlue, cAcc, smoothstep(0.1, 0.07, abs(u - 0.18 - 0.55 * v)));
          c = mix(c, cBody, smoothstep(0.03, 0.015, abs(u - 0.34 - 0.55 * v))); pRough = 0.3; }
        else if (pt < 4.5) { c = mix(cBody, vec3(0.72, 0.75, 0.78), smoothstep(0.1, 0.0, vUV.x));      // nacelle: white, bare lip, blue band
          c = mix(c, cBlue, smoothstep(0.6, 0.63, vUV.x) * smoothstep(0.86, 0.83, vUV.x)); pRough = 0.25; }
        else if (pt < 5.5) { c = vec3(0.025); pRough = 0.6; }            // fan face
        else if (pt < 6.5) { c = vec3(0.42, 0.43, 0.45); pRough = 0.4; } // metal: exhaust cone, intake lip, gear legs
        else if (pt < 7.5) { c = vec3(0.03); pRough = 0.8; }             // tyres
        else { c = vec3(0.05); pEmit = mix(vec3(1., 0.08, 0.05), vec3(0.1, 1., 0.25), vUV.x) * lightI; }
        diffuseColor.rgb = c; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = pRough;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += pEmit;');
  };
  mat.U = U; return mat;
}

export function createPlane(S, o = {}) {
  const geometry = o.geometry ?? planeGeometry(o), material = o.material ?? planeMaterial(o);
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = !!o.shadows; mesh.receiveShadow = !!o.shadows;
  const root = new THREE.Group(); root.add(mesh); mesh.scale.setScalar(o.scale ?? 1);
  if (o.add ?? true) S.scene.add(root);
  return { root, mesh, material, U: material.U, len: geometry.userData.len * (o.scale ?? 1), span: geometry.userData.span * (o.scale ?? 1) };
}

// many planes, one draw call. set(i, pos, quat, scale) places instance i; unused instances stay collapsed at the origin.
export function createPlanes(S, n, o = {}) {
  const geometry = o.geometry ?? planeGeometry(o), material = o.material ?? planeMaterial(o);
  const mesh = new THREE.InstancedMesh(geometry, material, n); mesh.frustumCulled = false; mesh.castShadow = !!o.shadows;
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
  if (o.add ?? true) S.scene.add(mesh);
  const s0 = o.scale ?? 1;
  return { mesh, material, U: material.U, len: geometry.userData.len * s0, span: geometry.userData.span * s0,
    set(i, pos, quat, scale = 1) { mesh.setMatrixAt(i, m4.compose(pos, quat, sc.setScalar(s0 * scale))); mesh.instanceMatrix.needsUpdate = true; } };
}
