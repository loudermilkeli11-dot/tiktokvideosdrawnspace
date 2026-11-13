// no-empty-space FIX PASS (groups B/C): s06's tower failure, replacing the debris FUNNEL (Commander review item 6) and the
// lumpy dust blobs (item 7). Builder-owned; imports the shared kit, never edits it.
//   tessellate   - splits a non-indexed geometry's triangles until no edge is longer than maxE (all attributes interpolated),
//                  so the tower's coarse boxes can bend.
//   foldTower    - patches the tower's own materials: the TOWER ITSELF buckles. Top and bottom crush toward one point in the
//                  middle of the shaft (floors pancake into an accordion band at each racing front), the column kinks into a Z,
//                  the walls fold inward at the waist, a slight twist only in the last ~0.2 s, then the crushed knot folds into
//                  the point. Pure function of fold progress k (0..1).
//   crushShards  - glass, cladding and frame shards that tear off as each crush front passes them and fly STRAIGHT into the
//                  point (a short outward pop, then an accelerating inrush), stretched along the path, heating white-gold.
//   dustRing     - a THIN, crisp-edged dust ring: a low faceted wall with a jagged top racing out over the water (closed-form
//                  drag law), with a white spray skirt at its foot. No puffs, no blobs.
// Everything is a pure function of FILM time (motion-blur safe).
import { THREE } from '@engine/engine.js';
import { clamp } from '@engine/util.js';
import { LOOK } from './kit.js';

// ---------------------------------------------------------------- tessellate
export function tessellate(geo, maxE = 5) {
  const g = geo.index ? geo.toNonIndexed() : geo, names = Object.keys(g.attributes).filter((n) => n !== 'normal');
  const A = names.map((n) => g.attributes[n]), out = names.map(() => []), P = g.attributes.position;
  const vert = (i) => A.map((a) => { const r = []; for (let c = 0; c < a.itemSize; c++) r.push(a.array[i * a.itemSize + c]); return r; });
  const mid = (u, v) => u.map((x, j) => x.map((y, c) => (y + v[j][c]) / 2));
  const d2 = (u, v) => { const p = u[0], q = v[0]; return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; };
  const M2 = maxE * maxE;
  for (let t = 0; t < P.count; t += 3) {
    const st = [[vert(t), vert(t + 1), vert(t + 2)]];
    while (st.length) { const [a, b, c] = st.pop(), ab = d2(a, b), bc = d2(b, c), ca = d2(c, a), m = Math.max(ab, bc, ca);
      if (m <= M2) { for (const v of [a, b, c]) v.forEach((x, j) => out[j].push(...x)); continue; }
      if (m === ab) { const n = mid(a, b); st.push([a, n, c], [n, b, c]); }
      else if (m === bc) { const n = mid(b, c); st.push([a, b, n], [a, n, c]); }
      else { const n = mid(c, a); st.push([a, b, n], [n, b, c]); } }
  }
  const o = new THREE.BufferGeometry(); names.forEach((n, j) => o.setAttribute(n, new THREE.Float32BufferAttribute(out[j], A[j].itemSize)));
  o.computeVertexNormals(); o.computeBoundingSphere(); return o;
}

// ---------------------------------------------------------------- the fold law (GLSL + a JS twin), in TOWER-LOCAL space
// (y up from the tower's base, the shaft's axis at x = z = 0). U: uK fold progress, uYc the point's height, uH the height,
// uTw twist (rad), uKink (m).
const foldGLSL = (yc, H) => `uniform float uK, uTw, uKink; const float uYc = ${yc.toFixed(3)}, uH = ${H.toFixed(3)};
  float fh1(float x){ return fract(sin(x*78.233)*43758.5453); }
  vec3 foldP(vec3 pIn, float fK){
    float fD = pIn.y - uYc;
    float fSg = step(0., fD)*2. - 1.;
    float fL = mix(uYc, uH - uYc, step(0., fD));
    float fA = clamp(abs(fD)/fL, 0., 1.3);
    float fE = 1. - fK;
    float fOv = max(fA - fE, 0.);
    float fCr = smoothstep(0., 0.03, fOv);                                   // 1 inside the crushed band
    float fA2 = min(fA, fE) + 0.15*fOv;                                      // the crushed floors pile up at the racing front
    float fFl = floor(fOv*fL/4.2);                                           // which floor of the pile
    float fFold = sin(fOv*fL*0.75 + fSg*1.3);                                // accordion: alternate floors kick out / in
    vec2 fXZ = pIn.xz;
    fXZ *= 1. - fK*0.5*(1. - 0.55*fA2);                                      // the walls fold inward toward the waist
    float fR = length(fXZ);                                                  // the intact walls buckle: dents ripple up the shaft
    fXZ += (fR > 0.01 ? fXZ/fR : vec2(0.)) * (4.5*min(fK*2.5, 1.)*sin(pIn.y*0.09 + 1.7*fSg + 2.1*fh1(floor(atan(pIn.z, pIn.x)*0.64)))*(1. - fCr));
    fXZ *= 1. + fCr*(0.3*fFold + 0.25*(fh1(fFl + fSg*17.) - 0.5));          // the pancaked floors splay, ragged
    fXZ += fCr*vec2(fh1(fFl*3.1 + fSg) - 0.5, fh1(fFl*5.7 - fSg) - 0.5)*7.;
    float fKk = sin(3.14159*min(fK*1.25, 1.));                               // the Z-kink: top and bottom halves shear opposite ways
    fXZ += vec2(0.8, 0.6)*(uKink*fKk*sin(min(fA2, 1.)*1.5708)*fSg);
    float fTw = uTw*fSg*fA2;
    float fC = cos(fTw);
    float fS = sin(fTw);
    fXZ = vec2(fC*fXZ.x - fS*fXZ.y, fS*fXZ.x + fC*fXZ.y);
    float fF = smoothstep(0.6, 1., fK);                                      // the knot folds into the point
    float fSc = 1. - fF;
    return vec3(fXZ.x*fSc*(1. - 0.25*fF), uYc + fSg*fA2*fL*fSc, fXZ.y*fSc*(1. - 0.25*fF)); }`;
