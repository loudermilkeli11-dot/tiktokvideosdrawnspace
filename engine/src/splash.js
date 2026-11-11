// gravity-flip kit for the bay: light under the lifted sea, the exposed seabed, rocks, coloured boats and water spray.
//   patchSlab(material, ocean.U, GROUND_GLSL, { seabed })  sun through the slab overhead (turquoise, attenuated by its thickness), the
//                                                          sky blocked by it (ambient + reflections take the ceiling's glow); seabed:
//                                                          wet ripples + puddles on the exposed bed (terrain material only)
//   createRocks(S, pts)          instanced wet rocks          createBoats(S, n)  coloured hulls/cabins/masts, place with setBoat()
//   createSpray(S, parts)        velocity-stretched spray billboards (ballistic + drag), white water, NOT smoke
import * as THREE from 'three';
import { rng } from './util.js';
import { NOISE } from './glsl.js';

const SLAB_GLSL = `
uniform float lift, level; uniform vec3 sunDir, absorb, scatThin, scatThick;
varying vec3 vSlabWp;
vec3 slabSun(vec3 wp){                       // direct sun reaching wp through the lifted sea (1 = open sky)
  if (lift < 0.05) return vec3(1.);
  vec3 sd = normalize(sunDir); float yT = level + lift; if (wp.y > yT) return vec3(1.);
  vec2 xz = wp.xz + sd.xz*((yT - 8. - wp.y)/max(sd.y, 0.08));
  float th = level - groundH(xz); if (th <= 0.) return vec3(1.);
  vec3 T = exp(-absorb*0.85*th/max(sd.y, 0.25)); T = mix(vec3(dot(T, vec3(0.3, 0.5, 0.2))), T, 0.45)*vec3(0.9, 1.0, 1.02);
  return mix(vec3(1.), T, smoothstep(0., 0.7, th)); }
float slabCover(vec3 wp){                    // how much of the sky the ceiling hides from wp
  if (lift < 0.05) return 0.;
  float yT = level + lift; if (wp.y > yT - 1.) return 0.;
  float h = yT - wp.y; float c = 0.;
  for (int i = 0; i < 5; i++){ float a = float(i)*1.2566; vec2 o = vec2(cos(a), sin(a))*h*0.9; c += step(0.3, level - groundH(wp.xz + o)); }
  return (c/5.)*0.7 + 0.3*step(0.3, level - groundH(wp.xz)); }`;
