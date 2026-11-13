// no-empty-space GROUP A helpers (s01, s02, s03, s04, s12). Builder-owned; imports the shared kit, never edits it.
//   posePlayer: smooth pose changes for one-off characters (blends precomputed at load: geometry is cached per pose)
//   extra poses (sitting reactions, strides, waiter's high pour, the hero's kneel-with-phone)
//   props: café chair, bistro glass table with a crack decal, bench, smoke wisps, a flying hat (closed form)
import { THREE } from '@engine/engine.js';
import { POSES } from '@engine/figure.js';
import { rng, clamp } from '@engine/util.js';
import { styliseMat, bits } from './kit.js';

// ---------------------------------------------------------------- extra poses (body coords, -z forward)
// HEAD PITCH SIGN (checked in figure.js bodyPrims: the head turns by rotX(lean - head[1])): head[1] > 0 looks DOWN, < 0 UP.
// (API.md calls it pitchUp; several kit poses assume the opposite. Fixed local copies: lookHandUp, patPocketsD, lookUnderD.)
const SITLEGS = { legR: [1.45, 0.08, 1.5], legL: [1.45, 0.08, 1.5] };
Object.assign(POSES, {
  lookHandUp: { ...POSES.lookHand, head: [0.3, -0.55] },
  patPocketsD: { ...POSES.patPockets, head: [0, 0.45] },
  lookUnderD: { ...POSES.lookUnder, head: [0, 0.35] },
  shrugBig: { R: { t: [0.55, 1.42, -0.2], pole: [1, -0.5, 0] }, L: { t: [-0.55, 1.42, -0.2], pole: [-1, -0.5, 0] }, legR: [0.05, 0.1, 0.05], legL: [-0.05, 0.1, 0.05], lean: 0.08, head: [0.25, -0.05], hip: 0.05 },
  sitHands: { R: { t: [0.14, 1.55, -0.12], pole: [1, -0.2, 0.3] }, L: { t: [-0.14, 1.55, -0.12], pole: [-1, -0.2, 0.3] }, ...SITLEGS, lean: 0.12, head: [0, -0.2] },
  sitPoint: { R: { t: [0.25, 1.55, -0.6], pole: [1, -0.4, 0.2] }, L: { t: [-0.2, 0.95, -0.28], pole: [-1, -0.6, 0.3] }, ...SITLEGS, lean: 0.08, head: [0.1, -0.35] },
  sitBack: { R: { t: [0.3, 1.25, -0.05], pole: [1, -0.5, 0.2] }, L: { t: [-0.3, 1.25, -0.05], pole: [-1, -0.5, 0.2] }, legR: [1.2, 0.12, 1.2], legL: [1.6, 0.12, 1.7], lean: 0.25, head: [0, -0.2] },
  sitSpritz: { R: { t: [0.2, 1.1, -0.3], pole: [1, -0.6, 0.3] }, L: { t: [-0.2, 0.95, -0.28], pole: [-1, -0.6, 0.3] }, ...SITLEGS, lean: -0.02, head: [0.2, 0.05], phone: 'R' },
  sitStareD: { ...POSES.sitStare, head: [0.1, 0.3] },
  sitPeer1: { R: { t: [0.04, 1.47, -0.26], pole: [1, -0.4, 0.3] }, L: { t: [-0.22, 0.98, -0.3], pole: [-1, -0.6, 0.3] }, ...SITLEGS, lean: -0.06, head: [0, 0.0], phone: 'R' },
  pourHigh: { R: { t: [0.1, 1.22, -0.46], pole: [1, -0.5, 0.2] }, L: { t: [-0.24, 1.0, 0.0], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.05, 0.1, 0.1], lean: -0.12, head: [0, 0.4], phone: 'R' },
  gape: { R: { t: [0.1, 1.62, -0.12], pole: [1, -0.2, 0.3] }, L: { t: [-0.1, 1.62, -0.12], pole: [-1, -0.2, 0.3] }, legR: [0.0, 0.12, 0.05], legL: [-0.2, 0.12, 0.15], lean: 0.12, head: [0, -0.1] },
  strideA: { R: { t: [0.22, 0.95, 0.12], pole: [1, -0.6, 0.2] }, L: { t: [-0.22, 0.98, -0.16], pole: [-1, -0.6, 0.2] }, legR: [0.42, 0.06, 0.25], legL: [-0.3, 0.06, 0.15], lean: -0.04, head: [0, 0] },
  strideB: { R: { t: [0.22, 0.98, -0.16], pole: [1, -0.6, 0.2] }, L: { t: [-0.22, 0.95, 0.12], pole: [-1, -0.6, 0.2] }, legR: [-0.3, 0.06, 0.15], legL: [0.42, 0.06, 0.25], lean: -0.04, head: [0, 0] },
  kneelLight: { R: { t: [0.08, 0.9, -0.52], pole: [1, -0.4, 0.2] }, L: { t: [-0.3, 0.62, -0.2], pole: [-1, -0.4, 0.2] }, legR: [1.3, 0.1, 2.2], legL: [0.2, 0.1, 1.8], lean: -0.6, head: [0, 0.5], phone: 'R' },
  pointDown: { R: { t: [0.25, 1.05, -0.6], pole: [1, -0.4, 0.2] }, L: { t: [-0.15, 1.05, -0.2], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.1, 0.1, 0.15], lean: -0.3, head: [0, 0.45] },
  leanLook: { R: { t: [0.2, 1.0, -0.3], pole: [1, -0.6, 0.2] }, L: { t: [-0.2, 1.0, -0.3], pole: [-1, -0.6, 0.2] }, legR: [0.1, 0.1, 0.15], legL: [-0.15, 0.1, 0.2], lean: -0.45, head: [0, 0.4] },
  palmLook: { R: { t: [0.1, 1.5, -0.36], pole: [1, -0.6, 0.2] }, L: { t: [-0.18, 1.0, -0.12], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.1, 0.1, 0.2], lean: -0.05, head: [0.05, -0.05], hip: 0.04 },
  lookFloor: { R: { t: [0.24, 1.2, -0.3], pole: [1, -0.6, 0.2] }, L: { t: [-0.22, 1.0, -0.15], pole: [-1, -0.6, 0.2] }, legR: [0.05, 0.08, 0.05], legL: [-0.15, 0.1, 0.2], lean: -0.38, head: [0.1, 0.5], hip: 0.04 },
  film: { R: { t: [0.08, 1.48, -0.42], pole: [1, -1, 0.3] }, L: { t: [-0.06, 1.48, -0.42], pole: [-1, -1, 0.3] }, legR: [0.02, 0.06, 0.04], legL: [-0.05, 0.06, 0.1], lean: -0.15, head: [0, 0.15], phone: 'R' },
});

