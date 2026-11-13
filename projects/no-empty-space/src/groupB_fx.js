// no-empty-space GROUP B helpers (s05_ferry, s06_tower, s07_drop). Builder-owned; imports the shared kit, never edits it.
//   waterRing  - a stylised ring of raised water (flat-shaded teal faces, white foam crest): the bore that slams into the
//                ferry's hole (converging) and the ring wave that runs out from it (diverging). Closed form in film time.
//   pitDisc    - the dark hole in the water inside the converging bore.
//   foamPatches- flat white low-poly foam blobs riding the water (instanced, CPU-placed per frame on the ocean's own waves).
//   fishMesh   - a little low-poly fish (silver-blue).
//   boatsB     - extra moored gozzi (kit boat geometry, per-instance colours) with a pose callback.
//   headCap    - the headland's plateau as its own finer mesh (the kit terrain under it is sunk once at load), displaced per
//                frame in closed form: the bowl that caves in, the star of fissures, the slumping breach wedge (s06 scar, s07).
// Everything is a pure function of FILM time (motion-blur safe).
import { THREE } from '@engine/engine.js';
import { rng, fbm, vnoise, clamp, sstep } from '@engine/util.js';
import { LOOK, styliseMat, HEAD, TOWER, PAL, groundH, isLand } from './kit.js';
import { boatGeometry } from './harbour.js';

const lookU = (L = LOOK) => ({ sunDir: { value: L.sunDir.clone() }, sunCol: { value: new THREE.Color(L.sunCol).multiplyScalar(L.sunI) },
  skyCol: { value: new THREE.Color(L.sky).multiplyScalar(0.55) }, gndCol: { value: new THREE.Color(L.gnd).multiplyScalar(0.45) },
  fogCol: { value: new THREE.Color(L.fog) }, fogN: { value: L.fogN }, fogF: { value: L.fogF } });
const LIT = `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
  vec3 lit(vec3 c, vec3 n, vec3 W){ vec3 V = normalize(cameraPosition - W); if (dot(n, V) < 0.) n = -n;
    float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5); return c*(sunCol*dif + amb); }
  vec3 fogged(vec3 c, vec3 W){ float d = length(cameraPosition - W); return mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.)); }
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }`;

