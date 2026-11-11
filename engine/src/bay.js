// "The Bay": the studio's main rich set. A crescent beach at night, promenade + town wrapping both arms of the bay,
// lamp-lit pier, anchored boats, lighthouse on the right headland. Camera home: (0, 1.7, 8) looking -Z (out to sea).
// One analytic ground function (JS + GLSL) drives terrain, ocean depth/surf, and object placement.
import * as THREE from 'three';
import { rng, hash, clamp, sstep } from './util.js';
import { waveHeight, waveSlope } from './ocean.js';
import { NOISE } from './glsl.js';

// ---- ground (keep JS and GLSL in sync) ----
// Horseshoe bay: circular lagoon (centre (0,-800), r=800) whose mouth opens to the sea toward -Z.
// sField(x,z) = signed distance-ish to the shoreline (+ = land). Camera home sits on the inner shore at z~+5.
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return b + (a - b) * h - k * h * (1 - h); };
export function sField(x, z) {
  const sc = Math.hypot(x, z + 800) - 800;
  const w = 170 + 1.3 * Math.max(0, -z - 1650);
  const sch = Math.abs(x) - w + Math.max(0, z + 1350) * 1.5;
  return smin(sc, sch, 60);
}
export function groundH(x, z) {
  const s = sField(x, z); let h;
  if (s < 0) h = Math.max(s * 0.07, -28) - 0.4 * sstep(0, -60, s);
  else h = Math.min(s, 30) * 0.06 + 2.6 * sstep(30, 33, s) + 0.02 * Math.max(s - 33, 0);
  const inl = sstep(70, 320, s);
  h += inl * (30 * (0.5 + 0.5 * Math.sin(x * 0.004 + 1.3) * Math.sin(z * 0.005 + 0.7)) + 12 * Math.sin(x * 0.011) * Math.sin(z * 0.013 + 2.0));
  h += 45 * sstep(10, 70, s) * sstep(-1300, -1600, z) * (0.85 + 0.15 * Math.sin(x * 0.03));
  return h;
}
export const GROUND_GLSL = `
float sstep_(float a, float b, float x){ float u = clamp((x-a)/(b-a), 0., 1.); return u*u*(3.-2.*u); }
float smin_(float a, float b, float k){ float h = clamp(0.5+0.5*(b-a)/k, 0., 1.); return b + (a-b)*h - k*h*(1.-h); }
float sField(vec2 p){ float sc = length(vec2(p.x, p.y+800.)) - 800.; float w = 170. + 1.3*max(0., -p.y-1650.);
  float sch = abs(p.x) - w + max(0., p.y+1350.)*1.5; return smin_(sc, sch, 60.); }
float groundH(vec2 p){ float x = p.x, z = p.y; float s = sField(p); float h;
  if (s < 0.) h = max(s*0.07, -28.) - 0.4*sstep_(0., -60., s);
  else h = min(s, 30.)*0.06 + 2.6*sstep_(30., 33., s) + 0.02*max(s-33., 0.);
  float inl = sstep_(70., 320., s);
  h += inl*(30.*(0.5+0.5*sin(x*0.004+1.3)*sin(z*0.005+0.7)) + 12.*sin(x*0.011)*sin(z*0.013+2.0));
  h += 45.*sstep_(10., 70., s)*sstep_(-1300., -1600., z)*(0.85+0.15*sin(x*0.03));
  return h; }`;