// ---------------------------------------------------------------- pose blending
const lerpDeep = (a, b, u) => {
  if (typeof a === 'number' && typeof b === 'number') return +(a + (b - a) * u).toFixed(4);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpDeep(v, b[i] ?? v, u));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (k in a && k in b) ? lerpDeep(a[k], b[k], u) : (u < 0.5 ? (a[k] ?? b[k]) : (b[k] ?? a[k])); return o; }
  return u < 0.5 ? a : b;
};
const P0 = (n) => ({ head: [0, 0], lean: 0, hip: 0, twist: 0, ...POSES.stand, ...POSES[n] });
export function poseMix(a, b, u) { return lerpDeep(P0(a), P0(b), u); }
// createHero re-shows its built-in emissive phone on every pose with a hand anchor: keep it hidden (our props sit there)
export function noPhone(h) { if (h._noPhone) return; h._noPhone = true; const sp = h.setPose; h.setPose = (p) => { sp(p); h.phone.visible = false; }; h.phone.visible = false; }
// keys: [[film t, poseName, blendSecondsInto]]: the pose blends from the previous key's pose over `blend` s ending at t + blend.
// steps intermediate geometries are precomputed. Returns { at(film) -> pose (name or object), prime() }.
export function posePlayer(h, keys, o = {}) {
  const steps = o.steps ?? 3, phone = o.phone;
  const mk = (a, b, k) => { const p = poseMix(a, b, k / (steps + 1)); if (phone !== undefined) p.phone = phone; else if (POSES[b].phone || POSES[a].phone) p.phone = 'R'; return p; };
  const at = (film) => {
    let i = 0; while (i + 1 < keys.length && film >= keys[i + 1][0]) i++;
    if (i === 0 || film >= keys[i][0] + (keys[i][2] ?? 0)) return keys[i][1];
    const u = (film - keys[i][0]) / (keys[i][2] || 1e-6), k = Math.min(steps, Math.floor(u * (steps + 1)));
    return k <= 0 ? keys[i - 1][1] : mk(keys[i - 1][1], keys[i][1], k);
  };
  const prime = () => { for (let i = 0; i < keys.length; i++) { h.setPose(keys[i][1]); if (i > 0 && keys[i][2]) for (let k = 1; k <= steps; k++) h.setPose(mk(keys[i - 1][1], keys[i][1], k)); } h.setPose(keys[0][1]); };
  prime(); noPhone(h);
  return { at, apply(film) { h.setPose(at(film)); h.phone.visible = false; } };
}

