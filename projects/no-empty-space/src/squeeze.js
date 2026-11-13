// no-empty-space N1: THE SQUEEZE (lead-owned; every rung imports it through kit.js; Builders never edit it).
// Physical, never a scale-down: the object is swapped at T for thousands of low-poly SHARDS sampled from its own surfaces
// (its own colours), which tear off from the OUTSIDE IN, spiral and stretch into one point and heat up white-gold as they
// arrive; the point is a hot BEAD (bloom, never a frame-wide flash) that is already FALLING (story.depthAt: the squeeze is
// physically instant at T, so the core falls from T), with a short glowing drop streak. Plus BITS: ballistic low-poly chips
// (napkins, leaves, lemons, tiles, glass, dust puffs) with drag, gravity and a floor, for the air inrush (velocity toward the
// point) and the outward pressure ring. Everything is closed form in FILM time: deterministic, safe for motion-blur samples.
import { THREE } from '@engine/engine.js';
import { rng } from '@engine/util.js';

const DEF_LOOK = { sunDir: new THREE.Vector3(-0.85, 0.34, 0.35).normalize(), sunCol: 0xffb25c, sunI: 1.7, sky: 0x86a8e6, gnd: 0x9a6e46, fog: 0xf2c896, fogN: 400, fogF: 9000 };
const lookUniforms = (L) => ({ sunDir: { value: L.sunDir.clone() }, sunCol: { value: new THREE.Color(L.sunCol).multiplyScalar(L.sunI) },
  skyCol: { value: new THREE.Color(L.sky).multiplyScalar(0.55) }, gndCol: { value: new THREE.Color(L.gnd).multiplyScalar(0.45) },
  fogCol: { value: new THREE.Color(L.fog) }, fogN: { value: L.fogN }, fogF: { value: L.fogF } });
const LIT_FS = `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
  vec3 lit(vec3 c, vec3 n, vec3 W){ vec3 V = normalize(cameraPosition - W); if (dot(n, V) < 0.) n = -n;
    float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5); return c*(sunCol*dif + amb); }
  vec3 fogged(vec3 c, vec3 W){ float d = length(cameraPosition - W); return mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.)); }`;
const ROT = `mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
  return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }`;
function instGeo(base) { const b = base.index ? base.toNonIndexed() : base; b.computeVertexNormals(); const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', b.attributes.position); g.setAttribute('normal', b.attributes.normal); return g; }

// ---------------------------------------------------------------- sample shards from the surfaces of meshes (area-weighted)
// objects: Object3D[] (Mesh / InstancedMesh, any depth; updateMatrixWorld first). n shards. o: { size: [s0, s1] (m), seed,
// colorOf: (mesh, faceIndex, defaultColor) => Color (override), kindColors: { 3: glass colour } } -> [{ p, col, size }]
const _c = new THREE.Color(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4(), _mi = new THREE.Matrix4();
export function shardsFrom(objects, n, o = {}) {
  const R = rng(o.seed ?? 3), tris = [];                     // { a, b, c (world), col, area }
  const glass = new THREE.Color(o.glass ?? 0x93b8c8);
  const take = (mesh, M) => {
    const g = mesh.geometry, P = g.attributes.position, C = g.attributes.color, Wk = g.attributes.aW, idx = g.index;
    const base = new THREE.Color(mesh.material?.color ?? 0xffffff);
    const nt = idx ? idx.count / 3 : P.count / 3;
    for (let t = 0; t < nt; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      const a = new THREE.Vector3().fromBufferAttribute(P, i0).applyMatrix4(M), b = new THREE.Vector3().fromBufferAttribute(P, i1).applyMatrix4(M), c = new THREE.Vector3().fromBufferAttribute(P, i2).applyMatrix4(M);
      const area = _a.subVectors(b, a).cross(_b.subVectors(c, a)).length() / 2; if (area <= 1e-9) continue;
      let col = base.clone(); if (C) col.multiply(_c.fromBufferAttribute(C, i0));
      if (Wk && Math.round(Wk.getZ(i0)) === 3) col = glass.clone();
      if (o.colorOf) col = o.colorOf(mesh, t, col) ?? col;
      tris.push({ a, b, c, col, area });
    }
  };
  for (const ob of objects) ob.traverse((m) => {
    if (!m.isMesh || !m.visible || !m.geometry?.attributes?.position) return;
    m.updateWorldMatrix(true, false);
    if (m.isInstancedMesh) { for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, _mi); const M = _m.multiplyMatrices(m.matrixWorld, _mi).clone();
      const keep = m.instanceColor ? new THREE.Color().fromBufferAttribute(m.instanceColor, i) : null; const s0 = tris.length; take(m, M); if (keep) for (let k = s0; k < tris.length; k++) tris[k].col.multiply(keep); } }
    else take(m, m.matrixWorld);
  });
  if (!tris.length) return [];
  let tot = 0; const cdf = tris.map((t) => (tot += t.area));
  const [s0, s1] = o.size ?? [0.01, 0.03], out = [];
  for (let k = 0; k < n; k++) {
    const x = R() * tot; let lo = 0, hi = cdf.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < x) lo = mid + 1; else hi = mid; }
    const t = tris[lo]; let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = t.a.clone().addScaledVector(_d.subVectors(t.b, t.a), u).addScaledVector(_v.subVectors(t.c, t.a), v);
    out.push({ p: p.toArray(), col: t.col.clone().multiplyScalar(0.9 + 0.2 * R()), size: s0 + (s1 - s0) * Math.pow(R(), 1.8) });
  }
  return out;
}

