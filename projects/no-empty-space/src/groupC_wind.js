// no-empty-space group C: WIND BITS (the s08 gale). Same look as the kit's bits (squeeze.js createBits: flat low-poly chips
// lit by the kit's golden light, fogged), but each bit is CARRIED by a wind: dv/dt = k (w - v) - g ŷ, closed form in film
// time (deterministic, safe for motion-blur sub-samples):
//   v_inf = w - (g/k) ŷ ;  x(a) = p + v_inf a + (v0 - v_inf)(1 - e^{-k a}) / k   (a = film - t0), clamped to the floor.
// list: [{ p: [x,y,z], v: [vx,vy,vz] (release velocity), w: [wx,wy,wz] (wind m/s), t0 (film s), size (m), col, shape 0 tetra /
//          1 card / 2 box / 3 lumpy sphere, drag k (1/s), floor (y), life (s, shrinks away over the last 30%, 0 = forever),
//          spin (rad/s scale), rest (true: sits at p before t0), seed }]
import { THREE } from '@engine/engine.js';

const ROT = `mat3 rot(vec3 a){ float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
  return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }`;
const LIT_FS = `uniform vec3 sunDir, sunCol, skyCol, gndCol, fogCol; uniform float fogN, fogF;
  vec3 lit(vec3 c, vec3 n, vec3 W){ vec3 V = normalize(cameraPosition - W); if (dot(n, V) < 0.) n = -n;
    float dif = max(dot(n, sunDir), 0.); vec3 amb = mix(gndCol, skyCol, n.y*0.5 + 0.5); return c*(sunCol*dif + amb); }
  vec3 fogged(vec3 c, vec3 W){ float d = length(cameraPosition - W); return mix(c, fogCol, clamp((d - fogN)/(fogF - fogN), 0., 1.)); }`;
function instGeo(base) { const b = base.index ? base.toNonIndexed() : base; b.computeVertexNormals(); const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', b.attributes.position); g.setAttribute('normal', b.attributes.normal); return g; }

export function windBits(S, list, L) {
  const U = { film: { value: -1 }, grav: { value: 9.81 }, sunDir: { value: L.sunDir.clone() }, sunCol: { value: new THREE.Color(L.sunCol).multiplyScalar(L.sunI) },
    skyCol: { value: new THREE.Color(L.sky).multiplyScalar(0.55) }, gndCol: { value: new THREE.Color(L.gnd).multiplyScalar(0.45) },
    fogCol: { value: new THREE.Color(L.fog) }, fogN: { value: L.fogN }, fogF: { value: L.fogF } };
  const GEOS = [new THREE.TetrahedronGeometry(0.6), new THREE.PlaneGeometry(1, 0.7), new THREE.BoxGeometry(1, 0.35, 0.7), new THREE.IcosahedronGeometry(0.5, 0)];
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${ROT} attribute vec4 aP; attribute vec4 aV; attribute vec4 aW; attribute vec4 aS; attribute vec4 aX; attribute vec3 aC; uniform float film, grav;
      varying vec3 vN; varying vec3 vC; varying vec3 vW;
      void main(){ float a = film - aP.w; vC = aC; float rest = aX.w;
        if (a < 0. && rest < 0.5) { gl_Position = vec4(2., 2., 2., 1.); return; }
        a = max(a, 0.); float k = max(aV.w, 1e-3), e = exp(-k*a), f = (1. - e)/k;
        vec3 vinf = aW.xyz - vec3(0., grav/k, 0.);
        vec3 p = aP.xyz + vinf*a + (aV.xyz - vinf)*f;
        float fl = aX.x + aS.x*0.2; float landed = step(p.y, fl); p.y = max(p.y, fl);
        float life = aX.y, sh = life > 0. ? 1. - smoothstep(life*0.7, life, a) : 1.;
        if (sh <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float sd = aS.y; vec3 spin = vec3(1.3 + 2.1*sd, 0.7 + 3.3*fract(sd*7.3), 2.0 + 4.0*fract(sd*3.7))*aX.z*(a*(1.5 - 0.9*landed) + f*2.) + sd*6.28;
        mat3 Rm = rot(spin); vec3 lp = Rm*(position*aS.x*sh); vN = normalize(Rm*normal);
        vec4 w = modelMatrix*vec4(p + lp, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${LIT_FS} varying vec3 vN; varying vec3 vC; varying vec3 vW; void main(){ gl_FragColor = vec4(fogged(lit(vC, normalize(vN), vW), vW), 1.); }` });
  const meshes = [0, 1, 2, 3].map((shape) => { const Ls = list.filter((b) => (b.shape ?? 0) === shape); if (!Ls.length) return null;
    const g = instGeo(GEOS[shape].clone()), n = Ls.length, A = { aP: new Float32Array(n * 4), aV: new Float32Array(n * 4), aW: new Float32Array(n * 4), aS: new Float32Array(n * 4), aX: new Float32Array(n * 4), aC: new Float32Array(n * 3) }, c = new THREE.Color();
    Ls.forEach((b, i) => { A.aP.set([...b.p, b.t0 ?? 0], i * 4); A.aV.set([...(b.v ?? [0, 0, 0]), b.drag ?? 1.5], i * 4); A.aW.set([...(b.w ?? [0, 0, 0]), 0], i * 4);
      A.aS.set([b.size ?? 0.1, b.seed ?? ((i * 0.6180339) % 1), 0, 0], i * 4); A.aX.set([b.floor ?? -1e4, b.life ?? 0, b.spin ?? 1, b.rest ? 1 : 0], i * 4); c.set(b.col ?? 0xdddddd).toArray(A.aC, i * 3); });
    for (const [k, s] of [['aP', 4], ['aV', 4], ['aW', 4], ['aS', 4], ['aX', 4], ['aC', 3]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(A[k], s));
    g.instanceCount = n; const m = new THREE.Mesh(g, mat); m.frustumCulled = false; S.scene.add(m); return m; }).filter(Boolean);
  return { meshes, U, update(film) { U.film.value = film; } };
}

// the same closed form in JS (for meshes moved per frame: the scoop, parasols, kites). b: { p, v, w, t0, drag, floor } -> Vector3
export function windPos(b, film, out = new THREE.Vector3()) {
  const a = Math.max(0, film - b.t0), k = b.drag ?? 1.5, f = (1 - Math.exp(-k * a)) / k, g = 9.81;
  const vi = [b.w[0], b.w[1] - g / k, b.w[2]], v0 = b.v ?? [0, 0, 0];
  out.set(b.p[0] + vi[0] * a + (v0[0] - vi[0]) * f, b.p[1] + vi[1] * a + (v0[1] - vi[1]) * f, b.p[2] + vi[2] * a + (v0[2] - vi[2]) * f);
  if (b.floor !== undefined) out.y = Math.max(out.y, b.floor);
  return out;
}