export function patchSlab(mat, U, groundGLSL, o = {}) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    for (const k of ['lift', 'level', 'sunDir', 'absorb', 'scatThin', 'scatThick']) sh.uniforms[k] = U[k];
    if (o.seabed) { sh.uniforms.time = U.time; }
    const hasG = sh.fragmentShader.includes('float groundH(');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSlabWp;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 sw = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
          sw = instanceMatrix*sw;
          #endif
          vSlabWp = (modelMatrix*sw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `${hasG ? '' : NOISE + groundGLSL}\n${SLAB_GLSL}\nfloat slabPud = 0.;\nvoid main() {`)
      .replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= slabSun(vSlabWp);'))
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float cv = slabCover(vSlabWp); vec3 glow = mix(scatThin, scatThick, 0.45);
          reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, reflectedLight.indirectDiffuse*0.55 + glow*0.22*material.diffuseColor, cv);
          vec3 gs = mix(vec3(dot(glow, vec3(0.3, 0.5, 0.2))), glow, 0.35 + 0.5*slabPud);
          reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, gs*(0.12 + 0.75*slabPud), cv)*${(o.specK ?? 1).toFixed(3)}; }`);
    if (o.rough) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', `roughnessFactor = max(roughnessFactor, ${o.rough.toFixed(3)});\n#include <lights_physical_fragment>`);
    if (o.noLamps) sh.fragmentShader = sh.fragmentShader.replace(/for \(int i=0;i<(\d+);i\+\+\)\{ vec3 d = lampP/, 'for (int i=0;i<0;i++){ vec3 d = lampP');
    if (o.seabed) {                          // the exposed bed: ripple marks, dark weed patches, glassy puddles that mirror the ceiling
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', `
        { float bd = smoothstep(-1., -6., sAt(vWp.xz)) * step(0.05, lift);
          float pn = fbm2(vWp.xz*0.045 + 3.7) + 0.35*fbm2(vWp.xz*0.31);
          slabPud = bd*smoothstep(0.9, 0.93, pn);
          roughnessFactor = mix(roughnessFactor, 0.04, slabPud);
          float wn = fbm2(vWp.xz*0.02 + 9.1);
          vec3 weed = mix(vec3(0.10,0.12,0.06), vec3(0.16,0.14,0.08), fbm2(vWp.xz*0.4));
          diffuseColor.rgb = mix(diffuseColor.rgb, weed, bd*smoothstep(0.5, 0.62, wn)*0.85*(1. - slabPud));
          diffuseColor.rgb *= mix(1., 0.8 + 0.25*fbm2(vWp.xz*0.15), bd);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*0.35, slabPud);
          float ph = vWp.x*5.3 + vWp.z*2.1 + 4.*fbm2(vWp.xz*0.11); float rp = cos(ph);
          vec3 rn = vec3(-rp*0.22, 0., -rp*0.09);
          float bn = bd*(1. - slabPud)*(1. - smoothstep(15., 70., length(vWp - cameraPosition)));
          normal = normalize(normal + (viewMatrix*vec4(rn, 0.)).xyz*bn);
          normal = normalize(mix(normal, normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz), slabPud*0.92)); }
        #include <lights_physical_fragment>`);
    }
  };
  mat.customProgramCacheKey = () => key() + '|slab' + (o.seabed ? 'B' : '') + (o.noLamps ? 'L' : '') + (o.specK ?? 1) + 'r' + (o.rough ?? 0);
  mat.needsUpdate = true;
  return mat;
}

// ---------- rocks: displaced icosahedra, rock texture, wet sheen, weed at the foot ----------
export function createRocks(S, pts, o = {}) {
  const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.22 * Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.3 - v.x) + 0.1 * Math.sin(v.x * 7.3 + v.z * 6.1 + v.y * 5.2);
    v.multiplyScalar(n); v.y = v.y < -0.2 ? -0.2 + (v.y + 0.2) * 0.3 : v.y; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: S.tex('rock_diff_1k.jpg', { repeat: true }), normalMap: S.tex('rock_nor_gl_1k.jpg', { repeat: true, srgb: false }), roughness: 0.42, color: o.color ?? 0x8a8478 });
  const m = new THREE.InstancedMesh(g, mat, pts.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  pts.forEach((r, i) => { q.setFromEuler(e.set(r.rx ?? 0, r.ry ?? 0, r.rz ?? 0)); m4.compose(new THREE.Vector3(r.x, r.y, r.z), q, new THREE.Vector3(r.s * (r.sx ?? 1), r.s * (r.sy ?? 0.6), r.s * (r.sz ?? 1))); m.setMatrixAt(i, m4); });
  m.frustumCulled = false; m.castShadow = m.receiveShadow = true; S.scene.add(m);
  return m;
}

