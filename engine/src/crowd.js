// Featureless adult silhouettes (seen from behind / small in frame), phones with glowing screens, birds.
// Crowd = instanced pose variants; Hero = articulated figure (arms/legs pivots) for the one character.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, fbm } from './util.js';
const C = (r1, r2, h, x, y, z, rx = 0, rz = 0, seg = 7) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg); g.translate(0, -h / 2, 0); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); return g; };
const Sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 9, 7); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const Cap = (r, l, x, y, z, sx = 1, sz = 1) => { const g = new THREE.CapsuleGeometry(r, l, 3, 8); g.scale(sx, 1, sz); g.translate(x, y, z); return g; };
// body facing -Z (away from a camera placed at +Z). Units: metres, feet at y=0, ~1.75 m tall.
function bodyParts() {
  return [C(0.075, 0.06, 0.86, -0.1, 0.88, 0), C(0.075, 0.06, 0.86, 0.1, 0.88, 0), // legs
    Cap(0.17, 0.42, 0, 1.18, 0, 1.15, 0.72), // torso
    C(0.05, 0.05, 0.1, 0, 1.55, 0), Sph(0.105, 0, 1.66, 0, 0.92, 1.05, 1.0), // neck, head
    Sph(0.1, 0, 1.3, 0.02, 2.0, 0.6, 1.0)]; // shoulders
}
const ARM = 0.62;
function arm(side, rx, rz) { return C(0.048, 0.04, ARM, side * 0.23, 1.44, 0, rx, rz); }
// pose variants -> { geo, phone: [x,y,z] | null }
function poses() {
  const P = [];
  // 0: phone raised in front (right arm up/forward), left arm down
  P.push({ g: [...bodyParts(), arm(1, 2.2, 0.15), arm(-1, 0.05, -0.08)], phone: [0.12, 1.66, -0.5] });
  // 1: pointing up at the sky (right), left down
  P.push({ g: [...bodyParts(), arm(1, 2.75, 0.3), arm(-1, 0.1, -0.1)], phone: null });
  // 2: both hands on head
  P.push({ g: [...bodyParts(), arm(1, 2.6, -1.0), arm(-1, 2.6, 1.0)], phone: null });
  // 3: arms down (standing, staring)
  P.push({ g: [...bodyParts(), arm(1, 0.05, 0.1), arm(-1, 0.05, -0.1)], phone: null });
  // 4: phone held up with both hands (filming)
  P.push({ g: [...bodyParts(), arm(1, 2.0, 0.55), arm(-1, 2.0, -0.55)], phone: [0, 1.6, -0.45] });
  return P.map((p) => ({ geo: mergeGeometries(p.g.map((g) => g.toNonIndexed ? g.toNonIndexed() : g)), phone: p.phone }));
}
export function createCrowd(S, people, o = {}) {
  // people: [{x, z, y?, yaw, pose?, h?, seed?}] ; yaw = facing angle (0 = facing -Z)
  const PV = poses(); const R = rng(o.seed ?? 3);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  const groups = PV.map(() => []);
  people.forEach((p, i) => { const k = p.pose ?? Math.floor(R() * PV.length * 1.3) % PV.length; groups[k].push({ ...p, seed: p.seed ?? R(), h: p.h ?? 1.62 + R() * 0.28, w: 0.9 + R() * 0.25 }); });
  const meshes = [], phones = [];
  const phoneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.phoneCol ?? 0xbfd8ff).multiplyScalar(o.phoneI ?? 6), side: THREE.DoubleSide });
  const phoneGeo = new THREE.PlaneGeometry(0.075, 0.14);
  const palette = [0x23262b, 0x2d2a27, 0x1c2230, 0x332a2a, 0x2a2f2a, 0x3a3a3e, 0x151517, 0x40342a];
  PV.forEach((pv, k) => {
    const list = groups[k]; if (!list.length) return;
    const m = new THREE.InstancedMesh(pv.geo, mat, list.length); m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false;
    list.forEach((p, i) => m.setColorAt(i, new THREE.Color(palette[Math.floor(p.seed * 997) % palette.length])));
    m.userData.list = list; meshes.push(m); S.scene.add(m);
    if (pv.phone) { const ph = new THREE.InstancedMesh(phoneGeo, phoneMat, list.length); ph.frustumCulled = false; ph.userData = { list, off: pv.phone }; phones.push(ph); S.scene.add(ph); }
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return {
    meshes, phones,
    update(t, st = {}) { // st.agitation 0..1 (sway, bob), st.turn (extra yaw toward something)
      const ag = st.agitation ?? 0.2;
      for (const m of meshes) { m.userData.list.forEach((p, i) => {
        const sw = fbm(t * (0.5 + ag) + p.seed * 50, 3) * (0.04 + 0.1 * ag); const bob = Math.max(0, fbm(t * 2.2 + p.seed * 80, 5)) * 0.06 * ag;
        q.setFromEuler(e.set(sw * 0.4, (p.yaw || 0) + sw, sw * 0.6, 'YXZ'));
        const y = (p.y ?? 0) + bob; const s = p.h / 1.75; m4.compose(v.set(p.x, y, p.z), q, sc.set(s * p.w, s, s * p.w)); m.setMatrixAt(i, m4); });
        m.instanceMatrix.needsUpdate = true; }
      for (const ph of phones) { const off = ph.userData.off; ph.userData.list.forEach((p, i) => {
        const sw = fbm(t * (0.5 + ag) + p.seed * 50, 3) * (0.04 + 0.1 * ag); const s = p.h / 1.75;
        q.setFromEuler(e.set(sw * 0.4, (p.yaw || 0) + sw, sw * 0.6, 'YXZ'));
        const o3 = new THREE.Vector3(off[0] * s * p.w, off[1] * s, off[2] * s * p.w).applyQuaternion(q);
        q.multiply(new THREE.Quaternion().setFromEuler(e.set(-0.25, Math.PI, 0)));
        m4.compose(v.set(p.x + o3.x, (p.y ?? 0) + o3.y, p.z + o3.z), q, sc.set(1, 1, 1)); ph.setMatrixAt(i, m4); });
        ph.instanceMatrix.needsUpdate = true; }
    },
  };
}
// scatter helper: n people in a region, all facing `face` point; groundFn(x,z) gives height
export function scatter(n, region, groundFn, face, seed = 1) {
  const R = rng(seed); const out = [];
  for (let i = 0; i < n; i++) { const x = region.x0 + R() * (region.x1 - region.x0), z = region.z0 + R() * (region.z1 - region.z0);
    if (region.keep && !region.keep(x, z)) { i--; if (out.length > n * 20) break; continue; }
    const yaw = Math.atan2(-(face[0] - x), -(face[1] - z)) + (R() - 0.5) * 0.5; out.push({ x, z, y: groundFn(x, z), yaw }); }
  return out;
}
// Articulated hero: a small clean silhouette. Pivots: armL, armR, legL, legR, head; hoodie + backpack read as "a person", no face.
export function createHero(S, o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0x1b1d22, roughness: 0.8 });
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.92;
  const mk = (g) => { const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
  const torso = mk(Cap(0.18, 0.4, 0, 0.3, 0, 1.15, 0.75)); hips.add(torso);
  const hood = mk(Sph(0.15, 0, 0.66, 0.05, 1.3, 0.55, 1.1)); hips.add(hood);
  const bag = mk(new THREE.BoxGeometry(0.3, 0.38, 0.14).translate(0, 0.32, 0.2)); hips.add(bag);
  const head = new THREE.Group(); head.position.y = 0.66; hips.add(head); head.add(mk(Sph(0.11, 0, 0.09, 0, 0.95, 1.08, 1.0)));
  const limb = (r1, r2, L) => { const g = new THREE.Group(); g.add(mk(C(r1, r2, L, 0, 0, 0))); return g; };
  const armR = limb(0.05, 0.042, 0.62), armL = limb(0.05, 0.042, 0.62); armR.position.set(0.24, 0.55, 0); armL.position.set(-0.24, 0.55, 0); hips.add(armR, armL);
  const legR = limb(0.08, 0.062, 0.9), legL = limb(0.08, 0.062, 0.9); legR.position.set(0.1, 0, 0); legL.position.set(-0.1, 0, 0); hips.add(legR, legL);
  const phone = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfd8ff).multiplyScalar(o.phoneI ?? 5), side: THREE.DoubleSide }));
  phone.position.set(0, -0.62, -0.03); phone.rotation.x = Math.PI / 2; armR.add(phone); phone.visible = !!o.phone;
  S.scene.add(root);
  return { root, hips, head, armR, armL, legR, legL, phone,
    // pose helpers (radians). run(t, speed) for a stride cycle; look(yaw, pitch)
    pose({ armR: ar = [0, 0], armL: al = [0, 0], legR: lr = 0, legL: ll = 0, lean = 0, head: hd = [0, 0] } = {}) {
      armR.rotation.set(ar[0], 0, ar[1]); armL.rotation.set(al[0], 0, -al[1]); legR.rotation.set(lr, 0, 0); legL.rotation.set(ll, 0, 0);
      hips.rotation.x = lean; head.rotation.set(hd[1], hd[0], 0); },
    run(t, f = 1.6, amp = 0.7) { const ph = t * f * Math.PI * 2; this.pose({ legR: Math.sin(ph) * amp, legL: -Math.sin(ph) * amp, armR: [-Math.sin(ph) * amp * 0.9, 0.1], armL: [Math.sin(ph) * amp * 0.9, 0.1], lean: 0.18 });
      hips.position.y = 0.92 + Math.abs(Math.cos(ph)) * 0.05; },
  };
}
// Birds: instanced 3-quad silhouettes with flapping wings (vertex shader), flock follows a path fn(t)->Vector3
export function createBirds(S, n = 40, o = {}) {
  const g = new THREE.BufferGeometry();
  // body + two wings (wing verts tagged with side for flapping)
  const P = [0, 0, -0.25, 0.05, 0, 0.2, -0.05, 0, 0.2, /* L wing */ 0, 0, -0.05, -0.55, 0, 0.05, 0, 0, 0.12, /* R wing */ 0, 0, -0.05, 0.55, 0, 0.05, 0, 0, 0.12];
  const side = [0, 0, 0, 0, -1, 0, 0, 1, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  const R = rng(o.seed ?? 11); const ph = new Float32Array(n); for (let i = 0; i < n; i++) ph[i] = R() * 6.28;
  g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  const U = { time: { value: 0 }, col: { value: new THREE.Color(o.color ?? 0x050608) }, flap: { value: o.flap ?? 9 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `attribute float aSide; attribute float aPh; uniform float time, flap; void main(){ vec3 p = position; float a = sin(time*flap + aPh)*0.9; p.y += abs(p.x)*sin(a)*1.2; p.x *= cos(a*0.6); gl_Position = projectionMatrix*viewMatrix*instanceMatrix*vec4(p,1.); }`,
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.); }' });
  const m = new THREE.InstancedMesh(g, mat, n); m.frustumCulled = false; S.scene.add(m);
  const offs = []; for (let i = 0; i < n; i++) offs.push([(R() - 0.5) * 2, (R() - 0.5) * 0.6, (R() - 0.5) * 2, 0.7 + R() * 0.6]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return { mesh: m, U, update(t, path, spread = 12, size = 1) { U.time.value = t;
    const c = path(t), c2 = path(t + 0.1); const dir = c2.clone().sub(c).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    offs.forEach((f, i) => { const w = fbm(t * 0.4 + i, i) * 0.3; v.set(c.x + (f[0] + w) * spread, c.y + (f[1] + fbm(t * 0.6 + i * 3, i)) * spread * 0.4, c.z + f[2] * spread); m4.compose(v, q, sc.setScalar(size * f[3])); m.setMatrixAt(i, m4); });
    m.instanceMatrix.needsUpdate = true; } };
}