export function foldJS(p, K, U) {
  const fh1 = (x) => { const v = Math.sin(x * 78.233) * 43758.5453; return v - Math.floor(v); };
  const d = p.y - U.yc, sg = d >= 0 ? 1 : -1, L = d >= 0 ? U.H - U.yc : U.yc, a = clamp(Math.abs(d) / L, 0, 1.3), e = 1 - K, over = Math.max(a - e, 0);
  const cr = Math.min(1, over / 0.03), a2 = Math.min(a, e) + 0.15 * over, fl = Math.floor((over * L) / 4.2), fold = Math.sin(over * L * 0.75 + sg * 1.3);
  let x = p.x, z = p.z; const s1 = (1 - K * 0.5 * (1 - 0.55 * a2)) * (1 + cr * (0.3 * fold + 0.25 * (fh1(fl + sg * 17) - 0.5))); x *= s1; z *= s1;
  x += cr * (fh1(fl * 3.1 + sg) - 0.5) * 7; z += cr * (fh1(fl * 5.7 - sg) - 0.5) * 7;
  const kk = Math.sin(Math.PI * Math.min(K * 1.25, 1)), kn = U.kink * kk * Math.sin(Math.min(a2, 1) * Math.PI * 0.5) * sg; x += 0.8 * kn; z += 0.6 * kn;
  const tw = U.tw * sg * a2, c = Math.cos(tw), s = Math.sin(tw); [x, z] = [c * x - s * z, s * x + c * z];
  const f = K < 0.6 ? 0 : K > 1 ? 1 : ((K - 0.6) / 0.4) ** 2 * (3 - 2 * (K - 0.6) / 0.4), sc = 1 - f;
  return new THREE.Vector3(x * sc * (1 - 0.25 * f), U.yc + sg * a2 * L * sc, z * sc * (1 - 0.25 * f));
}