export function sGrad(x, z) { const e = 0.5; return [(sField(x + e, z) - sField(x - e, z)) / (2 * e), (sField(x, z + e) - sField(x, z - e)) / (2 * e)]; }
// project a point onto the contour sField = s0 (Newton steps)
export function onContour(x, z, s0) { for (let i = 0; i < 6; i++) { const f = sField(x, z) - s0, [gx, gz] = sGrad(x, z), g2 = gx * gx + gz * gz + 1e-9; x -= f * gx / g2; z -= f * gz / g2; } return { x, z, ok: Math.abs(sField(x, z) - s0) < 1, yaw: Math.atan2(sGrad(x, z)[0], sGrad(x, z)[1]) }; }
// Camera wedge scatter (vertical frames see only ~±17 deg): n points at distance [d0,d1] within ±deg of `heading` from `eye`
export function wedge(n, eye, heading, d0, d1, deg, keep, seed = 1) {
  const R = rng(seed), out = []; let tries = 0;
  while (out.length < n && tries++ < n * 50) { const d = d0 + (d1 - d0) * Math.sqrt(R()), a = heading + (R() * 2 - 1) * deg * Math.PI / 180;
    const x = eye[0] + Math.sin(a) * d, z = eye[1] - Math.cos(a) * d; if (!keep || keep(x, z)) out.push([x, z]); }
  return out;
}