// ---------------------------------------------------------------- waterRing
// o: { c (Vector3 centre on the water), ax [ax, az] (m per ellipse unit along x and z), segA 160, segR 10, deep, shallow }
// per frame: ring.set({ rIn, w (ellipse units), H (m crest height), steep (0 smooth bump .. 1 wall facing in), foam 0..1, vis })
export function waterRing(S, o) {
  const segA = o.segA ?? 160, segR = o.segR ?? 10, pos = [];
  for (let i = 0; i < segA; i++) for (let j = 0; j < segR; j++) {
    const a0 = (i / segA) * Math.PI * 2, a1 = ((i + 1) / segA) * Math.PI * 2, s0 = j / segR, s1 = (j + 1) / segR;
    pos.push(a0, s0, 0, a0, s1, 0, a1, s0, 0, a1, s0, 0, a0, s1, 0, a1, s1, 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const U = { c: { value: o.c.clone() }, ax: { value: new THREE.Vector2(...(o.ax ?? [1, 1])) }, rIn: { value: 0.5 }, w: { value: 0.3 }, H: { value: 1 },
    steep: { value: 0 }, foam: { value: 1 }, time: { value: 0 }, deep: { value: new THREE.Color(o.deep ?? 0x0b5f7a) }, shallow: { value: new THREE.Color(o.shallow ?? 0x2fb3b5) }, ...lookU() };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide, extensions: { derivatives: true },
    vertexShader: `uniform vec3 c; uniform vec2 ax; uniform float rIn, w, H, steep, time; varying vec3 vW; varying float vS; varying float vA; varying float vY;
      void main(){ float a = position.x, s = position.y;
        float rho = rIn + w*s;
        float pk = mix(0.5, 0.12, steep);                      // where the crest sits across the ring (0 = inner lip)
        float h = s < pk ? smoothstep(0., pk, s) : 1. - smoothstep(pk, 1., s);
        h = pow(h, mix(1.0, 0.6, steep));
        float wob = 0.18*sin(a*7. + time*3.1) + 0.12*sin(a*13. - time*4.3) + 0.1*sin(a*29. + time*2.);
        float y = H*h*(1. + wob*0.6) - 0.05;
        vec3 p = c + vec3(cos(a)*ax.x*rho, y, sin(a)*ax.y*rho);
        vW = p; vS = s; vA = a; vY = h;
        gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
    fragmentShader: `${LIT} uniform vec3 deep, shallow; uniform float foam, time; varying vec3 vW; varying float vS; varying float vA; varying float vY;
      void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec3 col = mix(deep, shallow, 0.35 + 0.5*vY);
        float streak = h21(vec2(floor(vA*40.), floor(vS*6.)));
        float f = foam*smoothstep(0.55, 0.9, vY + 0.25*streak - 0.1);
        col = mix(col, vec3(0.97, 0.97, 0.95), clamp(f, 0., 1.));
        gl_FragColor = vec4(fogged(lit(col, n, vW), vW), 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; S.scene.add(mesh);
  return { mesh, U, set(st) { for (const k of ['rIn', 'w', 'H', 'steep', 'foam', 'time']) if (st[k] !== undefined) U[k].value = st[k]; mesh.visible = st.vis ?? true; } };
}

// the dark pit inside a converging bore: an ellipse of dark water at the surface (r in ellipse units)
export function pitDisc(S, c, ax) {
  const g = new THREE.CircleGeometry(1, 64); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x06303e, polygonOffset: true, polygonOffsetFactor: -4, fog: true });
  const m = new THREE.Mesh(g, mat); m.position.copy(c).setY(0.08); m.visible = false; S.scene.add(m);
  return { mesh: m, set(r) { m.visible = r > 0.02; m.scale.set(ax[0] * r, 1, ax[1] * r); } };
}

// ---------------------------------------------------------------- foam patches (flat white blobs on the water)
// list: [{ x, z, s (m), t0, t1 (film: fade in/out), drift [vx, vz] }]; update(film, heightFn(x, z) -> y)
export function foamPatches(S, list) {
  const geo = new THREE.IcosahedronGeometry(1, 0); geo.scale(1, 0.12, 1);
  const m = new THREE.InstancedMesh(geo, styliseMat(new THREE.MeshStandardMaterial({ color: 0xf4f6f2, roughness: 0.9 })), Math.max(1, list.length));
  m.frustumCulled = false; S.scene.add(m);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  return { mesh: m, update(film, hf) {
    list.forEach((f, i) => { const k = sstep(f.t0, f.t0 + 0.4, film) * (1 - sstep(f.t1 - 0.8, f.t1, film));
      if (k <= 0.01) { m.setMatrixAt(i, _m.makeScale(0, 0, 0)); return; }
      const a = film - f.t0, x = f.x + (f.drift?.[0] ?? 0) * a, z = f.z + (f.drift?.[1] ?? 0) * a;
      _q.setFromAxisAngle(Y, f.r ?? 0); m.setMatrixAt(i, _m.compose(_v.set(x, hf(x, z) + 0.06, z), _q, _s.set(f.s * k * (f.sx ?? 1), 1, f.s * k))); });
    m.instanceMatrix.needsUpdate = true; } };
}

// ---------------------------------------------------------------- a low-poly fish (~0.5 m, nose -Z)
export function fishMesh(S, col = 0x8fa8b8) {
  const g = new THREE.Group(), body = new THREE.IcosahedronGeometry(1, 0); body.scale(0.07, 0.1, 0.26);
  const mb = styliseMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 })), mt = styliseMat(new THREE.MeshStandardMaterial({ color: 0x5a7a8e }));
  const b = new THREE.Mesh(body, mb); g.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 3), mt); tail.rotation.x = -Math.PI / 2; tail.scale.set(0.3, 1, 1); tail.position.z = 0.3; g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), mt); fin.position.set(0, 0.1, 0.02); g.add(fin);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); g.userData.tail = tail; S.scene.add(g); return g;
}

// ---------------------------------------------------------------- extra gozzi (kit hull)
// list: [{ x, z, yaw, s, col }]; update(film, poseFn(b, i) -> { p, q } | null (default bob on hf))
export function boatsB(S, list) {
  const m = new THREE.InstancedMesh(boatGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, side: THREE.DoubleSide }), Math.max(1, list.length));
  const c = new THREE.Color(); list.forEach((b, i) => m.setColorAt(i, c.set(b.col))); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; S.scene.add(m);
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
  return { mesh: m, update(film, poseFn) { list.forEach((b, i) => { const P = poseFn(b, i, film); m.setMatrixAt(i, P ? _m.compose(P.p, P.q, _s.setScalar(b.s ?? 1)) : _m.makeScale(0, 0, 0)); }); m.instanceMatrix.needsUpdate = true; } };
}

