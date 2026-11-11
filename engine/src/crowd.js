// Featureless adult silhouettes (seen from behind / small in frame), phones with glowing screens, birds.
// Crowd = instanced pose variants; Hero = articulated figure (arms/legs pivots) for the one character.
import * as THREE from 'three';
import { castVariants, figureMaterial, figureGeometry, PALETTE, POSES } from './figure.js';
import { rng, fbm } from './util.js';
export function createCrowd(S, people, o = {}) {
  // people: [{x, z, y?, yaw, pose?: name in POSES}] ; yaw = facing angle (0 = facing -Z)
  const R = rng(o.seed ?? 3);
  const poseNames = o.poses ?? ['phoneUp', 'phoneUp', 'filming', 'point', 'handsHead', 'stand', 'shade', 'arms', 'pocket', 'phoneUp', 'stand', 'filming'];
  const V = castVariants(R, poseNames, o.variants ?? poseNames.length, o.res ?? 0.018);
  const mat = figureMaterial({ instanced: true, rimI: o.rimI ?? 0.8, rimCol: o.rimCol });
  const groups = V.map(() => []);
  people.forEach((p) => { let k = p.pose ? poseNames.indexOf(p.pose) : -1; if (k < 0) k = Math.floor(R() * V.length);
    groups[k].push({ ...p, seed: R(), h: 1, hair: pick(R, PALETTE.hair), top: pick(R, PALETTE.top), bot: pick(R, PALETTE.bot) }); });
  const meshes = [], phones = [];
  const phoneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.phoneCol ?? 0xbfd8ff).multiplyScalar(o.phoneI ?? 6), side: THREE.DoubleSide });
  const phoneGeo = new THREE.PlaneGeometry(0.075, 0.14);
  V.forEach((v, k) => {
    const list = groups[k]; if (!list.length) return;
    const geo = v.geo.clone();
    const cols = { aHair: new Float32Array(list.length * 3), aTop: new Float32Array(list.length * 3), aBot: new Float32Array(list.length * 3) };
    list.forEach((p, i) => { new THREE.Color(p.hair).toArray(cols.aHair, i * 3); new THREE.Color(p.top).toArray(cols.aTop, i * 3); new THREE.Color(p.bot).toArray(cols.aBot, i * 3); });
    for (const key in cols) geo.setAttribute(key, new THREE.InstancedBufferAttribute(cols[key], 3));
    const m = new THREE.InstancedMesh(geo, mat, list.length); m.castShadow = true; m.frustumCulled = false;
    m.userData.list = list; meshes.push(m); S.scene.add(m);
    for (const ph of v.phone) { const pm = new THREE.InstancedMesh(phoneGeo, phoneMat, list.length); pm.frustumCulled = false; pm.userData = { list, off: ph.p }; phones.push(pm); S.scene.add(pm); }
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const qPh = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25, Math.PI, 0));
  const tq = new THREE.Quaternion(), e2 = new THREE.Euler(), PIV = new THREE.Vector3(0, 0.95, 0), ZERO = new THREE.Vector3();
  return {
    meshes, phones, material: mat,
    update(t, st = {}) { // st.agitation 0..1
      const ag = st.agitation ?? 0.2;
      const sway = (p) => fbm(t * (0.5 + ag) + p.seed * 50, 3) * (0.03 + 0.08 * ag);
      // st.lift: metres added to everyone's height (or (p) => metres); st.tumble: 0.. scale of a per-person spin about the waist
      const lift = typeof st.lift === 'function' ? st.lift : () => (st.lift ?? 0), tb = st.tumble ?? 0;
      const pose = (p) => { const sw = sway(p); q.setFromEuler(e.set(sw * 0.3, (p.yaw || 0) + sw * 0.8, sw * 0.5, 'YXZ'));
        let off = ZERO; if (tb) { const f = (k) => ((p.seed * k) % 1) - 0.5;
          tq.setFromEuler(e2.set(tb * f(7.31) * 2.6, tb * f(3.17) * 3.0, tb * f(5.53) * 2.6)); q.premultiply(tq); off = PIV.clone().sub(PIV.clone().applyQuaternion(q)); }
        return off; };
      for (const m of meshes) { m.userData.list.forEach((p, i) => { const off = pose(p);
        const bob = Math.max(0, fbm(t * 2.2 + p.seed * 80, 5)) * 0.05 * ag * (tb ? 0 : 1);
        m4.compose(v3.set(p.x + off.x, (p.y ?? 0) + bob + lift(p) + off.y, p.z + off.z), q, one); m.setMatrixAt(i, m4); }); m.instanceMatrix.needsUpdate = true; }
      for (const ph of phones) { const off = ph.userData.off; ph.userData.list.forEach((p, i) => { const po = pose(p);
        const o3 = new THREE.Vector3(...off).applyQuaternion(q);
        m4.compose(v3.set(p.x + o3.x + po.x, (p.y ?? 0) + o3.y + lift(p) + po.y, p.z + o3.z + po.z), q.clone().multiply(qPh), one); ph.setMatrixAt(i, m4); }); ph.instanceMatrix.needsUpdate = true; }
    },
  };
}
const pick = (R, a) => a[Math.floor(R() * a.length)];
// scatter helper: n people in a region, all facing `face` point; groundFn(x,z) gives height
export function scatter(n, region, groundFn, face, seed = 1) {
  const R = rng(seed); const out = [];
  for (let i = 0; i < n; i++) { const x = region.x0 + R() * (region.x1 - region.x0), z = region.z0 + R() * (region.z1 - region.z0);
    if (region.keep && !region.keep(x, z)) { i--; if (out.length > n * 20) break; continue; }
    const yaw = Math.atan2(-(face[0] - x), -(face[1] - z)) + (R() - 0.5) * 0.5; out.push({ x, z, y: groundFn(x, z), yaw }); }
  return out;
}
// Hero: one detailed organic figure (res 1.1 cm). setPose(name|poseObj) rebuilds the mesh (cached per pose).
export function createHero(S, o = {}) {
  const look = { hair: o.hair ?? 'hood', coat: o.coat ?? 0.32, bag: o.bag ?? 'backpack', height: o.height ?? 1.74, build: o.build ?? 1.0, fem: o.fem ?? 0.2 };
  const mat = figureMaterial({ top: o.top ?? 0x3a2a24, bot: o.bot ?? 0x1a1b20, hair: o.hairCol ?? 0x15100c, bag: o.bagCol ?? 0x5a3a1e, rimI: o.rimI ?? 1.0 });
  const root = new THREE.Group(); const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = true; root.add(mesh);
  const phoneMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfd8ff).multiplyScalar(o.phoneI ?? 6), side: THREE.DoubleSide }));
  phoneMesh.rotation.set(-0.25, Math.PI, 0); root.add(phoneMesh);
  const cache = new Map(); let cur = null;
  S.scene.add(root);
  const api = { root, mesh, material: mat, phone: phoneMesh,
    setPose(pose) { const key = typeof pose === 'string' ? pose : JSON.stringify(pose); if (key === cur) return; cur = key;
      if (!cache.has(key)) cache.set(key, figureGeometry({ ...look, pose: typeof pose === 'string' ? POSES[pose] : pose }, o.res ?? 0.011));
      const g = cache.get(key); mesh.geometry = g; const ph = g.userData.phone[0];
      phoneMesh.visible = !!ph; if (ph) phoneMesh.position.set(...ph.p); } };
  api.setPose(o.pose ?? 'phoneUp');
  return api;
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