// ---------------------------------------------------------------- props
const M = (c, o = {}) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: o.rough ?? 0.8, ...(o.x ?? {}) }), o);
const box = (g, w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
// a café chair (same look as the terrace's: teal seat + back) at p (floor), facing yaw (the sitter faces yaw)
export function cafeChair(S, p, yaw, col = 0x2f6f8a) {
  const g = new THREE.Group(), m = M(col), leg = M(0x3a3a3a, { rough: 0.5 });
  box(g, 0.4, 0.05, 0.4, m, 0, 0.45, 0); box(g, 0.4, 0.45, 0.04, m, 0, 0.68, 0.2);
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) box(g, 0.03, 0.45, 0.03, leg, x, 0.22, z);
  g.position.copy(p); g.rotation.y = yaw; S.scene.add(g); return g;
}
// a radial crack pattern on a canvas (white lines) -> texture
function crackTexture(seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), R = rng(seed);
  x.clearRect(0, 0, 512, 512); x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineCap = 'round';
  const cx = 256, cy = 256, arms = 14, pts = [];
  for (let i = 0; i < arms; i++) { let a = (i / arms) * Math.PI * 2 + R() * 0.3, r = 0, px = cx, py = cy; const ring = [];
    x.lineWidth = 5; x.beginPath(); x.moveTo(px, py);
    while (r < 250) { r += 22 + R() * 30; a += (R() - 0.5) * 0.35; px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r; x.lineTo(px, py); ring.push([px, py]); }
    x.stroke(); pts.push(ring); }
  x.lineWidth = 3;
  for (let i = 0; i < arms; i++) { const A = pts[i], B = pts[(i + 1) % arms]; for (let k = 0; k < Math.min(A.length, B.length); k += 1) if (R() < 0.6) { x.beginPath(); x.moveTo(...A[k]); x.lineTo(...B[k]); x.stroke(); } }
  x.fillStyle = 'rgba(255,255,255,1)'; x.beginPath(); x.arc(cx, cy, 14, 0, 6.3); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a bistro table with a glass top (teal tint, flat) at p (floor); crack(film) grows the crack decal from tCrack over 0.12 s
