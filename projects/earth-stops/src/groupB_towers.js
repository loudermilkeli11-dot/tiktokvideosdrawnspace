// earth-stops group B: N3, the tower tops (s03_towers, s04_river; usable in s01/s02 too, see FINAL/groupB.txt).
// The law (story.js): a tower's top TOP_FLOORS floors keep moving east at V when the frame below them stops; floor k (0 = the
// roof) lets go at its release time, then drifts with the air: x = x0 + V·(e - e_k), real gravity, a slow tumble. The stub
// that stays loses one floor at each release (the city.js instance is shortened) and shows ragged columns on its cut top;
// the 381 m/s air keeps stripping its facades (glass + cladding chips, kit createChips). A flying floor that meets a
// building still standing at its height is crushed into that wall (clipped at the wall face, closed form) and bursts into
// chips that stream round the building's sides. Everything is closed form in event time e (motion-blur safe).
//   shearTowers(S, W, { minH 36 (m: towers = 10+ floors), pick (b, i) => bool, dE: { [i]: e } (per-tower delay override),
//                       strip [e0, e1], stripN 220 per tower, trailN 36 per floor, crashN 40 }) -> { towers, update(e) }
// Buildings shorter than TOP_FLOORS + 3 floors lose all but their lowest 3 floors (min(10, floors - 3)).
// The released floors share city.js's own building material (same facade, same stylise) so a floor looks exactly like the
// floor it was. Their geometry sits at local y 30..31 (×3.6 m) so the facade shader sees an upper floor, never the shopfront.
import { THREE } from '@engine/engine.js';
import { rng, clamp } from '@engine/util.js';
import { V, TOP_FLOORS, floorRelease as lawRelease, hop } from './story.js';
import { createChips, styliseMat, ZERO_M } from './kit.js';

export const FL = 3.6, G = 9.81;
// KIT/LAW REQUEST (FINAL/groupB.txt): story.floorRelease puts every roof at e 0.02 and the 10th floor at 0.335 (film 1.2–5.0,
// i.e. inside s01, where no tower is shown failing), so by s03 (e 1.17–1.75) every top would already be 400–600 m downwind.
// story.js grants an illustrative destruction pattern, so here the frames hold against the Mach-1.1 air for SHEAR_E0 event
// seconds before the shear works down at the law's own spacing (0.035 e per floor); each tower's frame gives way at its own
// time (tower.dE: east towers a little earlier, so floors flying downwind meet stubs, plus a random part).
export const SHEAR_E0 = 1.18;
export const floorAt = (T, k) => SHEAR_E0 + T.dE + lawRelease(k);
const K_OFF = 30;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _ax = new THREE.Vector3(0, 0, 1);
const _off = new THREE.Matrix4().makeTranslation(0, -(K_OFF + 0.5), 0);