// foldTower(group, { yc, H, kink 18 }) -> { U, kAt(film), patch(mesh), update(film, kOf) }. Each patched mesh gets its own
// object->tower-local matrix (uM, uMi; set per frame for parts that move, e.g. the crane jibs).
export function foldTower(group, o) {
  const shared = { uK: { value: 0 }, uTw: { value: 0 }, uKink: { value: o.kink ?? 18 } };
  const parts = [];
  const patch = (mesh) => {
    const mat = mesh.material.clone(), prev = mesh.material.onBeforeCompile;
    const own = { uM: { value: new THREE.Matrix4() }, uMi: { value: new THREE.Matrix4() } };
    mat.onBeforeCompile = (sh, r) => { if (prev) prev.call(mat, sh, r); Object.assign(sh.uniforms, shared, own);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${foldGLSL(o.yc, o.H)}\nuniform mat4 uM, uMi;`)
        .replace('#include <project_vertex>', `if (uK > 0.) transformed = (uMi*vec4(foldP((uM*vec4(transformed, 1.)).xyz, uK), 1.)).xyz;\n#include <project_vertex>`); };
    mat.customProgramCacheKey = () => 'fixBC_fold_' + (prev ? prev.toString().length : 0) + (mat.map ? 'm' : '');
    mesh.material = mat; parts.push({ mesh, own }); };
  group.traverse((m) => { if (m.isMesh) patch(m); });
  const _m = new THREE.Matrix4(), _gi = new THREE.Matrix4();
  return { U: shared, parts, yc: o.yc, H: o.H,
    update(K, tw = 0) { shared.uK.value = K; shared.uTw.value = tw;
      group.updateMatrixWorld(true); _gi.copy(group.matrixWorld).invert();
      for (const p of parts) { _m.multiplyMatrices(_gi, p.mesh.matrixWorld); p.own.uM.value.copy(_m); p.own.uMi.value.copy(_m).invert(); p.mesh.castShadow = K <= 0; } } };
}

// ---------------------------------------------------------------- crushShards
const ROT3 = `mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
  return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }`;
const LIT = `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
  vec3 lit(vec3 c, vec3 n, vec3 W){ vec3 V = normalize(cameraPosition - W); if (dot(n, V) < 0.) n = -n;
    float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5); return c*(sunCol*dif + amb); }
  vec3 fogged(vec3 c, vec3 W){ float d = length(cameraPosition - W); return mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.)); }`;
const lookU = (L = LOOK) => ({ sunDir: { value: L.sunDir.clone() }, sunCol: { value: new THREE.Color(L.sunCol).multiplyScalar(L.sunI) },
  skyCol: { value: new THREE.Color(L.sky).multiplyScalar(0.55) }, gndCol: { value: new THREE.Color(L.gnd).multiplyScalar(0.45) },
  fogCol: { value: new THREE.Color(L.fog) }, fogN: { value: L.fogN }, fogF: { value: L.fogF } });

// list: shardsFrom output (WORLD positions); tower: the tower group (its matrix maps tower-local -> world; it must not move);
// fold: foldTower(...) (shares uK, uYc, uH, uTw, uKink); o: { rel: [kMin, kMax] release window clamp, pop (m), heatI, stretch, seed }
export function crushShards(S, list, tower, fold, o = {}) {
  tower.updateMatrixWorld(true); const inv = tower.matrixWorld.clone().invert(), N = list.length, v = new THREE.Vector3();
  const aP = new Float32Array(N * 4), aS = new Float32Array(N * 4), aC = new Float32Array(N * 3);
  let s = o.seed ?? 7; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const yc = fold.yc, H = fold.H, [r0, r1] = o.rel ?? [0.02, 0.9];
  list.forEach((sh, i) => { v.fromArray(sh.p).applyMatrix4(inv);
    const a = Math.abs(v.y - yc) / (v.y >= yc ? H - yc : yc), kr = clamp(1 - Math.min(a, 1) + 0.04 + 0.08 * R(), r0, r1);
    aP.set([v.x, v.y, v.z, kr], i * 4); aS.set([sh.size, R(), R() < 0.6 ? 1 : 0, R()], i * 4); (sh.col.isColor ? sh.col : new THREE.Color(sh.col)).toArray(aC, i * 3); });
  const base = new THREE.TetrahedronGeometry(0.62).toNonIndexed(); base.computeVertexNormals();
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal);
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4)); g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); g.instanceCount = N;
  const U = { ...fold.U, pop: { value: o.pop ?? 9 }, stretch: { value: o.stretch ?? 5 }, hot: { value: new THREE.Color(o.hot ?? 0xfff0c8) }, heatI: { value: o.heatI ?? 6 }, ...lookU() };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${ROT3} ${foldGLSL(yc, H)} attribute vec4 aP; attribute vec4 aS; attribute vec3 aC; uniform float pop, stretch;
      varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      vec3 pathAt(float tau, vec3 pr, vec3 C){ vec3 out0 = vec3(pr.x, 0., pr.z); float lo = length(out0); out0 = lo > 1e-3 ? out0/lo : vec3(1., 0., 0.);
        vec3 jit = vec3(out0.x, (aS.w - 0.5)*1.6, out0.z);
        vec3 pp = pr + jit*pop*(0.4 + aS.w)*sin(3.14159*min(tau*2.2, 1.))*(1. - tau);    // the pop: a few metres out (and up/down) as it shatters
        return mix(pp, C, pow(tau, 1.4)); }
      void main(){ float kr = aP.w; if (uK < kr || uK > 0.995) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float tau = clamp((uK - kr)/max(1. - kr, 1e-3), 0., 1.);
        vec3 C = vec3(0., uYc, 0.), pr = foldP(aP.xyz, kr);
        vec3 p = pathAt(tau, pr, C), pb = pathAt(max(tau - 0.03, 0.), pr, C);
        vec3 rd = length(p - pb) > 1e-4 ? normalize(p - pb) : normalize(C - pr + 1e-4);
        float sd = aS.y; vC = aC; vHeat = smoothstep(0.55, 1., tau);
        float sz = aS.x*(1. - 0.6*tau);
        vec3 spinA = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), 2.0 + 4.0*fract(sd*3.7))*(tau*7.) + sd*6.28;
        mat3 Rm = rot(spinA); vec3 lp = Rm*(position*sz*(aS.z > 0.5 ? vec3(1.6, 0.16, 1.2) : vec3(1.)));
        float stc = 1. + stretch*smoothstep(0.1, 0.5, tau)*(1. - tau)*2.;
        lp += rd*dot(lp, rd)*(stc - 1.);
        vN = normalize(Rm*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT} uniform vec3 hot; uniform float heatI; varying vec3 vN; varying vec3 vC; varying vec3 vW; varying float vHeat;
      void main(){ vec3 col = lit(vC, normalize(vN), vW); col = mix(col, hot*heatI, vHeat*vHeat); gl_FragColor = vec4(fogged(col, vW), 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.matrix.copy(tower.matrixWorld); mesh.matrixWorld.copy(tower.matrixWorld); mesh.matrixWorldAutoUpdate = false; S.scene.add(mesh);
  return { mesh, U };
}

// ---------------------------------------------------------------- dustRing
// o: { c (Vector3 centre; y ignored), t0 (film), v (m/s at launch), k (1/s drag), r0, H0 (m wall height at launch), Hend,
//      lean (m outward at the top per m of height), base(R) -> y of the ring's foot, col, op, segA 220, life, spray (white skirt) }
export function dustRing(S, o) {
  const segA = o.segA ?? 1400, pos = [];
  for (let i = 0; i < segA; i++) { const a0 = (i / segA) * Math.PI * 2, a1 = ((i + 1) / segA) * Math.PI * 2, j = i;   // one jagged flat facet per segment
    pos.push(a0, 0, j, a1, 0, j, a0, 1, j, a1, 0, j, a1, 1, j, a0, 1, j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mk = (col, op, hMul, rOff, lean, jag) => {
    const U = { c: { value: o.c.clone() }, R: { value: 0 }, Hh: { value: 1 }, y0: { value: 0 }, lean: { value: lean }, op: { value: 0 }, col: { value: new THREE.Color(col) }, jag: { value: jag }, ...lookU() };
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true },
      vertexShader: `uniform vec3 c; uniform float R, Hh, y0, lean, jag; varying vec3 vW; varying float vS;
        float h1(float x){ return fract(sin(x*12.9898)*43758.5453); }
        void main(){ float a = position.x, s = position.y, j = position.z;
          float am = a;                                                                  // this vertex's angle (shared by neighbours: no gaps)
          float wave = 0.5 + 0.25*sin(am*23. + 1.3) + 0.15*sin(am*61. + 0.7) + 0.1*sin(am*137. + 2.9);   // continuous crest
          float top = Hh*(1. - jag + jag*wave)*(0.94 + 0.12*h1(floor(am*2000.)*0.37));      // + a slight crisp sawtooth
          float h = s*top, r = R + lean*h + (0.4 + 0.0008*R)*(h1(floor(am*2000.)*1.7) - 0.5)*s;
          vec3 p = vec3(c.x + cos(a)*r, y0 + h - 0.3, c.z + sin(a)*r); vW = p; vS = s;
          gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
      fragmentShader: `${LIT} uniform vec3 col; uniform float op; varying vec3 vW; varying float vS;
        void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
          vec3 cc = mix(lit(col, n, vW), col*1.05, 0.3);
          cc = mix(cc, cc*1.18 + 0.05, smoothstep(0.8, 0.97, vS));                         // a lit crisp crest
          float d = length(cameraPosition - vW);
          gl_FragColor = vec4(fogged(cc, vW), op*(1. - 0.3*vS)*smoothstep(140., 420., d)); }` });
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 22; mesh.visible = false; S.scene.add(mesh);
    return { mesh, U, hMul, rOff };
  };
  const L = [mk(o.col ?? 0xd8b98c, o.op ?? 0.78, 1, 0, o.lean ?? 0.45, 0.55), mk(0xf4f2ec, 0.85, 0.28, 3, 0.9, 0.7)];
  if (o.spray === false) L.pop();
  const k = o.k ?? 0.5, life = o.life ?? 99;
  const radiusAt = (film) => { const a = film - o.t0; return a < 0 ? 0 : (o.r0 ?? 30) + (o.v / k) * (1 - Math.exp(-k * a)); };
  return { layers: L, radiusAt,
    update(film) { const a = film - o.t0, R = radiusAt(film);
      const H = (o.Hend ?? 10) + ((o.H0 ?? 40) - (o.Hend ?? 10)) * Math.exp(-0.45 * Math.max(a, 0));
      const op = clamp(a / 0.12) * (1 - clamp((a - life + 0.8) / 0.8));
      for (const l of L) { l.mesh.visible = a > 0 && op > 0.01; l.U.R.value = R + l.rOff; l.U.Hh.value = H * l.hMul; l.U.y0.value = o.base ? o.base(R) : 0; l.U.op.value = op * (l === L[0] ? (o.op ?? 0.78) : 0.85); } } };
}