export function glassTable(S, p, o = {}) {
  const g = new THREE.Group(), r = o.r ?? 0.36, h = o.h ?? 0.74;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.025, 20), M(0x8ec8c8, { rough: 0.25, env: 0.6, x: { transparent: true, opacity: 0.72 } })); top.position.y = h; top.receiveShadow = true; g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 5, 24), M(0x22402f, { rough: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  box(g, 0.035, h, 0.035, M(0x22402f, { rough: 0.5 }), 0, h / 2, 0);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 12), M(0x22402f)); foot.position.y = 0.015; g.add(foot);
  const crack = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 32), new THREE.MeshBasicMaterial({ map: crackTexture(o.seed ?? 3), transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  crack.rotation.x = -Math.PI / 2; crack.position.y = h + 0.0135; crack.renderOrder = 6; g.add(crack);
  g.position.copy(p); S.scene.add(g); g.traverse((m) => { if (m.isMesh && m !== crack) m.castShadow = true; });
  const tC = o.tCrack ?? 1e9, off = new THREE.Vector2(o.cx ?? 0.08, o.cz ?? -0.05);
  crack.position.x = off.x; crack.position.z = off.y;
  return { group: g, top, topY: p.y + h, update(film) { const u = clamp((film - tC) / 0.12); crack.visible = u > 0; crack.scale.setScalar(Math.max(0.01, 0.2 + 0.8 * Math.sqrt(u))); } };
}
// a park bench (wooden slats, iron ends) at p, yaw (the sitter faces -Z rotated by yaw)
export function bench(S, p, yaw = 0) {
  const g = new THREE.Group(), wood = M(0x9a6438), iron = M(0x22402f, { rough: 0.5 });
  for (let i = 0; i < 3; i++) box(g, 1.8, 0.04, 0.11, wood, 0, 0.45, -0.14 + i * 0.13);
  for (let i = 0; i < 2; i++) box(g, 1.8, 0.1, 0.035, wood, 0, 0.62 + i * 0.16, 0.22);
  for (const x of [-0.8, 0.8]) { box(g, 0.05, 0.45, 0.45, iron, x, 0.22, 0.04); box(g, 0.05, 0.42, 0.05, iron, x, 0.66, 0.23); }
  g.position.copy(p); g.rotation.y = yaw; S.scene.add(g); return g;
}
// smoke wisps: thin grey puffs rising from p, one every `every` s from t0 to t1 (closed form; bits with negative gravity)
export function wisps(S, p, t0, t1, o = {}) {
  const R = rng(o.seed ?? 41), list = [], every = o.every ?? 0.09;
  for (let t = t0; t < t1; t += every) list.push({ p: [p.x + (R() - 0.5) * 0.03, p.y + 0.01, p.z + (R() - 0.5) * 0.03], v: [(R() - 0.5) * 0.12 + (o.drift ?? 0.05), 0.25 + R() * 0.2, (R() - 0.5) * 0.12], t0: t,
    size: (o.size ?? 0.035) * (0.7 + 0.6 * R()), col: o.col ?? [0x8a8580, 0x9a948c, 0x77726c][Math.floor(R() * 3)], shape: 0, drag: 0.6, life: o.life ?? 1.4, spin: 0.5, seed: R() });
  return bits(S, list, { gravity: -(o.buoy ?? 0.25) });
}
// a hat flying along a closed-form path: rests on its owner's head until t0, rushes to `to` (Vector3), then drops to the floor
// near it. hatObj: the Group (detached to the scene). returns update(film, headWorldPos)
export function flyingHat(S, hatObj, t0, to, o = {}) {
  const floorY = o.floor ?? to.y - 1, land = o.land ?? to.clone().setY(floorY), dur = o.dur ?? 0.3, fall = o.fall ?? 0.6;
  S.scene.attach(hatObj); const q0 = hatObj.quaternion.clone(), spinAx = new THREE.Vector3(0.4, 1, 0.3).normalize(), _q = new THREE.Quaternion();
  let from = null;
  return { obj: hatObj,
    update(film, head) {
      if (film < t0) { hatObj.position.copy(head); hatObj.quaternion.copy(q0); from = null; return; }
      const f0 = o.from ?? head; const a = film - t0;
      if (a < dur) { const u = a / dur, e = 1 - Math.pow(1 - u, 2.2); hatObj.position.lerpVectors(f0, to, e); hatObj.position.y += Math.sin(u * Math.PI) * (o.arc ?? 0.15); }
      else { const u = clamp((a - dur) / fall), e = u * u; hatObj.position.lerpVectors(to, land, e); hatObj.position.y = to.y + (land.y - to.y) * e + Math.sin(u * Math.PI) * 0.1; }
      hatObj.quaternion.copy(q0).multiply(_q.setFromAxisAngle(spinAx, (o.spin ?? 14) * Math.min(a, dur + fall) * (1 - 0.6 * clamp((a - dur) / fall))));
      if (a > dur + fall) hatObj.quaternion.copy(q0).multiply(_q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), o.restTilt ?? 0.25)).multiply(_q.setFromAxisAngle(spinAx, (o.spin ?? 14) * (dur + 0.4 * fall)));
    } };
}
// head world position of a makePerson character (hat seat)
export function headTop(h) { h.root.updateMatrixWorld(true); const hc = h.mesh.geometry.userData.headC ?? [0, 1.6, 0]; return new THREE.Vector3(hc[0], hc[1] + 0.07, hc[2]).applyMatrix4(h.root.matrixWorld); }
// yaw that makes a figure face (dx, dz)
export const faceYaw = (dx, dz) => Math.atan2(-dx, -dz);