export function shearTowers(S, W, o = {}) {
  const C = W.C, bMesh = C.group.children.find((m) => m.isInstancedMesh && m.count === C.buildings.length);
  const aSize = bMesh.geometry.attributes.aSize, aSeedB = bMesh.geometry.attributes.aSeed, aGlassB = bMesh.geometry.attributes.aGlass;
  const minH = o.minH ?? 36, towers = [], RT = rng(77);
  C.buildings.forEach((b, i) => { const floors = Math.floor((b.h - 5.5) / FL) + 1, n = Math.min(TOP_FLOORS, floors - 3);
    if (b.h >= minH && n > 0 && (!o.pick || o.pick(b, i))) towers.push({ i, b, h0: b.h, n, sd: (b.seed * 7.31) % 1,
      dE: o.dE?.[i] ?? clamp(0.10 - b.x * 0.00022 + 0.12 * RT(), 0, 0.35) }); });
  const byI = new Map(towers.map((T) => [T.i, T]));
  const nrelAt = (T, e) => { let n = 0; for (let k = 0; k < T.n; k++) if (e >= floorAt(T, k)) n++; return n; };
  const heightAt = (i, e) => { const T = byI.get(i), b = C.buildings[i]; return T ? T.h0 - FL * nrelAt(T, e) : b.h; };
  const slabPos = (T, k, e) => { const a = Math.max(0, e - floorAt(T, k)), sd = (T.sd + k * 0.137) % 1, yc = T.h0 - FL * (k + 0.5);
    return { x: T.b.x + V * a, y: Math.max(1.8, yc - 0.5 * G * a * a), z: T.b.z + 1.5 * Math.sin(a * (1.2 + sd) + sd * 6) * Math.min(1, a / 0.2),
      rx: 0.04 * Math.sin(a * 1.7 + sd * 4) * Math.min(1, a / 0.2), ry: (sd - 0.5) * 0.3 * a, rz: -(0.03 + 0.08 * sd) * a }; };
  // where each floor meets a standing wall downwind (precomputed by stepping its closed-form path; deterministic)
  const B = C.buildings;
  towers.forEach((T) => { T.crash = [];
    const cand = []; B.forEach((b2, i) => { if (i !== T.i && b2.x > T.b.x && Math.abs(T.b.z - b2.z) < (T.b.d + b2.d) / 2 - 4) cand.push(i); });
    for (let k = 0; k < T.n; k++) { let hit = null;
    for (let e = floorAt(T, k) + 0.004; e < 5 && !hit; e += 0.004) { const P = slabPos(T, k, e), lead = P.x + T.b.w / 2;
      if (P.x - T.b.w / 2 > 460) break;
      for (const i of cand) { const b2 = B[i];
        const wx = b2.x - b2.w / 2; if (lead < wx || P.x - T.b.w / 2 > b2.x + b2.w / 2) continue;
        if (P.y - FL / 2 < heightAt(i, e) - 0.5) { hit = { e, x: Math.max(wx, P.x - T.b.w / 2 + 0.01), b2 }; break; } } }
    T.crash.push(hit); } });
  // ---- the released floors
  const NS = towers.reduce((a, T) => a + T.n, 0), g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, K_OFF + 0.5, 0);
  const sA = new Float32Array(NS * 3), sSeed = new Float32Array(NS), sGlass = new Float32Array(NS); let j0 = 0;
  towers.forEach((T) => { T.j0 = j0; for (let k = 0; k < T.n; k++, j0++) { sA.set([T.b.w, FL, T.b.d], j0 * 3); sSeed[j0] = aSeedB.getX(T.i); sGlass[j0] = aGlassB.getX(T.i); } });
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(sA, 3)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sSeed, 1)); g.setAttribute('aGlass', new THREE.InstancedBufferAttribute(sGlass, 1));
  // same facade material; only the slab's top/underside is pale raw concrete (the city roof grey reads as a black hole from below)
  const sMat = bMesh.material.clone(), baseC = bMesh.material.onBeforeCompile;
  sMat.onBeforeCompile = (sh, r) => { baseC(sh, r); sh.fragmentShader = sh.fragmentShader.replace('col = mix(col, vec3(0.32,0.31,0.3), roof);', 'col = mix(col, vec3(0.70,0.66,0.60), roof);'); };
  sMat.customProgramCacheKey = () => 'es-groupB-slab';
  const slabs = new THREE.InstancedMesh(g, sMat, Math.max(1, NS)); slabs.castShadow = true; slabs.receiveShadow = true; slabs.frustumCulled = false; S.scene.add(slabs);
  // ---- ragged columns + bent steel on each cut top
  const NC = 22, colG = new THREE.BoxGeometry(1, 1, 1); colG.translate(0, 0.5, 0);
  const cols = new THREE.InstancedMesh(colG, styliseMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })), Math.max(1, towers.length * NC));
  cols.castShadow = true; cols.frustumCulled = false; S.scene.add(cols);
  const colC = new THREE.Color(); towers.forEach((T, ti) => { const R = rng(900 + T.i); T.cols = [];
    for (let c = 0; c < NC; c++) { const per = 2 * (T.b.w + T.b.d), u = ((c + 0.4 * R()) / NC) * per; let x, z;
      if (u < T.b.w) { x = -T.b.w / 2 + u; z = T.b.d / 2; } else if (u < T.b.w + T.b.d) { x = T.b.w / 2; z = T.b.d / 2 - (u - T.b.w); }
      else if (u < 2 * T.b.w + T.b.d) { x = T.b.w / 2 - (u - T.b.w - T.b.d); z = -T.b.d / 2; } else { x = -T.b.w / 2; z = -T.b.d / 2 + (u - 2 * T.b.w - T.b.d); }
      const steel = R() < 0.4; T.cols.push({ x: x * 0.97, z: z * 0.97, h: steel ? 2.5 + 3.5 * R() : 1 + 2.6 * R(), w: steel ? 0.3 : 0.8 + 0.6 * R(), bend: steel ? 0.5 + 0.7 * R() : 0.15 * R() });
      cols.setColorAt(ti * NC + c, colC.set(steel ? 0x8a5232 : 0x8a8278)); } });
  if (cols.instanceColor) cols.instanceColor.needsUpdate = true;
  // ---- chips: facades stripped all through the event, debris shed by each flying floor, bursts where floors crush into walls
  const R = rng(4242), list = [], [s0, s1] = o.strip ?? [0.6, 2.4];
  const glassCol = (b) => (b.glass ? new THREE.Color(0x8fb0c4).offsetHSL(0, 0, (R() - 0.5) * 0.12).getHex() : 0x9ab4c0);
  const cladCol = (b) => (b.glass ? [0xd8d2c6, 0xc9c3b8][Math.floor(R() * 2)] : [0xc8b49a, 0xa8866a, 0xd8cebc][Math.floor(R() * 3)]);
  towers.forEach((T) => { const b = T.b, hs = T.h0 - FL * T.n, nS = o.stripN ?? 220;
    for (let c = 0; c < nS; c++) { const face = R(), glass = R() < (b.glass ? 0.75 : 0.35);
      let x, z; if (face < 0.6) { x = b.x - b.w / 2 + R() * b.w; z = b.z + b.d / 2 + 0.3; } else if (face < 0.8) { x = b.x - b.w / 2 - 0.3; z = b.z - b.d / 2 + R() * b.d; } else { x = b.x + b.w / 2 + 0.3; z = b.z - b.d / 2 + R() * b.d; }
      const yy = Math.max(6, hs) - Math.pow(R(), 1.6) * Math.max(0, hs - 6);           // most of it near the torn top
      list.push({ p: [x, yy, z], t0: s0 + R() * (s1 - s0), size: glass ? 0.6 + 0.8 * R() : 0.7 + 1.1 * R(), shape: R() < 0.7 ? 1 : 0, kind: glass ? 1 : 2, col: glass ? glassCol(b) : cladCol(b) }); }
    const kS = o.trailSize ? o.trailSize(T) : 1;                                      // e.g. smaller chips on paths that pass the lens
    for (let k = 0; k < T.n; k++) { const end = T.crash[k] ? T.crash[k].e : 9;
      for (let c = 0; c < (o.trailN ?? 36); c++) { const t0 = floorAt(T, k) + Math.pow(R(), 1.4) * 1.6; if (t0 > end) continue;
        const P = slabPos(T, k, t0), u = R(), glass = R() < 0.6;
        const x = P.x + (u < 0.5 ? -b.w / 2 : (R() - 0.5) * b.w), z = P.z + (u < 0.5 ? (R() - 0.5) * b.d : b.d / 2 * (R() < 0.5 ? 1 : -1));
        list.push({ p: [x, P.y - 1.5 + R() * 2, z], t0, size: kS * (glass ? 0.7 + 1.0 * R() : 1.1 + 1.8 * R()), shape: R() < 0.6 ? 1 : 0, kind: glass ? 1 : 2, col: glass ? glassCol(b) : cladCol(b) }); }
      const H = T.crash[k]; if (H) { const P = slabPos(T, k, H.e);
        for (let c = 0; c < (o.crashN ?? 40); c++) { const side = R() < 0.5 ? -1 : 1, glass = R() < 0.45;
          list.push({ p: [H.x - R() * 4, P.y - 2 + R() * 3, H.b2.z + side * (H.b2.d / 2 + 1 + R() * 7)], t0: H.e + R() * 0.12, size: glass ? 0.8 + R() : 1.4 + 2.4 * R(), shape: R() < 0.5 ? 1 : 0, kind: glass ? 1 : 2,
            col: glass ? glassCol(b) : [0x8a8278, 0xb0a898, 0x6a625a][Math.floor(R() * 3)] }); } } } });
  const chips = createChips(S, list, o.chipOpts ?? {});
  return { towers, slabs, cols, chips, slabPos, heightAt, count: list.length,
    update(e) {
      towers.forEach((T, ti) => { const nrel = nrelAt(T, e), h = T.h0 - FL * nrel;
        _m.compose(_p.set(T.b.x, 0, T.b.z), _q.identity(), _s.set(T.b.w, h, T.b.d)); bMesh.setMatrixAt(T.i, _m); aSize.setY(T.i, h);
        for (let k = 0; k < T.n; k++) { const j = T.j0 + k;
          if (e < floorAt(T, k)) { slabs.setMatrixAt(j, ZERO_M); continue; }
          const P = slabPos(T, k, e), H = T.crash[k]; let w = T.b.w, cx = P.x;
          if (H && e >= H.e) { const back = P.x - T.b.w / 2, wall = H.b2.x - H.b2.w / 2; w = Math.min(T.b.w, wall - back); cx = back + w / 2;
            if (w < 0.3) { slabs.setMatrixAt(j, ZERO_M); continue; } }
          _q.setFromEuler(_e.set(P.rx, P.ry, P.rz)); _m.compose(_p.set(cx, P.y, P.z), _q, _s.set(w, FL, T.b.d)).multiply(_off); slabs.setMatrixAt(j, _m); }
        T.cols.forEach((c, k) => { const j = ti * NC + k; if (nrel === 0) { cols.setMatrixAt(j, ZERO_M); return; }
          _q.setFromAxisAngle(_ax, -c.bend * Math.min(1, (e - floorAt(T, 0)) / 0.1)); _m.compose(_p.set(T.b.x + c.x, h - 0.2, T.b.z + c.z), _q, _s.set(c.w, c.h, c.w)); cols.setMatrixAt(j, _m); }); });
      bMesh.instanceMatrix.needsUpdate = true; aSize.needsUpdate = true; slabs.instanceMatrix.needsUpdate = true; cols.instanceMatrix.needsUpdate = true;
      chips.update(e);
    } };
}