// ---------- boats: white/red/blue/yellow hulls, cabins, masts. setBoat(i, pos, quat, L) ----------
export function createBoats(S, n, o = {}) {
  const R = rng(o.seed ?? 3);
  const hullShape = new THREE.Shape(); hullShape.moveTo(-0.5, 0.3); hullShape.lineTo(0.5, 0.3); hullShape.lineTo(0.4, -0.15); hullShape.quadraticCurveTo(0, -0.42, -0.4, -0.15); hullShape.closePath();
  const hullG = new THREE.ExtrudeGeometry(hullShape, { depth: 1, bevelEnabled: false }); hullG.translate(0, 0, -0.5);
  { const p = hullG.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const taper = z > 0.1 ? 1 - Math.pow((z - 0.1) / 0.4, 1.5) * 0.93 : 1; p.setX(i, p.getX(i) * taper); if (z > 0.1) p.setY(i, p.getY(i) + Math.pow((z - 0.1) / 0.4, 2) * 0.12); } hullG.computeVertexNormals(); }
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const cols = [0xf2f0ea, 0xc8332b, 0x2f5fa8, 0xf0f0f0, 0xe8b23a, 0x2a8a6a, 0xf4f4f4, 0x1f3354];
  const hull = new THREE.InstancedMesh(hullG, new THREE.MeshStandardMaterial({ roughness: 0.45 }), n);
  const band = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.5 }), n);
  const cabin = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.5 }), n);
  const win = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0x1a2a38, roughness: 0.15, metalness: 0.3 }), n);
  const mast = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.4, metalness: 0.5 }), n);
  const c = new THREE.Color(); const kind = [];
  for (let i = 0; i < n; i++) { const k = Math.floor(R() * cols.length); hull.setColorAt(i, c.set(cols[k])); band.setColorAt(i, c.set(k % 2 ? 0xf2f0ea : [0xc8332b, 0x2f5fa8, 0x1f3354, 0xe8b23a][Math.floor(R() * 4)])); kind.push({ sail: R() < 0.45 }); }
  const meshes = [hull, band, cabin, win, mast]; for (const m of meshes) { m.frustumCulled = false; m.castShadow = true; S.scene.add(m); }
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3(), q2 = new THREE.Quaternion();
  const loc = (p, q, x, y, z) => v.set(x, y, z).applyQuaternion(q).add(p);
  return {
    meshes, materials: meshes.map((m) => m.material),
    setBoat(i, p, q, L) {
      m4.compose(p, q, s.set(L * 0.34, L * 0.22, L)); hull.setMatrixAt(i, m4);
      m4.compose(loc(p, q, 0, L * 0.055, 0), q, s.set(L * 0.345, L * 0.02, L * 0.92)); band.setMatrixAt(i, m4);
      const cp = loc(p, q, 0, L * 0.06, -L * 0.08).clone();
      m4.compose(cp, q, s.set(L * 0.22, L * 0.13, L * 0.3)); cabin.setMatrixAt(i, m4);
      m4.compose(loc(p, q, 0, L * 0.06 + L * 0.075, -L * 0.08 + L * 0.151), q, s.set(L * 0.2, L * 0.04, L * 0.005)); win.setMatrixAt(i, m4);
      m4.compose(loc(p, q, 0, L * 0.18, -L * 0.02), q, s.set(1, kind[i].sail ? L * 0.95 : L * 0.3, 1)); mast.setMatrixAt(i, m4);
    },
    hide(i) { m4.makeScale(0, 0, 0); for (const m of meshes) m.setMatrixAt(i, m4); },
    commit() { for (const m of meshes) m.instanceMatrix.needsUpdate = true; },
  };
}