// ---------------------------------------------------------------- vortexShards (s06: the tower's FUNNEL; a local variant of
// squeeze.js's shard motion, which contracts radially and reads like a shrinking model on a 381 m column). Each shard tears off
// (outside first), PEELS OUT into a debris funnel around the vertical axis through c0 (wider the higher it started), spirals
// faster and faster and dives into the point, stretched along its path and heating white-gold on arrival.
// list: shardsFrom output; o: { T, dur, c0, H (height for the funnel shape), drop(film), spin 7, kpow 2.4, tear 0.5, Rv: [r0, r1] m,
// stretch 6, hot, heatI 6 }. update(film). (The bead/light/source-hiding stay with a kit squeeze() at the same T.)
const ROT3 = `mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
  return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }`;
export function vortexShards(S, list, o) {
  const c0 = o.c0.clone(), R = rng(o.seed ?? 17), N = list.length, [rv0, rv1] = o.Rv ?? [30, 140];
  let rmax = 1e-6; list.forEach((s) => { rmax = Math.max(rmax, Math.hypot(s.p[0] - c0.x, s.p[1] - c0.y, s.p[2] - c0.z)); });
  const aP = new Float32Array(N * 4), aS = new Float32Array(N * 4), aC = new Float32Array(N * 3);
  list.forEach((s, i) => { const r = Math.hypot(s.p[0] - c0.x, s.p[1] - c0.y, s.p[2] - c0.z) / rmax;
    aP.set([s.p[0], s.p[1], s.p[2], clamp(1 - r + 0.15 * (R() - 0.5))], i * 4);
    aS.set([s.size, R(), R() < 0.55 ? 1 : 0, rv0 + (rv1 - rv0) * Math.pow(R(), 0.7)], i * 4); (s.col.isColor ? s.col : new THREE.Color(s.col)).toArray(aC, i * 3); });
  const base = new THREE.TetrahedronGeometry(0.62).toNonIndexed(); base.computeVertexNormals();
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal);
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); g.instanceCount = N;
  const U = { film: { value: -1 }, T: { value: o.T }, dur: { value: o.dur }, c0: { value: c0 }, drop: { value: 0 }, spin: { value: o.spin ?? 7 }, kpow: { value: o.kpow ?? 2.4 },
    tear: { value: o.tear ?? 0.5 }, H: { value: o.H ?? 380 }, stretch: { value: o.stretch ?? 6 }, hot: { value: new THREE.Color(o.hot ?? 0xfff0c8) }, heatI: { value: o.heatI ?? 6 }, ...lookU() };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${ROT3} attribute vec4 aP; attribute vec4 aS; attribute vec3 aC; uniform float film, T, dur, drop, spin, kpow, tear, H, stretch; uniform vec3 c0;
      varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      vec3 pathAt(float k, float sd){ vec3 r0 = aP.xyz - c0; float h0 = r0.y, rh0 = length(r0.xz), ph0 = atan(r0.z, r0.x);
        float bump = pow(sin(3.14159*min(1., k*1.12)), 0.75);
        float Rv = aS.w*(0.2 + 0.8*clamp(h0/H, 0., 1.));
        float rh = (rh0 + Rv*bump)*(1. - k);
        float ph = ph0 + spin*(k + 1.6*k*k)*(0.75 + 0.5*sd);
        float h = h0*(1. - pow(k, 0.8)) + 0.12*Rv*bump*(1. - k);
        return vec3(cos(ph)*rh, h, sin(ph)*rh); }
      void main(){ float age = film - T; float st0 = aP.w*tear*dur;
        float u = clamp((age - st0)/max(dur - st0, 1e-3), 0., 1.), k = pow(u, kpow);
        if (age < 0. || k > 0.995) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float sd = aS.y; vC = aC; vHeat = smoothstep(0.5, 0.98, k);
        vec3 c = c0 - vec3(0., drop, 0.);
        vec3 p = c + pathAt(k, sd), pp = c + pathAt(max(k - 0.025, 0.), sd);
        vec3 rd = length(p - pp) > 1e-4 ? normalize(p - pp) : vec3(0., -1., 0.);
        float sz = aS.x*(1. - 0.7*k);
        vec3 spinA = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), 2.0 + 4.0*fract(sd*3.7))*(age*5. + k*9.) + sd*6.28;
        mat3 Rm = rot(spinA); vec3 lp = Rm*(position*sz*(aS.z > 0.5 ? vec3(1.6, 0.18, 1.2) : vec3(1.)));
        float stc = 1. + stretch*smoothstep(0., 0.3, k)*(1. - k)*2.2;
        lp += rd*dot(lp, rd)*(stc - 1.);
        vN = normalize(Rm*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT} uniform vec3 hot; uniform float heatI; varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      void main(){ vec3 col = lit(vC, normalize(vN), vW); col = mix(col, hot*heatI, vHeat*vHeat); gl_FragColor = vec4(fogged(col, vW), 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; S.scene.add(mesh);
  return { mesh, U, update(film, drop = 0) { U.film.value = film; U.drop.value = drop; } };
}

// ---------------------------------------------------------------- dust puffs: translucent flat-shaded low-poly billows (crisp
// faceted, NOT fluffy smoke), ballistic with linear drag (same law as kit bits), growing as they travel, fading over their life.
// list: [{ p, v, t0, size, grow (m/s), col, drag, floor, life, flat (y squash) }]; update(film)
export function dustPuffs(S, list, o = {}) {
  const base = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(); base.computeVertexNormals();
  const N = list.length, g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal);
  const aP = new Float32Array(N * 4), aV = new Float32Array(N * 4), aS = new Float32Array(N * 4), aC = new Float32Array(N * 3), c = new THREE.Color();
  list.forEach((b, i) => { aP.set([...b.p, b.t0], i * 4); aV.set([...b.v, b.drag ?? 0.6], i * 4); aS.set([b.size, b.grow ?? 2, b.life ?? 4, b.flat ?? 0.7], i * 4); c.set(b.col).toArray(aC, i * 3); });
  for (const [k, a, s] of [['aP', aP, 4], ['aV', aV, 4], ['aS', aS, 4], ['aC', aC, 3]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, s));
  g.instanceCount = N;
  const U = { film: { value: -1 }, op: { value: o.opacity ?? 0.62 }, floorY: { value: o.floor ?? 0.3 }, ...lookU() };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: `attribute vec4 aP; attribute vec4 aV; attribute vec4 aS; attribute vec3 aC; uniform float film, floorY; varying vec3 vW; varying vec3 vC; varying float vA;
      float h11(float x){ return fract(sin(x*91.7)*43758.5); }
      void main(){ float a = film - aP.w; if (a < 0. || a > aS.z) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float k = aV.w, e = exp(-k*a), f = (1. - e)/k; vec3 p = aP.xyz + aV.xyz*f; p.y -= 9.81*0.15*(a/k - f/k);   // dust: nearly weightless
        float sz = aS.x + aS.y*a; p.y = max(p.y, floorY + sz*aS.w*0.6);
        float sd = h11(aP.x*0.13 + aP.z*0.71 + aP.w);
        float ca = cos(sd*6.28 + a*0.2), sa = sin(sd*6.28 + a*0.2);
        vec3 q = vec3(ca*position.x - sa*position.z, position.y*aS.w, sa*position.x + ca*position.z)*sz;
        vC = aC; vA = smoothstep(0., 0.25, a)*(1. - smoothstep(aS.z*0.55, aS.z, a));
        vec4 w = modelMatrix*vec4(p + q, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT} uniform float op; varying vec3 vW; varying vec3 vC; varying float vA;
      void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec3 col = mix(lit(vC, n, vW), vC*1.05, 0.45);
        gl_FragColor = vec4(fogged(col, vW), op*vA); }` });
  mat.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = o.renderOrder ?? 20; S.scene.add(mesh);
  return { mesh, U, update(film) { U.film.value = film; } };
}