// ---------------------------------------------------------------- the squeeze
// o: { T (film s), dur (film s), c0 (Vector3: the squeeze point), shards (from shardsFrom), sources: [Object3D] (hidden from T),
//      drop: (film) => m (default 0; pass t => story.depthAt(name, t)), spin 5 (rad over the implosion), kpow 2.4, tear 0.45
//      (outer shards start first: the innermost waits tear*dur), stretch 6, hot 0xfff0c8, heatI 6 (emissive at arrival),
//      bead: { r (world m of the glow), minPx 6 (design px), I 9 (peak), cool 0.35 (I after cooling), coolT 1.6 (s), col },
//      streak: { len 0 (m; 0 = off), w (m) }, light: { I 0 (PointLight peak; 0 = none), dist }, look }
// returns { mesh, bead, streak, light, centreAt(film), beadI(film), update(film, camera) }
export function createSqueeze(S, o) {
  const L = { ...DEF_LOOK, ...(o.look ?? {}) }, T = o.T, dur = o.dur, c0 = o.c0.clone(), list = o.shards ?? [];
  const drop = o.drop ?? (() => 0), R = rng(o.seed ?? 11);
  let rmax = 1e-6; list.forEach((s) => { rmax = Math.max(rmax, Math.hypot(s.p[0] - c0.x, s.p[1] - c0.y, s.p[2] - c0.z)); });
  const U = { film: { value: -1 }, T: { value: T }, dur: { value: dur }, c0: { value: c0 }, drop: { value: 0 }, spin: { value: o.spin ?? 5 },
    kpow: { value: o.kpow ?? 2.4 }, tear: { value: o.tear ?? 0.45 }, stretch: { value: o.stretch ?? 6 }, hot: { value: new THREE.Color(o.hot ?? 0xfff0c8) },
    heatI: { value: o.heatI ?? 6 }, ...lookUniforms(L) };
  const N = list.length, aP = new Float32Array(N * 4), aS = new Float32Array(N * 4), aC = new Float32Array(N * 3);
  list.forEach((s, i) => { const r = Math.hypot(s.p[0] - c0.x, s.p[1] - c0.y, s.p[2] - c0.z) / rmax;
    aP.set([s.p[0], s.p[1], s.p[2], Math.min(1, Math.max(0, 1 - r + 0.12 * (R() - 0.5)))], i * 4);       // delay: inner shards wait
    aS.set([s.size, R(), R() < 0.55 ? 1 : 0, 0], i * 4); (s.col.isColor ? s.col : new THREE.Color(s.col)).toArray(aC, i * 3); });
  const geo = instGeo(new THREE.TetrahedronGeometry(0.62));
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); geo.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4)); geo.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3));
  geo.instanceCount = N;
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${ROT} attribute vec4 aP; attribute vec4 aS; attribute vec3 aC; uniform float film, T, dur, drop, spin, kpow, tear, stretch; uniform vec3 c0;
      varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      void main(){ float age = film - T; float st0 = aP.w*tear*dur;
        float u = clamp((age - st0)/max(dur - st0, 1e-3), 0., 1.), k = pow(u, kpow);
        if (age < 0. || k > 0.995) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float sd = aS.y; vC = aC; vHeat = smoothstep(0.45, 0.98, k);
        vec3 c = c0 - vec3(0., drop, 0.);
        vec3 r0 = aP.xyz - c0; float ang = spin*k*(0.6 + 0.8*sd);
        float ca = cos(ang), sa = sin(ang); vec3 r = vec3(ca*r0.x - sa*r0.z, r0.y, sa*r0.x + ca*r0.z);
        float crack = smoothstep(0., 0.06, u)*(1. - smoothstep(0.06, 0.3, u));            // the first tear: shards spring 4% apart
        r *= (1. - k)*(1. + 0.04*crack);
        vec3 p = c + r;
        vec3 rd = length(r) > 1e-5 ? -normalize(r) : vec3(0., 1., 0.);
        float sz = aS.x*(1. - 0.75*k);
        vec3 spinA = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), 2.0 + 4.0*fract(sd*3.7))*(age*6. + k*9.) + sd*6.28;
        mat3 Rm = rot(spinA); vec3 lp = Rm*(position*sz*(aS.z > 0.5 ? vec3(1.6, 0.18, 1.2) : vec3(1.)));
        float stc = 1. + stretch*k*(1. - k)*4.;                                           // stretched along the inrush, most mid-flight
        lp += rd*dot(lp, rd)*(stc - 1.);
        vN = normalize(Rm*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT_FS} uniform vec3 hot; uniform float heatI; varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      void main(){ vec3 col = lit(vC, normalize(vN), vW); col = mix(col, hot*heatI, vHeat*vHeat); gl_FragColor = vec4(fogged(col, vW), 1.); }` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; S.scene.add(mesh);
  // the bead: a camera-facing radial glow with a hot core; minimum size in design px so it always reads
  const B = { r: 0.05, minPx: 6, I: 9, cool: 0.35, coolT: 1.6, col: 0xffe2a8, ...(o.bead ?? {}) };
  const bmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { I: { value: 0 }, col: { value: new THREE.Color(B.col) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2. - 1.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform float I; uniform vec3 col; varying vec2 vUv; void main(){ float d = length(vUv); if (d > 1.) discard;
      float core = smoothstep(0.32, 0.0, d), halo = pow(max(0., 1. - d), 3.)*0.5; gl_FragColor = vec4((col*halo + vec3(1., 0.97, 0.9)*core)*I, 1.); }` });
  const bead = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bmat); bead.frustumCulled = false; bead.renderOrder = 50; S.scene.add(bead);
  const SK = { len: 0, w: 0.04, ...(o.streak ?? {}) };
  const smat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { I: { value: 0 }, col: { value: new THREE.Color(0xffb060) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform float I; uniform vec3 col; varying vec2 vUv; void main(){ float a = (1. - abs(vUv.x*2. - 1.))*vUv.y*vUv.y; gl_FragColor = vec4(col*I*a, 1.); }` });
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), smat); streak.frustumCulled = false; streak.renderOrder = 49; streak.visible = false; S.scene.add(streak);
  let light = null; if (o.light?.I) { light = new THREE.PointLight(0xffc880, 0, o.light.dist ?? 20, 2); S.scene.add(light); }
  const sources = o.sources ?? [];
  const centreAt = (film) => c0.clone().setY(c0.y - drop(film));
  const kAt = (film) => Math.pow(Math.min(1, Math.max(0, (film - T) / dur)), o.kpow ?? 2.4);
  const beadI = (film) => { if (film < T + 0.3 * dur) return 0; const done = T + dur;
    if (film < done) return B.I * Math.pow((film - T - 0.3 * dur) / (0.7 * dur), 2);
    const a = (film - done) / B.coolT; return B.I * (B.cool + (1 - B.cool) * Math.exp(-3 * a)); };
  return { mesh, bead, streak, light, centreAt, beadI, kAt, U,
    update(film, cam) {
      U.film.value = film; U.drop.value = drop(film);
      sources.forEach((s) => { s.visible = film < T; });
      const c = centreAt(film), I = beadI(film);
      bead.visible = I > 0; streak.visible = false;
      if (I > 0 && cam) {
        const dist = cam.position.distanceTo(c), pxW = (2 * dist * Math.tan((cam.fov * Math.PI / 180) / 2)) / 960;   // metres per design px
        const r = Math.max(B.r, B.minPx * pxW) * (0.6 + 0.4 * Math.min(1, I / B.I) * 2);
        bead.position.copy(c); bead.quaternion.copy(cam.quaternion); bead.scale.setScalar(r * 3); bmat.uniforms.I.value = I;
        if (SK.len > 0 && film > T + dur) { const v = 9.81 * (film - T), len = Math.min(SK.len, v * 0.12);
          streak.visible = true; streak.position.copy(c); streak.scale.set(Math.max(SK.w, 2 * pxW), len, 1);
          const toCam = new THREE.Vector3().subVectors(cam.position, c); streak.rotation.set(0, Math.atan2(toCam.x, toCam.z), 0); smat.uniforms.I.value = I * 0.5; }
      }
      if (light) { light.position.copy(c); light.intensity = (o.light.I) * Math.min(1, I / B.I); }
    } };
}

// ---------------------------------------------------------------- bits: ballistic low-poly chips (inrush, blast, spray-like debris)
// list: [{ p: [x,y,z] (where it lets go), v: [vx,vy,vz] (m/s at release), t0 (film s), size (m), col, shape 0 tetra / 1 card /
//          2 box (tile, chair part) / 3 sphere-ish (lemon), drag (1/s, default 1.2), floor (y, default -1e4), life (s; shrinks
//          away over the last 30%, 0 = forever), spin (rad/s scale, default 1), rest (true: sits at p before t0) }]
// Closed form with linear drag k: x(a) = p + v·(1 - e^{-ka})/k, y adds -g·(a/k - (1 - e^{-ka})/k^2); clamped to the floor.
// update(film). One InstancedMesh per shape; positions computed on the GPU.
export function createBits(S, list, o = {}) {
  const L = { ...DEF_LOOK, ...(o.look ?? {}) };
  const GEOS = [new THREE.TetrahedronGeometry(0.6), new THREE.PlaneGeometry(1, 0.7), new THREE.BoxGeometry(1, 0.35, 0.7), new THREE.IcosahedronGeometry(0.5, 0)];
  const U = { film: { value: -1 }, grav: { value: o.gravity ?? 9.81 }, ...lookUniforms(L) };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${ROT} attribute vec4 aP; attribute vec4 aV; attribute vec4 aS; attribute vec4 aX; attribute vec3 aC; uniform float film, grav;
      varying vec3 vN; varying vec3 vC; varying vec3 vW;
      void main(){ float a = film - aP.w; vC = aC; float rest = aX.w;
        if (a < 0. && rest < 0.5) { gl_Position = vec4(2., 2., 2., 1.); return; }
        a = max(a, 0.); float k = max(aV.w, 1e-3), e = exp(-k*a), f = (1. - e)/k;
        vec3 p = aP.xyz + aV.xyz*f; p.y -= grav*(a/k - f/k);
        float landed = step(p.y, aX.x + aS.x*0.25); p.y = max(p.y, aX.x + aS.x*0.25);
        float life = aX.y, sh = life > 0. ? 1. - smoothstep(life*0.7, life, a) : 1.;
        if (sh <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float sd = aS.y; vec3 spin = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), 2.0 + 4.0*fract(sd*3.7))*aX.z*(f*3. + a*0.4*(1. - landed)) + sd*6.28;
        mat3 Rm = rot(spin); vec3 lp = Rm*(position*aS.x*sh); vN = normalize(Rm*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT_FS} varying vec3 vN; varying vec3 vC; varying vec3 vW; void main(){ gl_FragColor = vec4(fogged(lit(vC, normalize(vN), vW), vW), 1.); }` });
  const meshes = [0, 1, 2, 3].map((shape) => { const Ls = list.filter((b) => (b.shape ?? 0) === shape); if (!Ls.length) return null;
    const g = instGeo(GEOS[shape].clone()), n = Ls.length, aP = new Float32Array(n * 4), aV = new Float32Array(n * 4), aS = new Float32Array(n * 4), aX = new Float32Array(n * 4), aC = new Float32Array(n * 3), c = new THREE.Color();
    Ls.forEach((b, i) => { aP.set([...b.p, b.t0 ?? 0], i * 4); aV.set([...(b.v ?? [0, 0, 0]), b.drag ?? 1.2], i * 4); aS.set([b.size ?? 0.1, b.seed ?? ((i * 0.6180339) % 1), 0, 0], i * 4);
      aX.set([b.floor ?? -1e4, b.life ?? 0, b.spin ?? 1, b.rest ? 1 : 0], i * 4); c.set(b.col ?? 0xdddddd).toArray(aC, i * 3); });
    for (const [k, a, s] of [['aP', aP, 4], ['aV', aV, 4], ['aS', aS, 4], ['aX', aX, 4], ['aC', aC, 3]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, s));
    g.instanceCount = n; const m = new THREE.Mesh(g, mat); m.frustumCulled = false; S.scene.add(m); return m; }).filter(Boolean);
  return { meshes, U, update(film) { U.film.value = film; } };
}
// helper: n bits around a point that rush INTO c at t0 (velocity ~ speed toward c, landing on floor). o: { r: [r0, r1] spawn
// radius, y: [y0, y1], speed: [v0, v1], cols: [...], size: [s0, s1], shape, drag, floor, seed, rest, life }
export function inrushBits(c, t0, n, o = {}) {
  const R = rng(o.seed ?? 5), out = [], [r0, r1] = o.r ?? [0.5, 3], [y0, y1] = o.y ?? [0, 1], [v0, v1] = o.speed ?? [4, 12], [s0, s1] = o.size ?? [0.03, 0.1], cols = o.cols ?? [0xf2efe6];
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = r0 + (r1 - r0) * Math.sqrt(R()), p = [c.x + Math.cos(a) * r, (o.floor ?? c.y - 10) + y0 + (y1 - y0) * R(), c.z + Math.sin(a) * r];
    if (o.ground) p[1] = o.ground(p[0], p[2]) + y0 + (y1 - y0) * R();
    const d = new THREE.Vector3(c.x - p[0], c.y - p[1], c.z - p[2]); const dist = d.length(); d.normalize();
    const k = o.drag ?? 2.2;
    // arrive (default): the drag-limited travel v/k lands it 70-110% of the way to the point (it piles in, does not overshoot);
    // arrive: false uses the speed range as is (a blast)
    const v = o.arrive === false ? (v0 + (v1 - v0) * R()) : dist * k * (0.7 + 0.4 * R());
    out.push({ p, v: [d.x * v, d.y * v + (o.lift ?? 1.0) * R(), d.z * v], t0: t0 + (o.lag ?? 0.04) * (dist / r1) * R(), size: s0 + (s1 - s0) * R(), col: cols[Math.floor(R() * cols.length)],
      shape: o.shape ?? (R() < 0.6 ? 1 : 0), drag: k, floor: o.ground ? o.ground(p[0], p[2]) : (o.floor ?? -1e4), rest: o.rest ?? false, life: o.life ?? 0, seed: R() });
  }
  return out;
}

