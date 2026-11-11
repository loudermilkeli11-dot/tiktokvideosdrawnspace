// A generic modular space station (no flags, no logos, no agency marks): a long lattice truss, eight solar-array wings
// on the truss ends (two blankets each, gold-framed dark-blue cells), white radiators, a stack of white pressurised
// modules (quilted blankets) with nodes and side modules, a robot arm and a dish. About 110 m across.
// Units: metres, scaled by o.scale (0.001 for km scenes). Station space: truss along X, modules along Z, +Y = away from Earth.
//   const ST = createStation(S, { scale: 0.001 });   ST.root (in S.scene) ; ST.setArrays(angle) turns the wings about X
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './util.js';

function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const box = (sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g; };
const tube = (r, len, x, y, z, axis = 'z', seg = 20) => { const g = new THREE.CylinderGeometry(r, r, len, seg, 1); if (axis === 'z') g.rotateX(Math.PI / 2); if (axis === 'x') g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; };
const merge = (a) => mergeGeometries(a.map((g) => (g.index ? g.toNonIndexed() : g)));

export function createStation(S, o = {}) {
  const R = rng(o.seed ?? 4);
  const root = new THREE.Group(); const inner = new THREE.Group(); inner.scale.setScalar(o.scale ?? 1); root.add(inner);
  // ---- materials ----
  const quilt = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e8e6e1'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const v = 215 + Math.floor(R() * 30); c.fillStyle = `rgb(${v},${v - 2},${v - 6})`; c.fillRect(Math.floor(R() * 8) * 32, Math.floor(R() * 8) * 32, 32, 32); }
    c.strokeStyle = 'rgba(120,118,112,0.55)'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); }
    c.fillStyle = 'rgba(90,88,84,0.6)'; for (let i = 0; i < 30; i++) c.fillRect(R() * w, R() * h, 3, 3); });
  const cells = canvasTex(128, 512, (c, w, h) => { c.fillStyle = '#a5823c'; c.fillRect(0, 0, w, h);   // gold frame
    for (let j = 0; j < 32; j++) for (let i = 0; i < 4; i++) { const v = R() * 14; c.fillStyle = `rgb(${18 + v},${22 + v},${62 + v * 2})`; c.fillRect(i * 32 + 2, j * 16 + 1.5, 28, 13); } });
  cells.repeat.set(1, 1);
  const M = {
    white: new THREE.MeshStandardMaterial({ map: quilt, roughness: 0.62, metalness: 0.0 }),
    truss: new THREE.MeshStandardMaterial({ color: 0xbdbcb6, roughness: 0.42, metalness: 0.55 }),
    solar: new THREE.MeshStandardMaterial({ map: cells, roughness: 0.28, metalness: 0.35, side: THREE.DoubleSide }),
    rad: new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.38, metalness: 0.0, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd2a650, roughness: 0.3, metalness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.5, metalness: 0.4 }),
  };
  // ---- truss: four chords + braces, X from -56 to 56 ----
  const tr = [], L = 112, bay = 5.6, hw = 2.3;
  for (const y of [-hw, hw]) for (const z of [-hw, hw]) tr.push(box(L, 0.32, 0.32, 0, y, z));
  for (let x = -L / 2; x <= L / 2 + 0.01; x += bay) {
    for (const y of [-hw, hw]) tr.push(box(0.22, 0.22, 2 * hw, x, y, 0));
    for (const z of [-hw, hw]) tr.push(box(0.22, 2 * hw, 0.22, x, 0, z));
    if (x < L / 2 - 0.1) { const d = Math.hypot(bay, 2 * hw), a = Math.atan2(2 * hw, bay);
      for (const y of [-hw, hw]) tr.push(box(d, 0.16, 0.16, x + bay / 2, y, 0, 0, a * (y > 0 ? 1 : -1), 0));
      for (const z of [-hw, hw]) tr.push(box(d, 0.16, 0.16, x + bay / 2, 0, z, 0, 0, a * (z > 0 ? 1 : -1))); }
  }
  tr.push(box(3, 5.2, 5.2, 0, 0, 0));                                                    // central truss segment (solid)
  inner.add(new THREE.Mesh(merge(tr), M.truss));
  // ---- solar wings: 4 per end, each two blankets on a mast, turning about X (beta-gimbal look) ----
  const wings = [];
  for (const xe of [-1, 1]) for (const k of [0, 1]) {
    const piv = new THREE.Group(); piv.position.set(xe * (43 + k * 11), 0, 0); inner.add(piv);
    for (const sz of [-1, 1]) {
      const wl = 33, blank = [], mast = [];
      for (const off of [-2.75, 2.75]) { const g = new THREE.BoxGeometry(4.4, 0.08, wl); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * 3); g.translate(off, 0, sz * (wl / 2 + 3)); blank.push(g); }
      mast.push(tube(0.18, wl + 2, 0, 0, sz * (wl / 2 + 2.5), 'z', 8)); mast.push(box(11.4, 0.25, 0.4, 0, 0, sz * (wl + 3.2))); mast.push(box(1.2, 1.2, 1.6, 0, 0, sz * 3));
      piv.add(new THREE.Mesh(merge(blank), M.solar)); piv.add(new THREE.Mesh(merge(mast), M.truss));
    }
    piv.add(new THREE.Mesh(tube(1.0, 2.2, 0, 0, 0, 'x', 16), M.dark)); wings.push(piv);
  }
  // ---- radiators: three white panels hanging each side of the centre, plus small ones ----
  const rad = [];
  for (const xs of [-1, 1]) for (let i = 0; i < 3; i++) rad.push(box(3.1, 13, 0.12, xs * (17 + i * 3.6), -9.5, 0, 0, 0.0, 0));
  inner.add(new THREE.Mesh(merge(rad), M.rad));
  // ---- pressurised modules along Z, below the truss ----
  const mods = [], gold = [], dark = [];
  const Y0 = -5.5;
  const mod = (x, y, z, r, len, axis = 'z') => { mods.push(tube(r, len, x, y, z, axis, 28)); const cap = new THREE.SphereGeometry(r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const s of [-1, 1]) { const g = cap.clone(); g.scale(1, 0.35, 1); if (axis === 'z') { g.rotateX(s * Math.PI / 2); g.translate(x, y, z + s * len / 2); } else { g.rotateZ(-s * Math.PI / 2); g.translate(x + s * len / 2, y, z); } mods.push(g); }
    for (const s of [-1, 1]) { if (axis === 'z') dark.push(tube(r * 1.02, 0.25, x, y, z + s * (len / 2 - 0.4), 'z', 28)); else dark.push(tube(r * 1.02, 0.25, x + s * (len / 2 - 0.4), y, z, 'x', 28)); } };
  mod(0, Y0, 0, 2.4, 6.5); mod(0, Y0, -8.5, 2.2, 9); mod(0, Y0, -18.5, 2.2, 9.5); mod(0, Y0, -27, 2.3, 5.5);
  mod(0, Y0, 8.5, 2.2, 10); mod(0, Y0, 17.5, 2.35, 6); mod(0, Y0, 26.5, 2.1, 11); mod(0, Y0, 36.5, 1.7, 8);
  mod(-8.2, Y0, -27, 2.2, 10, 'x'); mod(8.6, Y0, -27, 2.2, 11, 'x'); mod(-7.5, Y0, 17.5, 2.0, 8.5, 'x'); mod(0, Y0 - 7, 17.5, 1.9, 0.01, 'z');
  mods.push(tube(1.8, 7, 0, Y0 - 5.5, 17.5, 'y', 24));                                        // a module pointing Earthward
  gold.push(tube(2.25, 3.2, 0, Y0, 30, 'z', 28)); gold.push(tube(1.75, 2.5, 0, Y0, 38, 'z', 24));   // foil-wrapped sections
  // small solar wings on the service module, a dish, the arm
  const sw = []; for (const s of [-1, 1]) sw.push(box(9, 0.06, 2.6, s * 7, Y0, 38.5));
  inner.add(new THREE.Mesh(merge(sw), M.solar));
  dark.push(tube(0.12, 4, 0, 3.5, -6, 'y', 8)); const dish = new THREE.SphereGeometry(1.6, 20, 6, 0, Math.PI * 2, 0, 0.9); dish.translate(0, 4.5, -6); dark.push(dish);
  dark.push(box(0.6, 0.6, 14, 4.5, 3.2, -9, 0.5, 0, 0)); dark.push(box(0.6, 0.6, 12, 4.5, 7.5, -20, -0.6, 0, 0)); dark.push(box(1.2, 1.2, 1.2, 4.5, 6.3, -14));
  inner.add(new THREE.Mesh(merge(mods), M.white)); inner.add(new THREE.Mesh(merge(gold), M.gold)); inner.add(new THREE.Mesh(merge(dark), M.dark));
  // modules carry the quilt texture along their length
  M.white.map.repeat.set(3, 2);
  if (o.add ?? true) S.scene.add(root);
  root.traverse((m) => { if (m.isMesh) { m.renderOrder = 10; m.frustumCulled = false; } });
  return { root, inner, M, wings,
    setArrays(a) { for (const w of wings) w.rotation.x = a; } };
}