// ---------------------------------------------------------------- the headland cap (s06 scar, s07 cave-in)
// The kit terrain is one flat-shaded 10 m grid. headCap sinks its vertices inside rSink once (y -> -60) and lays its own 4 m
// grid over the plateau (same heights from groundH, the terrain's own colouring copied), which we displace per frame with
// dispFn(x, z, film) -> metres down (>= 0). Cells whose 4 corners are all water are skipped. polygonOffset wins the overlap.
const _tc = new THREE.Color();
function terrColour(x, y, z, ny) {           // a copy of harbour.js buildTerrain colorAt (keep the cap's seam invisible)
  if (y < 0.4) return _tc.set(PAL.sand).multiplyScalar(0.8 + 0.1 * vnoise(x * 0.05, 3));
  if (y < 2.2 && !isLand(x, z)) return _tc.set(PAL.rock);
  const steep = 1 - ny, nn = 0.5 + 0.5 * fbm(x * 0.02 + z * 0.017, 5);
  if (steep > 0.45) return _tc.set(PAL.rock).lerp(new THREE.Color(PAL.rockDark), nn * 0.6);
  return _tc.set(PAL.scrub).lerp(new THREE.Color(PAL.dry), clamp(nn * 1.2 - 0.1 + steep)).multiplyScalar(0.92 + 0.12 * vnoise(x * 0.09 + z * 0.07, 8));
}
export function headCap(S, terrain, o = {}) {
  const cx = o.cx ?? TOWER.x, cz = o.cz ?? TOWER.z, R0 = o.r ?? 250, rSink = R0 - 22, step = o.step ?? 4;
  // 1) sink the kit terrain's vertices inside rSink (one time; only this page's copy)
  { const P = terrain.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); if (Math.hypot(x - cx, z - cz) < rSink && P.getY(i) > -14) P.setY(i, -60); } P.needsUpdate = true; }
  // 2) the cap grid: a square around (cx, cz) clipped to the disc R0 (cells kept if any corner is inside)
  const n = Math.ceil((2 * R0) / step), x0 = cx - (n * step) / 2, z0 = cz - (n * step) / 2;
  const vx = [], vz = [], vh = [], tris = [];
  const id = (i, j) => j * (n + 1) + i;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = x0 + i * step, z = z0 + j * step; vx.push(x); vz.push(z); vh.push(groundH(x, z)); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
    const inside = [a, b, c, d].some((k) => Math.hypot(vx[k] - cx, vz[k] - cz) < R0);
    if (!inside || [a, b, c, d].every((k) => vh[k] < -10)) continue;
    tris.push(a, c, b, b, c, d);                 // CCW from above (as the kit terrain)
  }
  const N = tris.length, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let t = 0; t < N; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    e1.set(vx[b] - vx[a], vh[b] - vh[a], vz[b] - vz[a]); e2.set(vx[c] - vx[a], vh[c] - vh[a], vz[c] - vz[a]); nn.crossVectors(e1, e2).normalize();
    terrColour((vx[a] + vx[b] + vx[c]) / 3, (vh[a] + vh[b] + vh[c]) / 3, (vz[a] + vz[b] + vz[c]) / 3, Math.abs(nn.y));
    for (let k = 0; k < 3; k++) { const v = tris[t + k]; pos.set([vx[v], vh[v], vz[v]], (t + k) * 3); col.set([_tc.r, _tc.g, _tc.b], (t + k) * 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const base = col.slice();
  // the fresh rock colour shown where the ground has dropped (dark broken rock, a hot glow deep in the centre shaft)
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.castShadow = true; mesh.frustumCulled = false; S.scene.add(mesh);
  const hv = Float32Array.from(vh), uniq = vx.length, disp = new Float32Array(uniq);
  let lastKey = null;
  const fresh = new THREE.Color(0x6e5a46), deepC = new THREE.Color(0x3a2e24);
  return { mesh, cx, cz, R0, groundAt: (x, z) => groundH(x, z),
    // dispFn(x, z, h0) -> metres down; recolour: newly exposed rock darkens with depth. key: skip the rebuild when the caller's
    // (pure, quantised) time key has not changed: the ground moves slowly, so it is evaluated once per frame, not per sub-sample.
    update(dispFn, key) {
      if (key !== undefined && key === lastKey) return; lastKey = key;
      for (let v = 0; v < uniq; v++) disp[v] = dispFn(vx[v], vz[v], hv[v]);
      const P = g.attributes.position, C = g.attributes.color;
      for (let t = 0; t < N; t++) { const v = tris[t]; P.array[t * 3 + 1] = hv[v] - disp[v]; }
      for (let t = 0; t < N; t += 3) { const d = (disp[tris[t]] + disp[tris[t + 1]] + disp[tris[t + 2]]) / 3, k = clamp(d / 6), kd = clamp((d - 20) / 50);
        for (let q = 0; q < 3; q++) { const i3 = (t + q) * 3; _tc.setRGB(base[i3], base[i3 + 1], base[i3 + 2]).lerp(fresh, k).lerp(deepC, kd); C.array[i3] = _tc.r; C.array[i3 + 1] = _tc.g; C.array[i3 + 2] = _tc.b; } }
      P.needsUpdate = true; C.needsUpdate = true;
    } };
}

// The cave-in law (shared by s06's scar and s07): metres the ground at (x, z) has dropped at film time `film`.
// tScar: when the tower's squeeze rips the top rock (s06, 33.0 + ~0.5); the cave-in proper starts at T_CAVE (s07 film 37.6),
// runs ~3.5 s. Star of fissures: NF radial cracks; the breach wedge between two of them (toward the sea, SW) slumps out.
export const CAVE = { T_SCAR: 33.35, T_CAVE: 37.2, DUR: 3.8, RB: 105, DEPTH: 46, NF: 7, BREACH: [2.28, 2.74] /* rad sector atan2(dz, dx) from the tower: SW, the cliff facing s07's camera, sunlit */ };
// the star: two cracks bound the breach wedge (it breaks out between them), one splits it, the rest radiate round the plateau
const FISS = [CAVE.BREACH[0] - 0.02, CAVE.BREACH[1] + 0.02, (CAVE.BREACH[0] + CAVE.BREACH[1]) / 2 + 0.06, 1.45, 3.55, 0.55, 4.45, 5.35];
export function caveDrop(x, z, h0, film) {
  const dx = x - TOWER.x, dz = z - TOWER.z, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
  let d = 0;
  // s06 scar: the rock ripped off around the base (a shallow ragged bowl, 0 -> 9 m in 0.5 s)
  const ks = sstep(CAVE.T_SCAR, CAVE.T_SCAR + 0.5, film);
  if (ks > 0 && r < 62) d += ks * 9 * Math.pow(1 - r / 62, 1.2) * (0.75 + 0.5 * vnoise(a * 4 + r * 0.05, 3));
  const u = clamp((film - CAVE.T_CAVE) / CAVE.DUR); if (u <= 0) return d;
  // fissures open first (0 -> 0.4), then the bowl drops (0.15 -> 1, accelerating), then the breach slumps (0.35 -> 1)
  const kf = sstep(0, 0.4, u), kb = Math.pow(sstep(0.12, 1, u), 1.5), kw = Math.pow(sstep(0.3, 1, u), 1.3);
  const wid = 2 + 8 * kf;
  for (let i = 0; i < FISS.length; i++) { const ai = FISS[i], da = Math.atan2(Math.sin(a - ai), Math.cos(a - ai));
    if (Math.abs(da) > 1.2) continue; const perp = Math.abs(Math.sin(da)) * r, wig = 2.5 * Math.sin(r * 0.06 + i * 1.7);
    const reach = 70 + 160 * kf; if (r > reach) continue;
    d = Math.max(d, kf * (18 + 0.12 * r) * Math.exp(-Math.pow((perp - wig) / wid, 2)) * (1 - sstep(reach - 20, reach, r))); }
  if (r < CAVE.RB * 1.25) d = Math.max(d, kb * CAVE.DEPTH * Math.pow(Math.max(0, 1 - Math.pow(r / (CAVE.RB * 1.25), 2)), 1.3) * (0.85 + 0.3 * vnoise(a * 3 + 5, 7)));
  // breach wedge: from the bowl out to the cliff, the ground slumps toward the sea (deeper with distance -> a notch)
  const [b0, b1] = CAVE.BREACH;
  { const e0 = b0 + 0.13 * vnoise(r * 0.045 + 1.7, 11), e1 = b1 + 0.13 * vnoise(r * 0.045 + 8.3, 12);   // ragged, wandering flanks
    if (a > e0 - 0.1 && a < e1 + 0.1 && r > 40) { const edge = sstep(e0 - 0.1, e0 + 0.1, a) * (1 - sstep(e1 - 0.1, e1 + 0.1, a));
      const rag = 0.75 + 0.5 * (0.5 + 0.5 * vnoise(a * 9 + r * 0.08, 13));
      d = Math.max(d, kw * edge * Math.min(h0 + 6, (18 + 0.35 * r) * rag)); } }
  return Math.min(d, Math.max(0, h0 + 8));
}