// ---------------------------------------------------------------- a hole: a dark disc with a hot rim that cools (the bead's exit)
// createHole(S, p (Vector3 on the surface), r (m), { tHot (film s it opens), coolT 2.5, normal (Vector3, default up), rimCol })
// -> { mesh, update(film) }. Stylised: the honest hole is microns wide; this is a readable coin-sized mark (say so on screen? no:
// the board calls it stylised).
export function createHole(S, p, r, o = {}) {
  const U = { film: { value: -1 }, tHot: { value: o.tHot ?? 0 }, coolT: { value: o.coolT ?? 2.5 }, rim: { value: new THREE.Color(o.rimCol ?? 0xffa040) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2. - 1.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform float film, tHot, coolT; uniform vec3 rim; varying vec2 vUv; void main(){ float a = film - tHot; if (a < 0.) discard; float d = length(vUv);
      float hole = 1. - smoothstep(0.30, 0.36, d), scorch = (1. - smoothstep(0.36, 1.0, d))*0.55, glow = exp(-a/coolT);
      float ring = smoothstep(0.25, 0.34, d)*(1. - smoothstep(0.34, 0.55, d));
      vec3 c = vec3(0.02)*hole + rim*ring*glow*4.; float al = max(hole, scorch) + ring*glow;
      if (al < 0.01) discard; gl_FragColor = vec4(mix(vec3(0.08, 0.06, 0.05), c, max(hole, ring*glow)), clamp(al, 0., 1.)); }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), mat); m.position.copy(p);
  const n = o.normal ?? new THREE.Vector3(0, 1, 0); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); m.position.addScaledVector(n, 0.005);
  m.renderOrder = 5; S.scene.add(m); return { mesh: m, U, update(film) { U.film.value = film; } };
}