// ---------- spray: velocity-stretched billboards. parts: [{p:[x,y,z], v:[vx,vy,vz], t0, size, drag, life, kind}] ----------
// kind 0 = droplet jets (small, bright, streaked), 1 = sheets/clumps (big, ragged), 2 = fine spray veil (big, faint, streaky)
export function createSpray(S, parts, o = {}) {
  const N = parts.length, base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const aP = new Float32Array(N * 3), aV = new Float32Array(N * 3), aT = new Float32Array(N * 4);
  parts.forEach((q, i) => { aP.set(q.p, i * 3); aV.set(q.v, i * 3); aT.set([q.t0, q.size, q.drag ?? 0.3, (q.kind ?? 0) + Math.min(q.life ?? 6, 60) * 0.01], i * 4); });
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); g.setAttribute('aV', new THREE.InstancedBufferAttribute(aV, 3)); g.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 4));
  g.instanceCount = N;
  const U = { time: { value: 0 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.97, 0.9) }, sunI: { value: 1 }, amb: { value: new THREE.Color(0x6f8fb0) },
    streak: { value: 1 / 45 }, res: { value: new THREE.Vector2(S.W, S.H) }, op: { value: o.opacity ?? 1 }, hazeCol: { value: new THREE.Color(0xa6cdee) }, hazeD: { value: o.hazeD ?? 9000 }, exposure: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute vec3 aP; attribute vec3 aV; attribute vec4 aT; uniform float time, streak; uniform vec2 res;
      varying vec2 vUv; varying float vA; varying float vK; varying float vSeed; varying float vDist; varying float vLit;
      uniform vec3 sunDir;
      vec3 at(float a, float k){ vec3 vt = vec3(0., -9.81/k, 0.); return aP + (aV - vt)*(1. - exp(-k*a))/k + vt*a; }
      void main(){ float age = time - aT.x; float kind = floor(aT.w + 0.001); float life = fract(aT.w + 0.0001)*100.; vK = kind; vSeed = fract(aT.x*13.7 + aP.x*0.37 + aP.z*0.11);
        if (age <= 0. || age > life) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float k = max(aT.z, 0.02); float a0 = max(age - streak, 0.);
        vec3 p1 = at(age, k), p0 = at(a0, k); if (p1.y < -30.) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float sz = aT.y*(kind > 1.5 ? (0.6 + 0.9*min(age/0.8, 1.)) : kind > 0.5 ? (0.7 + 0.5*min(age/0.6, 1.)) : 1.);
        vec4 c1 = projectionMatrix*viewMatrix*vec4(p1, 1.), c0 = projectionMatrix*viewMatrix*vec4(p0, 1.);
        vec2 s1 = c1.xy/c1.w*res*0.5, s0 = c0.xy/c0.w*res*0.5;
        vec2 dv = s1 - s0; float len = length(dv); vec2 ax = len > 0.5 ? dv/len : vec2(0., 1.); vec2 ay = vec2(-ax.y, ax.x);
        float wpx = sz/max(c1.w, 0.1)*projectionMatrix[1][1]*res.y*0.5;
        float lpx = max(len, wpx);
        vec2 sp = mix(s0, s1, 0.5) + ax*position.y*(lpx + wpx*0.5) + ay*position.x*wpx;
        vUv = uv; vDist = c1.w;
        vA = smoothstep(0., 0.06, age)*(1. - smoothstep(life*0.6, life, age))*clamp(wpx*wpx/max(wpx*lpx, 1e-3), 0.12, 1.);
        vec3 vel = (aV - vec3(0., -9.81/k, 0.))*exp(-k*age) + vec3(0., -9.81/k, 0.);
        vLit = 0.6 + 0.4*dot(normalize(vel + vec3(0., 0.001, 0.)), normalize(sunDir));
        gl_Position = vec4(sp/(res*0.5)*c1.w, c1.z, c1.w); }`,
    fragmentShader: `${NOISE}
      uniform vec3 sunCol, amb, hazeCol; uniform float sunI, op, hazeD, exposure, time; varying vec2 vUv; varying float vA; varying float vK; varying float vSeed; varying float vDist; varying float vLit;
      void main(){ vec2 d = vUv - 0.5; float r = length(d)*2.;
        float n = fbm2(vUv*vec2(3., 6.) + vSeed*40.);
        float m;
        if (vK < 0.5) m = smoothstep(1., 0.35, r);
        else if (vK < 1.5) m = smoothstep(0.75, 0.25, r + (n - 0.5)*0.9) * (0.75 + 0.25*n);
        else m = smoothstep(1., 0.0, r + (n - 0.5)*0.7) * (0.35 + 0.65*fbm2(vec2(vUv.x*9. + vSeed*20., vUv.y*2.))) * 0.45;
        float a = m*vA*op; if (a < 0.004) discard;
        float sh = 0.82 + 0.18*(vUv.y);
        vec3 c = vec3(0.93, 0.96, 1.0)*(amb*1.1 + sunCol*sunI*0.75*vLit*sh) * (vK > 1.5 ? 0.92 : 1.);
        c = mix(c, hazeCol*1.1, 1. - exp(-vDist/hazeD));
        gl_FragColor = vec4(c*exposure, min(a, 1.)); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = o.renderOrder ?? 30; S.scene.add(mesh);
  return { mesh, U, update(t) { U.time.value = t; } };
}