// ---- the plaza set-up shared by s03 and s04 (and offered to s01/s02/s09 at phase 3), so every view of the plaza agrees:
// in-frame towers get hand-set delays (s03 shot time at which each roof lets go); the blocks whose floors would sail
// straight over the hero balcony (z -60 … 200: towers 24, 26 and their neighbours, all out of frame) are left whole, so no
// floor ever passes as a dark ceiling over the lens. E_S03 = event time at s03's first frame (story.ev('s03_towers', 0)).
export function plazaShear(S, W, E_S03, o = {}) {
  const at = (tt) => E_S03 + tt / 12 - SHEAR_E0 - 0.02;
  return shearTowers(S, W, { minH: 36, pick: (b) => !(b.z > -60 && b.z < 200),
    dE: { 52: at(0.9), 61: at(0.3), 50: at(2.3), 48: at(3.6), 59: at(1.5), 60: at(0.6), 58: at(2.9), 49: at(4.2), 36: at(2.0) }, ...o });
}

// ---- low-poly roof props: a water tank on legs and a tower crane (stylised, matte). Closed form in e.
const M = (c, o) => styliseMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }), o);
// Tank: torn off its roof at e0, then carried east at V, falls with g to `floor`, tumbling.
export function roofTank(S, { x, y, z, r = 2.6, h = 4.2, e0, floor = 0, col = 0x8a5a3a }) {
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 9), M(col)), cap = new THREE.Mesh(new THREE.ConeGeometry(r * 1.06, h * 0.32, 9), M(0x5a3a28));
  body.position.y = h / 2 + 1.8; cap.position.y = h + 1.8 + h * 0.16; g.add(body, cap);
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), M(0x3a3430)); l.position.set(Math.cos(k * 1.571 + 0.785) * r * 0.75, 0.9, Math.sin(k * 1.571 + 0.785) * r * 0.75); g.add(l); }
  for (let k = 0; k < 3; k++) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.08, 4, 12), M(0x3a3430)); hoop.rotation.x = Math.PI / 2; hoop.position.y = 1.8 + h * (0.2 + 0.3 * k); g.add(hoop); }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(g);
  return { group: g, update(e) { const a = Math.max(0, e - e0);
    g.position.set(x + V * a, Math.max(floor, y + hop(a, 0.6) * 0.3 * Math.min(1, a / 0.05) - 0.5 * G * Math.max(0, a - 0.04) ** 2), z);
    g.rotation.set(0.1 * Math.sin(a * 3), 0.3 * a, -Math.min(1.4, a * 2.2) - 1.2 * a); } };
}
// Tower crane on a roof: mast + jib + counter-jib + cab. Weathervanes to point east right after the stop (slew brake off by
// design), then the mast buckles at e0 and the whole crane topples east (screen-right) about its base over tTop event
// seconds, after which it is loose and goes with the flow.
export function roofCrane(S, { x, y, z, mast = 34, jib = 40, e0, tTop = 0.32 }) {
  const root = new THREE.Group(), top = new THREE.Group(), Y = M(0xe8b830), D = M(0x3a3632);
  const lat = (L, w) => { const gg = new THREE.Group(); const s = new THREE.Mesh(new THREE.BoxGeometry(w, L, w), Y); s.position.y = L / 2; gg.add(s);
    for (let k = 0; k < L / (w * 1.4); k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, 0.18, w * 1.12), D); r.position.y = k * w * 1.4 + 0.5; gg.add(r); } return gg; };
  root.add(lat(mast, 1.8));
  const jb = new THREE.Mesh(new THREE.BoxGeometry(jib, 1.2, 1.3), Y); jb.position.set(jib / 2 - 4, 0, 0); top.add(jb);
  const cj = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 1.6), Y); cj.position.set(-10, 0, 0); top.add(cj);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 2.2), M(0x8a8680)); cw.position.set(-14, -1.6, 0); top.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.2), M(0xf2eee6)); cab.position.set(1.2, -1.8, 1.4); top.add(cab);
  const pk = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6, 4), Y); pk.position.set(0, 3.6, 0); top.add(pk);
  const hookL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 14, 0.08), D); hookL.position.set(jib * 0.6, -7.5, 0); top.add(hookL);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.0), M(0xd94a3d)); hook.position.set(jib * 0.6, -15, 0); top.add(hook);
  top.position.y = mast + 0.6; root.add(top);
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); S.scene.add(root);
  return { root, update(e) {
    top.rotation.y = e > 0 ? -Math.PI * 0.35 * Math.exp(-e / 0.06) : -Math.PI * 0.35;          // weathervane: jib swings to point east (+X)
    hookL.position.x = hook.position.x = jib * 0.6 + (e > 0 ? Math.min(6, e * 40) : 0);
    const u = Math.max(0, e - e0), th = Math.min(1.75, (Math.PI / 2) * (u / tTop) ** 2);          // topples like a falling mast
    const loose = Math.max(0, u - tTop);
    root.position.set(x + V * loose, Math.max(0, y - 0.5 * G * loose * loose), z); root.rotation.set(0, 0, -th - 0.6 * loose); } };
}