export function createBay(S, o = {}) {
  const { scene } = S; const R = rng(o.seed ?? 7); const group = new THREE.Group(); scene.add(group);
  const U = { time: { value: 0 }, power: { value: 1 }, flicker: { value: 0 }, blackX: { value: -1e5 }, lampI: { value: o.lampI ?? 1 }, winI: { value: o.winI ?? 1 }, wet: { value: 0 } };
  // ---------- terrain ----------
  const nu = 380, nv = 300; const pos = new Float32Array((nu + 1) * (nv + 1) * 3); let k = 0;
  for (let j = 0; j <= nv; j++) { const v = j / nv; const z = v < 0.1 ? 300 - (v / 0.1) * 295 : 5 - Math.pow((v - 0.1) / 0.9, 1.7) * 3400; for (let i = 0; i <= nu; i++) { const u = i / nu * 2 - 1; const x = Math.sign(u) * Math.pow(Math.abs(u), 1.6) * 2600; pos[k++] = x; pos[k++] = groundH(x, z); pos[k++] = z; } }
  const idx = []; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const sandD = S.tex('sand_diff_1k.jpg', { repeat: true }), sandN = S.tex('sand_nor_gl_1k.jpg', { repeat: true, srgb: false });
  const rockD = S.tex('rock_diff_1k.jpg', { repeat: true }), rockN = S.tex('rock_nor_gl_1k.jpg', { repeat: true, srgb: false });
  // street lamps (positions also feed the fake light pools on the ground)
  const lamps = [];
  for (let a = 0; a < Math.PI * 2; a += 24 / 831) { const p = onContour(Math.sin(a) * 831, -800 + Math.cos(a) * 831, 31.5); if (p.ok && !lamps.some((l) => Math.hypot(l.x - p.x, l.z - p.z) < 12)) lamps.push(new THREE.Vector3(p.x, groundH(p.x, p.z) + 5.5, p.z)); }
  const pierX = o.pierX ?? -60, pierLen = o.pierLen ?? 170, pierYaw = o.pierYaw ?? 0; // yaw: 0 = straight out (-Z); + turns toward -X
  const pierBase = { x: pierX, z: -800 + Math.sqrt(800 * 800 - pierX * pierX) };
  const pierG = new THREE.Group(); pierG.position.set(pierBase.x, 0, pierBase.z + 4); pierG.rotation.y = pierYaw; pierG.updateMatrixWorld();
  const pierW = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(pierG.matrixWorld);   // pier-local -> world
  const DECK = 3.375;
  const pierLamps = [];
  for (let d = 12, k = 0; d <= pierLen; d += 18, k++) { const side = k % 2 ? 1 : -1; const w = pierW(side * 2.25, DECK + 3.4, -d); lamps.push(w); pierLamps.push({ w, side, d }); }
  const NL = 64; const nearL = lamps.slice().sort((a, b) => a.length() - b.length()).slice(0, NL);
  while (nearL.length < NL) nearL.push(new THREE.Vector3(0, -1e4, 0));
  const tMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  tMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { sandD: { value: sandD }, sandN: { value: sandN }, rockD: { value: rockD }, rockN: { value: rockN }, lampP: { value: nearL }, lampI: U.lampI, power: U.power, wet: U.wet, blackX: U.blackX });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.)).xyz; vWn = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      ${NOISE}
      uniform sampler2D sandD, sandN, rockD, rockN; uniform vec3 lampP[${NL}]; uniform float lampI, power, wet, blackX; varying vec3 vWp; varying vec3 vWn;
      ${GROUND_GLSL}
      float sAt(vec2 p){ return sField(p); }`)
      .replace('#include <map_fragment>', `
        float s = sAt(vWp.xz); float slope = 1. - vWn.y;
        vec3 sd = texture2D(sandD, vWp.xz/3.5).rgb; vec3 sd2 = texture2D(sandD, vWp.xz/31.).rgb; sd = sd*mix(vec3(1.), sd2*1.6, 0.5);
        vec3 rk = texture2D(rockD, vWp.xz/9. + vWp.y/13.).rgb;
        float wetF = smoothstep(4., -0.5, s) + wet*smoothstep(30., 0., s);
        vec3 c = sd * mix(1.0, 0.45, clamp(wetF,0.,1.));
        vec3 prom = mix(vec3(0.16,0.15,0.14), vec3(0.24,0.22,0.2), vn2(vWp.xz*0.5)); // promenade paving
        c = mix(c, prom, smoothstep(30., 31.5, s));
        vec3 town = mix(vec3(0.07,0.075,0.07), vec3(0.11,0.12,0.09), fbm2(vWp.xz*0.02));
        c = mix(c, town, smoothstep(45., 70., s));
        c = mix(c, rk*0.8, smoothstep(0.25, 0.55, slope + 0.15*fbm2(vWp.xz*0.05)));
        diffuseColor.rgb *= c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.95, 0.35, clamp(smoothstep(3., -0.5, s) + wet*smoothstep(30., 0., s), 0., 1.));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 tn = texture2D(sandN, vWp.xz/3.5).xyz*2.-1.; normal = normalize(normal + (vec3(tn.x, 0., -tn.y)*0.6) * (1.-smoothstep(30., 31.5, s)) * (1. - smoothstep(60., 250., length(vWp - cameraPosition)))); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec3 acc = vec3(0.); for (int i=0;i<${NL};i++){ vec3 d = lampP[i] - vWp; float r2 = dot(d,d); float on = power*step(blackX, lampP[i].x);
            acc += vec3(1.0,0.62,0.30) * on * (max(dot(normalize(d), vWn), 0.)*28. / (r2 + 4.)); }
          totalEmissiveRadiance += acc * lampI * diffuseColor.rgb; }`);
  };
  const terrain = new THREE.Mesh(tg, tMat); terrain.receiveShadow = true; group.add(terrain);

  // ---------- town: buildings with procedural window variety ----------
  const B = []; // {x,z,yaw,w,d,h,seed}
  for (let i = 0, n = 0; n < (o.buildings ?? 900) && i < 60000; i++) {
    const x = (R() * 2 - 1) * 1400, z = 300 - R() * 2500; const sv = sField(x, z);
    if (sv < 38 || sv > 300 || R() > Math.exp(-(sv - 38) / 110)) continue;
    const [gx, gz] = sGrad(x, z); const yaw = Math.atan2(gx, gz) + (R() - 0.5) * 0.3; const g = groundH(x, z);
    const tall = R() < 0.06 && sv < 140; const h = tall ? 35 + R() * 55 : 6 + R() * 14 + (sv < 80 ? R() * 10 : 0);
    B.push({ x, z, y: g - 1, yaw, w: 8 + R() * 16, d: 8 + R() * 12, h, seed: R() * 1000 }); n++;
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const aSize = new Float32Array(B.length * 3), aSeed = new Float32Array(B.length);
  const bMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05, color: 0xffffff });
  bMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { power: U.power, winI: U.winI, time: U.time, flicker: U.flicker, blackX: U.blackX });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aSize; attribute float aSeed; varying vec3 vL; varying vec3 vLN; varying float vSeed; varying float vWX;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position*aSize; vLN = normal; vSeed = aSeed;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWX = (modelMatrix*instanceMatrix*vec4(transformed,1.)).x;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float power, winI, time, flicker, blackX; varying vec3 vL; varying vec3 vLN; varying float vSeed; varying float vWX;
      float hh(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }`)
      .replace('#include <map_fragment>', `
        float sd = vSeed; vec3 base = mix(vec3(0.20,0.19,0.18), vec3(0.42,0.36,0.30), hh(sd)); if (hh(sd+3.) < 0.25) base = vec3(0.32,0.34,0.38);
        vec2 f = abs(vLN.x) > 0.5 ? vL.zy : vL.xy; float roof = step(0.5, vLN.y);
        float fh = 3.0 + hh(sd+1.)*0.6, cw = 2.4 + hh(sd+2.)*2.0;
        vec2 cell = floor(vec2(f.x/cw, f.y/fh)); vec2 cf = fract(vec2(f.x/cw, f.y/fh));
        float ww = 0.45 + 0.3*hh(sd+4.), wh = 0.45 + 0.25*hh(sd+5.);
        float win = step(abs(cf.x-0.5), ww*0.5) * step(abs(cf.y-0.55), wh*0.5) * (1.-roof) * step(1., f.y) ;
        float wid = hh(dot(cell, vec2(17.13, 91.7)) + sd*7.1 + vLN.x*3. + vLN.z*5.);
        float litFrac = 0.18 + 0.55*hh(sd+6.);
        float lit = step(wid, litFrac) * power * step(blackX, vWX);
        lit *= 1. - flicker*step(0.5, hh(floor(time*12.) + wid*50.));
        vec3 wc = mix(vec3(1.0,0.66,0.33), vec3(1.0,0.84,0.6), hh(wid*13.)); if (hh(wid*29.) < 0.12) wc = vec3(0.55,0.7,1.0); if (hh(wid*31.) < 0.08) wc = vec3(0.9,0.95,1.0);
        float curtain = 0.55 + 0.45*hh(wid*41.);
        float shop = step(f.y, 3.6) * step(0.2, f.y) * step(hh(sd+8.), 0.45) * (1.-roof) * power * step(blackX, vWX);
        diffuseColor.rgb *= mix(base, vec3(0.03,0.035,0.045), win) * (roof > 0.5 ? 0.6 : 1.);
        vec3 winE = wc * lit * win * curtain * 2.4 * winI + vec3(1.0,0.75,0.45) * shop * 1.4 * winI * (0.5+0.5*step(0.5, fract(cf.x*0.5+hh(sd)))) ;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += winE;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.15, win);');
  };
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, B.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  B.forEach((b, i) => { q.setFromEuler(e.set(0, b.yaw, 0)); m4.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.w, b.h, b.d)); bMesh.setMatrixAt(i, m4); aSize.set([b.w, b.h, b.d], i * 3); aSeed[i] = b.seed; });
  bGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3)); bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  bMesh.frustumCulled = false; group.add(bMesh);
  // rooftop clutter (tanks, AC boxes, antennas) for silhouette variety
  const RT = []; B.forEach((b) => { const n = Math.floor(R() * 3); for (let j = 0; j < n; j++) RT.push({ b, ox: (R() - 0.5) * b.w * 0.6, oz: (R() - 0.5) * b.d * 0.6, s: 1 + R() * 2.5, h: 1 + R() * (R() < 0.15 ? 9 : 2.5) }); });
  const rtMesh = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.9 }), RT.length);
  RT.forEach((r, i) => { const b = r.b; q.setFromEuler(e.set(0, b.yaw, 0)); const off = new THREE.Vector3(r.ox, 0, r.oz).applyQuaternion(q);
    m4.compose(new THREE.Vector3(b.x + off.x, b.y + b.h, b.z + off.z), q, new THREE.Vector3(r.h > 4 ? 0.3 : r.s, r.h, r.h > 4 ? 0.3 : r.s)); rtMesh.setMatrixAt(i, m4); });
  rtMesh.frustumCulled = false; group.add(rtMesh);
  // red aircraft-warning lights on tall buildings
  const glowPts = [];
  B.filter((b) => b.h > 35).forEach((b) => glowPts.push({ p: new THREE.Vector3(b.x, b.y + b.h + 1, b.z), c: [3, 0.15, 0.1], s: 1.2, blink: 1 }));

  // ---------- street lamps & pier ----------
  const pole = new THREE.CylinderGeometry(0.07, 0.1, 5.5, 6); pole.translate(0, -2.75, 0);
  const poles = new THREE.InstancedMesh(pole, new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6, metalness: 0.6 }), lamps.length);
  const pierSet = new Set(pierLamps.map((l) => l.w));
  let npole = 0; lamps.forEach((l) => { if (!pierSet.has(l)) { m4.makeTranslation(l.x, l.y, l.z); poles.setMatrixAt(npole++, m4); } glowPts.push({ p: l, c: [6, 3.6, 1.7], s: pierSet.has(l) ? 0.35 : 0.55, lamp: 1 }); }); poles.count = npole;
  poles.frustumCulled = false; group.add(poles);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a382a, roughness: 0.8 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
  deckMat.onBeforeCompile = (sh) => {   // planks across the deck: per-board tone, gaps, grain, wet streaks (sheen)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp; float ph(float n){ return fract(sin(n*127.1)*43758.5453); }')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float bz = vLp.z/0.19; float id = floor(bz); float f = fract(bz);
        float gap = smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f);
        float tone = 0.75 + 0.5*ph(id) ; float grain = 0.85 + 0.15*sin(vLp.x*(9.+6.*ph(id+3.)) + ph(id+7.)*20. + sin(vLp.x*1.7+id)*2.);
        vec3 c = vec3(0.16,0.12,0.09)*tone*grain; c = mix(c*0.2, c, gap); diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float bz = vLp.z/0.19; float id = floor(bz); float wet = smoothstep(0.7, 0.95, ph(id*1.7+11.)) * (0.5 + 0.5*sin(vLp.x*0.9 + id));
          roughnessFactor = mix(0.8, 0.5, wet*0.8); }`);
  };
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, pierLen, 1, 1, 1), deckMat); deck.position.set(0, DECK - 0.175, -pierLen / 2); deck.castShadow = deck.receiveShadow = true; pierG.add(deck);
  const nPost = Math.floor(pierLen / 2.2);
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), wood, nPost * 2); let pk = 0;
  for (let i = 0; i < nPost; i++) for (const sx of [-2.42, 2.42]) { m4.makeTranslation(sx, DECK + 0.55, -1 - i * 2.2); post.setMatrixAt(pk++, m4); }
  post.castShadow = true; pierG.add(post);
  for (const [y, h] of [[DECK + 1.08, 0.09], [DECK + 0.6, 0.05]]) for (const sx of [-2.42, 2.42]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, pierLen), wood); r.position.set(sx, y, -pierLen / 2); r.castShadow = true; pierG.add(r); }
  const pyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.25, 34, 8), wood, Math.ceil(pierLen / 6) * 2); let pi = 0;
  for (let d = 0; d < pierLen; d += 6) for (const sx of [-2.2, 2.2]) { m4.makeTranslation(sx, 3 - 17, -d); pyl.setMatrixAt(pi++, m4); }
  pyl.count = pi; pierG.add(pyl);
  // lamp posts on alternating sides (+ head fixture); glow sprites added with the other lamps below
  const lampPostG = new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8); lampPostG.translate(0, 1.7, 0);
  const lampPosts = new THREE.InstancedMesh(lampPostG, new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.7 }), pierLamps.length);
  pierLamps.forEach((l, i) => { m4.makeTranslation(l.side * 2.42, DECK, -l.d); lampPosts.setMatrixAt(i, m4); }); pierG.add(lampPosts);
  const pierLights = [];
  if (o.pierLights) pierLamps.slice(0, o.pierLights).forEach((l) => { const pl = new THREE.PointLight(0xffb070, o.pierLightI ?? 30, 22, 2); pl.position.copy(l.w).add(new THREE.Vector3(0, -0.3, 0)); scene.add(pl); pierLights.push(pl); });
  group.add(pierG);
  // ---------- boats (bob on the same Gerstner waves as the ocean) ----------
  const boats = []; while (boats.length < (o.boats ?? 16)) { const x = (R() * 2 - 1) * 700, z = -60 - R() * 1500; if (sField(x, z) > -25) continue; boats.push({ x, z, yaw: R() * 6.28, L: 6 + R() * 10, ph: R() * 10, seed: R() }); }
  const hullShape = new THREE.Shape(); hullShape.moveTo(-0.5, 0.25); hullShape.lineTo(0.5, 0.25); hullShape.lineTo(0.38, -0.2); hullShape.quadraticCurveTo(0, -0.45, -0.38, -0.2); hullShape.closePath();
  const hullG = new THREE.ExtrudeGeometry(hullShape, { depth: 1, bevelEnabled: false }); hullG.translate(0, 0, -0.5);
  { const p = hullG.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const taper = z > 0.15 ? 1 - Math.pow((z - 0.15) / 0.35, 1.6) * 0.92 : 1; p.setX(i, p.getX(i) * taper); } hullG.computeVertexNormals(); }
  const hull = new THREE.InstancedMesh(hullG, new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.5 }), boats.length);
  const cabin = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.6, emissive: 0xffa050, emissiveIntensity: 0 }), boats.length);
  const mast = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.05, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x888888 }), boats.length);
  for (const m of [hull, cabin, mast]) { m.frustumCulled = false; m.castShadow = true; group.add(m); }
  boats.forEach((b) => { b.glowTop = glowPts.length; glowPts.push({ p: new THREE.Vector3(), c: [4, 4, 3.6], s: 0.35 }); glowPts.push({ p: new THREE.Vector3(), c: [5, 2.8, 1.2], s: 0.5 }); });

  // ---------- lighthouse (right headland) ----------
  const lhP = o.lighthouse ?? { x: 245, z: -1690 }; const lhG = groundH(lhP.x, lhP.z);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 22, 16), new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.7 }));
  tower.position.set(lhP.x, lhG + 11, lhP.z); group.add(tower);
  const lhLamp = new THREE.Vector3(lhP.x, lhG + 23, lhP.z); glowPts.push({ p: lhLamp, c: [20, 18, 14], s: 2.5 });
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { I: { value: o.beamI ?? 0.5 } },
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vW = -mv.xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float I; varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ float along = clamp(-vP.y/1., 0., 1.); float rim = pow(abs(dot(normalize(vN), normalize(vW))), 1.5); gl_FragColor = vec4(vec3(1.0,0.95,0.8)*I*rim*pow(1.-along, 2.)*0.25, 1.); }' });
  const beamG = new THREE.ConeGeometry(1, 1, 24, 1, true); beamG.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(beamG, beamMat); beam.scale.set(70, 1400, 70); beam.position.copy(lhLamp); group.add(beam);

  // ---------- glow sprites (lamp heads, boat lights, warning lights) ----------
  const gG = new THREE.PlaneGeometry(1, 1);
  const gMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { power: U.power, time: U.time, blackX: U.blackX, lampI: U.lampI },
    vertexShader: `attribute vec3 aCol; attribute float aS; attribute float aBlink; attribute float aLamp; uniform float power, time, blackX, lampI; varying vec2 vUv; varying vec3 vC;
      void main(){ vUv = uv; vec3 c = (instanceMatrix*vec4(0.,0.,0.,1.)).xyz; vec4 mv = viewMatrix*vec4(c,1.);
        float dist = -mv.z; float px = max(aS, dist*0.0016); // never smaller than ~1.5 px at 1080 wide
        mv.xy += position.xy*px*4.;
        float on = aLamp > 0.5 ? power*step(blackX, c.x)*lampI : 1.; if (aBlink > 0.5) on *= step(0.5, fract(time*0.5 + c.x*0.01));
        vC = aCol*on*(aS/px)*(aS/px); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: 'varying vec2 vUv; varying vec3 vC; void main(){ float r = length(vUv-0.5)*2.; float g = (exp(-r*r*14.) + 0.08*exp(-r*r*3.)) * smoothstep(1.0, 0.6, r); gl_FragColor = vec4(vC*g, 1.); }' });
  const glow = new THREE.InstancedMesh(gG, gMat, glowPts.length);
  const aCol = new Float32Array(glowPts.length * 3), aS = new Float32Array(glowPts.length), aBl = new Float32Array(glowPts.length), aLp = new Float32Array(glowPts.length);
  glowPts.forEach((g, i) => { aCol.set(g.c, i * 3); aS[i] = g.s; aBl[i] = g.blink || 0; aLp[i] = g.lamp || 0; m4.makeTranslation(g.p.x, g.p.y, g.p.z); glow.setMatrixAt(i, m4); });
  gG.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3)); gG.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1)); gG.setAttribute('aBlink', new THREE.InstancedBufferAttribute(aBl, 1)); gG.setAttribute('aLamp', new THREE.InstancedBufferAttribute(aLp, 1));
  glow.frustumCulled = false; glow.renderOrder = 50; group.add(glow);

  // ---------- lights ----------
  const moonLight = new THREE.DirectionalLight(0xbfd0ff, o.moonLightI ?? 0.35); moonLight.castShadow = !!o.shadows;
  moonLight.shadow.mapSize.set(2048, 2048); Object.assign(moonLight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 600 }); moonLight.shadow.bias = -0.0005; moonLight.shadow.normalBias = 0.02;
  scene.add(moonLight, moonLight.target);
  const hemi = new THREE.HemisphereLight(0x22334f, 0x0c0a08, o.hemiI ?? 0.25); scene.add(hemi);

  const api = {
    group, U, lamps, boats, pier: { group: pierG, toWorld: pierW, deckY: DECK, len: pierLen, base: pierBase, yaw: pierYaw, lamps: pierLamps, lights: pierLights }, terrain, buildings: bMesh, glow, moonLight, hemi, beam, ground: groundH,
    update(S, t, st = {}) {
      U.time.value = t; const amp = st.waveAmp ?? 0.6, level = st.level ?? 0;
      // moonlight follows the moon direction; shadow box centred on the camera's focus area
      if (st.moonDir) { const f = st.shadowCenter || new THREE.Vector3(0, 0, -5); moonLight.position.copy(f).addScaledVector(st.moonDir, 300); moonLight.target.position.copy(f); }
      if (st.moonLightI !== undefined) moonLight.intensity = st.moonLightI;
      beam.rotation.set(0, 0, 0); beam.rotateY(t * 0.9); beam.rotateZ(Math.PI / 2 - 0.03);
      boats.forEach((b, i) => {
        const y = waveHeight(b.x, b.z, t + b.ph * 0, amp, level); const [gx, gz] = waveSlope(b.x, b.z, t, amp);
        q.setFromEuler(e.set(Math.atan(gz) * 0.8, b.yaw, -Math.atan(gx) * 0.8, 'YXZ'));
        m4.compose(new THREE.Vector3(b.x, y + 0.05, b.z), q, new THREE.Vector3(b.L * 0.38, b.L * 0.18, b.L)); hull.setMatrixAt(i, m4);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q), fw = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        const cb = new THREE.Vector3(b.x, y + b.L * 0.04, b.z).addScaledVector(fw, -b.L * 0.1);
        m4.compose(cb, q, new THREE.Vector3(b.L * 0.25, b.L * 0.16, b.L * 0.3)); cabin.setMatrixAt(i, m4);
        m4.compose(cb, q, new THREE.Vector3(1, b.L * 0.75, 1)); mast.setMatrixAt(i, m4);
        const top = cb.clone().addScaledVector(up, b.L * 0.75); m4.makeTranslation(top.x, top.y, top.z); glow.setMatrixAt(b.glowTop, m4);
        const cw = cb.clone().addScaledVector(up, b.L * 0.1).addScaledVector(fw, b.L * 0.16); m4.makeTranslation(cw.x, cw.y, cw.z); glow.setMatrixAt(b.glowTop + 1, m4);
      });
      hull.instanceMatrix.needsUpdate = cabin.instanceMatrix.needsUpdate = mast.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = true;
    },
  };
  return api;
}
