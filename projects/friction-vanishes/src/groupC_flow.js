// friction-vanishes GROUP C helper (s06_hills, s07_after). N3: the ground flows (grain friction gone), then the aftermath.
// Built on the kit's bayWorld (daylight bay, API R2). Project-side patches only (onBeforeCompile / shader strings), no engine edits.
//   * flow field (GLSL + JS twins): every land point slides along its fall line by  fD * mob(p)  metres, fD = flowX(tau)
//     (story.js, staged 9 m/s top speed). mob = 0.3 on the flats .. 1 on steep faces (a = g sin(theta): steeper = faster),
//     so the surface shears and the hill faces outrun the flats.
//   * terrain: vertex morph h'(p) = groundH(q), q = the source point that has slid to p (2 fixed-point steps of q = p - D(q));
//     the fragment colours the SOURCE point (the ground's texture is carried downhill = the flow is visible as motion, not a
//     scrolling texture), plus a wet brown mud skin with streaks along the flow wherever the ground moves (glossy, never glowing).
//   * ocean: brown sediment plume growing from the shore (s06) and the lagoon filled with glossy wet mud (s07).
//   * trees and houses (bay buildings + their rooftop clutter + lamp poles) ride the same field (Lagrangian, intact).
import { THREE } from '@engine/engine.js';
import { GROUND_GLSL, groundH, sField } from '@engine/bay.js';
import { rng, clamp } from '@engine/util.js';
import { bayWorld, SUN, COL } from './kit.js';

const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const hexV = (h) => { const c = new THREE.Color(h); return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`; };   // linear

// ------------------------------------------------------------------ the flow field (keep JS and GLSL identical)
const E = 2.0;
function fieldAt(x, z) {               // -> [mob, dirX, dirZ]
  const s = sField(x, z);
  const gx = (groundH(x + E, z) - groundH(x - E, z)) / (2 * E), gz = (groundH(x, z + E) - groundH(x, z - E)) / (2 * E);
  const sx = (sField(x + E, z) - sField(x - E, z)) / (2 * E), sz = (sField(x, z + E) - sField(x, z - E)) / (2 * E);
  const sl = Math.hypot(gx, gz); let ax = -sx, az = -sz; const al = Math.hypot(ax, az) + 1e-5; ax /= al; az /= al;   // toward the water
  let dx = sl > 1e-4 ? -gx / sl : ax, dz = sl > 1e-4 ? -gz / sl : az;
  const w = ss(0.03, 0.12, sl); dx = ax + (dx - ax) * w; dz = az + (dz - az) * w; const dl = Math.hypot(dx, dz) + 1e-5;
  const land = ss(-45, -5, s);
  const lobe = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(x * 0.013 + 1.7) * Math.sin(z * 0.011 + 0.4));
  return [(0.3 + 0.7 * ss(0.03, 0.45, sl)) * land * lobe, dx / dl, dz / dl];
}
// the source point that has slid to (x, z) after fD metres of flow
export function srcOf(x, z, fD) {
  let qx = x, qz = z;
  for (let i = 0; i < 2; i++) { const [m, dx, dz] = fieldAt(qx, qz); qx = x - dx * m * fD; qz = z - dz * m * fD; }
  return [qx, qz];
}
export const hFlow = (x, z, fD) => { const [qx, qz] = srcOf(x, z, fD); return groundH(qx, qz); };
// a thing standing at (x0, z0) when the flow starts, carried by it (forward, Lagrangian)
export function ride(x0, z0, fD) { const [m, dx, dz] = fieldAt(x0, z0); const x = x0 + dx * m * fD, z = z0 + dz * m * fD; return { x, z, y: hFlow(x, z, fD), m, dx, dz }; }

const FLOW_GLSL = `
uniform float fD;
float fvSS(float a, float b, float x){ float u = clamp((x-a)/(b-a), 0., 1.); return u*u*(3.-2.*u); }
vec3 fvField(vec2 p){
  float s = sField(p); float e = ${E.toFixed(1)};
  vec2 g = vec2(groundH(p+vec2(e,0.)) - groundH(p-vec2(e,0.)), groundH(p+vec2(0.,e)) - groundH(p-vec2(0.,e)))/(2.*e);
  vec2 sg = vec2(sField(p+vec2(e,0.)) - sField(p-vec2(e,0.)), sField(p+vec2(0.,e)) - sField(p-vec2(0.,e)))/(2.*e);
  float sl = length(g); vec2 a = -sg/(length(sg)+1e-5);
  vec2 d = sl > 1e-4 ? -g/sl : a; d = a + (d - a)*fvSS(0.03, 0.12, sl); d /= length(d)+1e-5;
  float land = fvSS(-45., -5., s);
  float lobe = 0.85 + 0.3*(0.5 + 0.5*sin(p.x*0.013 + 1.7)*sin(p.y*0.011 + 0.4));
  return vec3((0.3 + 0.7*fvSS(0.03, 0.45, sl))*land*lobe, d); }
vec2 fvSrc(vec2 p, out float mob, out vec2 dir){
  vec2 q = p; vec3 f = vec3(0., 0., -1.);
  for (int i = 0; i < 2; i++){ f = fvField(q); q = p - f.yz*f.x*fD; }
  f = fvField(q); mob = f.x; dir = f.yz; return q; }`;

// ------------------------------------------------------------------ the world
// o: { mode: 'flow' (s06) | 'after' (s07), waveAmp, trees: { eye:[x,z], heading (rad, 0 = -Z, + = +X), d0, d1, deg, n } }
export function flowWorld(S, o = {}) {
  const { scene } = S;
  const W = bayWorld(S, { waveAmp: o.waveAmp ?? 0.35, reflScale: 0.25 });
  const { bay, ocean } = W;
  bay.glow.visible = false;                               // daylight: no lamp/lighthouse/warning-light sprites (Pitfall 9)
  bay.beam.visible = false;
  const FU = { fD: { value: 0 }, fRock: { value: o.mode === 'after' ? 1 : 0 },
    fDir0: { value: new THREE.Vector2(...(o.flowDir ?? [0.42, 0.91])).normalize() }, fOrg: { value: new THREE.Vector2(...(o.flowOrg ?? [-340, -1530])) } };

  // ---- terrain: morph + advected colour + mud skin (+ the stripped end state)
  const tMat = bay.terrain.material, ob = tMat.onBeforeCompile;
  tMat.onBeforeCompile = (sh, r) => {
    ob(sh, r); Object.assign(sh.uniforms, FU);
    const rep = (src, a, b) => { if (!src.includes(a)) throw new Error('groupC terrain patch missed: ' + a); return src.replace(a, b); };
    let vs = sh.vertexShader;
    vs = rep(vs, '#include <common>', `#include <common>\n${GROUND_GLSL}\n${FLOW_GLSL}\nvarying vec2 vSrc; varying float vMove; varying vec2 vFdir;`);
    vs = rep(vs, '#include <beginnormal_vertex>', `
      float fvMob; vec2 fvDir; vec2 fvQ = fvSrc(position.xz, fvMob, fvDir); float fvH = groundH(fvQ);
      vec3 objectNormal = normal;
      if (fD > 0.01) { float m_; vec2 d_; float hx = groundH(fvSrc(position.xz + vec2(3., 0.), m_, d_)), hz = groundH(fvSrc(position.xz + vec2(0., 3.), m_, d_));
        objectNormal = normalize(vec3(-(hx - fvH)/3., 1., -(hz - fvH)/3.)); }
      vSrc = fvQ; vMove = fvMob*fvSS(0.3, 4., fD); vFdir = fvDir;`);
    vs = rep(vs, '#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y = fvH;');
    sh.vertexShader = vs;
    let fs = sh.fragmentShader;
    fs = fs.split('vWp.xz').join('wq.xz');                                             // colour the source point (advection)
    fs = rep(fs, 'float s = sAt(wq.xz);', 'vec3 wq = vec3(vSrc.x, vWp.y, vSrc.y); float s = sAt(wq.xz); float fvWet = 0.;');
    fs = rep(fs, '#include <common>', '#include <common>\nvarying vec2 vSrc; varying float vMove; varying vec2 vFdir; uniform float fD, fRock; uniform vec2 fDir0, fOrg;');
    fs = rep(fs, 'diffuseColor.rgb *= c;', `diffuseColor.rgb *= c;
      { vec3 base = diffuseColor.rgb;
        float steep = smoothstep(0.07, 0.17, slope + 0.05*fbm2(wq.xz*0.05));          // slope = 1 - n.y (0.2 = 37 deg)
        // daylight ground: grey town paving near the shore, green hills inland (the bay's night palette is too dark at noon)
        vec3 townG = mix(vec3(0.21,0.205,0.19), vec3(0.32,0.30,0.27), vn2(wq.xz*0.3)) * (0.85 + 0.3*fbm2(wq.xz*0.04));
        vec3 grass = mix(vec3(0.10,0.17,0.045), vec3(0.24,0.29,0.10), fbm2(wq.xz*0.022)) * (0.75 + 0.5*vn2(wq.xz*0.3));
        float townF = smoothstep(42., 60., s) * (1. - smoothstep(150., 260., s + 60.*fbm2(wq.xz*0.01)));
        float grassF = smoothstep(55., 110., s) * (1. - 0.75*townF);
        base = mix(base, townG, townF*(1. - steep)*0.9);
        base = mix(base, grass, grassF*(1. - steep));
        // steep faces at rest: scrub and soil over the rock (s07 shows the rock once the skin has gone)
        vec3 scrub = mix(vec3(0.06,0.11,0.025), vec3(0.15,0.18,0.06), fbm2(wq.xz*0.06)) * (0.7 + 0.6*vn2(wq.xz*0.5));
        base = mix(base, scrub, steep*smoothstep(12., 25., s)*(0.85 + 0.15*smoothstep(0.4, 0.6, fbm2(wq.xz*0.03))));
        // the flowing skin: the turf tears into rafts that ride on wet brown soil streaming along the fall line
        float mv = clamp(vMove, 0., 1.), prog = clamp(fD/16., 0., 1.);
        vec2 fd = fDir0; vec2 wl = wq.xz - fOrg; vec2 fp = vec2(dot(wl, vec2(-fd.y, fd.x)), dot(wl, fd));   // a fixed streak frame (a per-pixel one bands like wood grain)
        float rn = vn2(wq.xz*0.09) * 0.65 + vn2(wq.xz*0.31) * 0.35;                       // raft cells (in the ground's own frame)
        float gap = mv * smoothstep(0.66 - 0.42*prog, 0.74 - 0.40*prog, 1. - rn);          // soil showing between the rafts
        float l1 = 1. - abs(2.*vn2(vec2(fp.x*0.45, fp.y*0.018)) - 1.), l2 = 1. - abs(2.*vn2(vec2(fp.x*1.6, fp.y*0.05) + 9.) - 1.);
        float bands = fbm2(vec2(fp.x*0.05, fp.y*0.006));
        vec3 mudC = mix(${hexV(COL.mudWet)}*0.6, ${hexV(COL.mud)}*1.35, clamp(bands*0.9 + 0.25*pow(l1, 6.) - 0.1, 0., 1.));
        mudC *= 0.78 + 0.22*pow(l2, 3.) + 0.15*pow(l1, 10.);
        float mudF = clamp(max(gap, mv*prog*0.3), 0., 1.);
        base = mix(base*mix(1., 0.62, mv*prog), mudC, mudF);                                // rafts darken (wet, torn turf)
        fvWet = mudF;
        // s07 end state: hills stripped to grey rock, the old beach under wet mud, town paving kept between the houses
        if (fRock > 0.) {
          vec3 rockC = mix(${hexV(COL.rock)}*0.75, ${hexV(COL.rock)}*1.15, fbm2(wq.xz*0.035)) * (0.7 + 0.6*rk.r);
          float strip = smoothstep(36., 48., s) * (1. - townF*(1. - steep)*0.3);
          float beachMud = 1. - smoothstep(26., 40., s);
          base = mix(base, rockC, strip*fRock);
          vec3 mud2 = mix(${hexV(COL.mudWet)}*0.8, ${hexV(COL.mud)}*1.1, fbm2(wq.xz*0.05));
          base = mix(base, mud2, beachMud*fRock);
          fvWet = max(fvWet, beachMud*fRock); }
        diffuseColor.rgb = base; }`);
    fs = rep(fs, '#include <normal_fragment_maps>', 'roughnessFactor = mix(roughnessFactor, 0.5, clamp(fvWet*0.9, 0., 1.));\n#include <normal_fragment_maps>');
    sh.fragmentShader = fs;
  };
  tMat.customProgramCacheKey = () => 'fv-groupC-terrain'; tMat.needsUpdate = true;

  // ---- ocean: sediment plume (s06) + the lagoon filled with mud (s07)
  const OM = ocean.mesh.material, OU = OM.uniforms;
  Object.assign(OU, { sedR: { value: 0 }, sedA: { value: 0 }, mudA: { value: o.mode === 'after' ? 1 : 0 } });
  const MUD_GLSL = `uniform float mudA;
    float fvMud(vec2 p){ float s = sField(p); float ez = -1440. + 45.*sin(p.x*0.011 + 0.7) + 25.*sin(p.x*0.031 + 2.1);
      return smoothstep(-1., 4., -s + 6.) * smoothstep(ez - 50., ez + 50., p.y); }`;
  const orep = (src, a, b) => { if (!src.includes(a)) throw new Error('groupC ocean patch missed: ' + a); return src.replace(a, b); };
  OM.vertexShader = orep(OM.vertexShader, 'uniform float time, amp, level; uniform mat4 texM, reflInv;', 'uniform float time, amp, level; uniform mat4 texM, reflInv;\n' + MUD_GLSL);
  OM.vertexShader = orep(OM.vertexShader, 'p.y += level; vWP = p;', `{ float mm = fvMud(xz)*mudA; p = mix(p, vec3(xz.x, 0., xz.y), mm); n = normalize(mix(n, vec3(0., 1., 0.), mm*0.9)); p.y += 0.35*mm; }
        p.y += level; vWP = p;`);
  OM.fragmentShader = orep(OM.fragmentShader, 'uniform sampler2D nTex, refl;', 'uniform float sedR, sedA;\n' + MUD_GLSL + '\nuniform sampler2D nTex, refl;');
  OM.fragmentShader = orep(OM.fragmentShader, 'float a = smoothstep(-0.05, 0.25, vDepth);', `float a = smoothstep(-0.05, 0.25, vDepth);
        if (sedA > 0.) { float s = sField(vFlat); float n1 = fbm2(vFlat*0.012 + vec2(time*0.004, 0.)), n2 = fbm2(vFlat*0.05 - vec2(0., time*0.02));
          float reach = sedR*(0.45 + 1.1*n1);
          float sed = smoothstep(-reach, -reach*0.25, s) * (0.72 + 0.28*n2) * sedA;
          vec3 sc = mix(${hexV(COL.sediment)}, ${hexV(COL.mud)}, 0.5 + 0.5*(n2 - 0.5)) * (amb*1.3 + sunCol*sunI*0.42*max(sunDir.y, 0.));
          col = mix(col, sc*1.15 + R*F*0.12, clamp(sed, 0., 0.95)); a = max(a, clamp(sed*1.5, 0., 1.));
          float churnB = smoothstep(-16., -2., s) * smoothstep(0.42, 0.68, fbm2(vFlat*vec2(0.22, 0.22) + vec2(time*0.3, -time*1.1))) * sedA;   // the toe pouring in
          col = mix(col, sc*1.7, churnB*0.55); }
        if (mudA > 0.) { float mm = fvMud(vFlat)*mudA;
          if (mm > 0.001) {
            float n1 = fbm2(vFlat*0.011), n2 = fbm2(vFlat*0.07 + 3.), n3 = vn2(vFlat*0.45);
            vec2 sw = vec2(fbm2(vFlat*0.004 + 1.), fbm2(vFlat*0.004 + 5.));
            float swirl = fbm2(vFlat*vec2(0.03, 0.012) + sw*6.);
            vec3 mc = mix(${hexV(COL.mudWet)}, ${hexV(COL.mud)}*1.35, clamp(n1*0.6 + swirl*0.6 - 0.1, 0., 1.)) * (0.82 + 0.3*n2) * (0.92 + 0.16*n3) * 2.3;
            float sN = sField(vFlat);                                                         // lobes pushed in from every shore: ridges parallel to it
            float rg = sin(-sN*0.075 + n1*7. + swirl*3.); rg = smoothstep(0.55, 1.0, rg) * smoothstep(-520., -25., sN);
            mc *= 1. + 0.32*rg - 0.12*smoothstep(-1., -0.6, -rg);
            float arc = atan(vFlat.x, vFlat.y + 800.)*800.;                                  // along the old shore (m)
            float rs = fbm2(vec2(arc*0.045, sN*0.005)), rs2 = vn2(vec2(arc*0.16, sN*0.02));   // streaks radiating in from the shores
            float nearShore = smoothstep(-330., -90., sN);                                     // (they would converge at the centre)
            mc *= mix(0.85 + 0.3*fbm2(vFlat*0.03 + 11.), 0.72 + 0.5*rs + 0.18*rs2, nearShore);
            float deb = step(0.992, h12(floor(vFlat/2.6))) * smoothstep(-600., -20., sN);       // uprooted trees, timber, rubble
            mc = mix(mc, vec3(0.03, 0.035, 0.02), deb*0.8);
            float wetP = smoothstep(0.6, 0.72, fbm2(vFlat*0.018 + 7.));
            vec3 lit = mc*(amb*1.1 + sunCol*sunI*0.62*max(sunDir.y, 0.));
            float Fm = 0.03 + 0.97*pow(1. - cosT, 5.);
            lit = mix(lit, R*0.85, Fm*mix(0.12, 0.85, wetP));
            lit += sunCol*ggx(n, V, normalize(sunDir), mix(0.4, 0.1, wetP))*sunI*0.2;
            col = mix(col, lit, mm); a = mix(a, 1., mm); } }`);
  OM.needsUpdate = true;

  // ---- trees (none in bay.js): trunk + canopy instances on the hills in view
  const T = o.trees ?? null, trees = [];
  let trunkM = null, crownM = null;
  if (T) {
    const R = rng(T.seed ?? 41);
    for (let i = 0; i < 40000 && trees.length < T.n; i++) {
      const d = T.d0 + (T.d1 - T.d0) * Math.sqrt(R()), a = T.heading + (R() * 2 - 1) * T.deg * Math.PI / 180;
      const x = T.eye[0] + Math.sin(a) * d, z = T.eye[1] - Math.cos(a) * d, s = sField(x, z);
      if (s < 14 || s > 900) continue;
      const g = Math.hypot(groundH(x + 2, z) - groundH(x - 2, z), groundH(x, z + 2) - groundH(x, z - 2)) / 4;
      if (g > 1.3 || (s > 45 && s < 150 && R() < 0.55)) continue;                   // thinner in town
      trees.push({ x, z, s: 0.7 + R() * 0.7, seed: R(), yaw: R() * 6.28, ph: R() * 6.28 });
    }
    const tg = new THREE.CylinderGeometry(0.18, 0.3, 1, 5); tg.translate(0, 0.5, 0);
    const cg = new THREE.IcosahedronGeometry(1, 1); cg.translate(0, 0, 0);
    trunkM = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 }), Math.max(trees.length, 1));
    crownM = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), Math.max(trees.length, 1));
    const tc = new THREE.Color();
    trees.forEach((tr, i) => { tc.setHSL(0.22 + 0.08 * tr.seed, 0.45 + 0.2 * tr.seed, 0.13 + 0.08 * ((tr.seed * 7.7) % 1)); crownM.setColorAt(i, tc); });
    for (const m of [trunkM, crownM]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
  }

  // ---- houses, rooftop clutter and lamp poles ride the flow (their start matrices are read once)
  const kids = bay.group.children.filter((m) => m.isInstancedMesh && m !== bay.glow && m.count > 0);
  const bM = bay.buildings, rtM = kids.find((m) => m !== bM && m.geometry === bM.geometry);
  const poleM = kids.find((m) => m.geometry.type === 'CylinderGeometry');
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const read = (M) => { const L = []; for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, _m); _m.decompose(_p, _q, _s); L.push({ p: _p.clone(), q: _q.clone(), s: _s.clone() }); } return L; };
  const BL = read(bM), RL = rtM ? read(rtM) : [], PL = poleM ? read(poleM) : [];
  BL.forEach((b, i) => { b.g0 = groundH(b.p.x, b.p.z); b.seed = rng(700 + i)(); });
  RL.forEach((r) => { let best = 0, bd = 1e9; BL.forEach((b, j) => { const d = (b.p.x - r.p.x) ** 2 + (b.p.z - r.p.z) ** 2; if (d < bd) { bd = d; best = j; } }); r.b = best; });
  bM.castShadow = true; bM.receiveShadow = true; if (rtM) rtM.castShadow = true;
  // the sun's shadow box: big enough for a hillside (bay.js builds +-40 m)
  const BOX = o.box ?? 320;
  Object.assign(bay.moonLight.shadow.camera, { left: -BOX, right: BOX, top: BOX, bottom: -BOX, near: 1, far: 1600 });
  bay.moonLight.shadow.mapSize.set(4096, 4096); bay.moonLight.shadow.bias = -0.0006; bay.moonLight.shadow.normalBias = 0.4;
  bay.moonLight.castShadow = o.shadows ?? true; bay.moonLight.shadow.camera.updateProjectionMatrix();

  const qT = new THREE.Quaternion(), eT = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  // houses that ended on the mud flat (s07): pushed out along the fall line onto the lagoon, settled and tilted
  const strand = (b, i) => { const [m, dx, dz] = fieldAt(b.p.x, b.p.z); const r = rng(900 + i); const L = 60 + 260 * r();
    return { x: b.p.x + dx * L, z: b.p.z + dz * L, tilt: (r() - 0.5) * 0.35, roll: (r() - 0.5) * 0.35, sink: 0.6 + 1.6 * r(), m }; };
  const api = { ...W, FU, OU, trees, BL, fieldAt, strand,
    // st: { fD (m, flowX), sedR, sedA, focus, after: (b, i) -> {x,z,tilt,roll,sink} | null (s07 house placement) }
    update(S, t, st = {}) {
      const fD = st.fD ?? 0; FU.fD.value = fD; OU.sedR.value = st.sedR ?? 0; OU.sedA.value = st.sedA ?? 0;
      // houses
      const moved = BL.map((b, i) => {
        let x = b.p.x, z = b.p.z, y = b.p.y, q = b.q;
        if (st.after) { const A = st.after(b, i); if (A) { x = A.x; z = A.z; y = 0.35 - A.sink; q = qT.setFromEuler(eT.set(A.tilt, 0, A.roll)).premultiply(b.q).clone(); } }
        else if (fD > 0) { const R = ride(b.p.x, b.p.z, fD); x = R.x; z = R.z; y = b.p.y + (R.y - b.g0);
          const k = R.m * clamp(fD / 25) * 0.12 * (b.seed - 0.5); q = qT.setFromEuler(eT.set(R.dz * k, 0, -R.dx * k)).multiply(b.q).clone(); }
        _m.compose(_p.set(x, y, z), q, b.s); bM.setMatrixAt(i, _m); return { x, y, z, q, dx: x - b.p.x, dy: y - b.p.y, dz: z - b.p.z };
      });
      bM.instanceMatrix.needsUpdate = true;
      if (rtM) { RL.forEach((r, i) => { const M = moved[r.b], b = BL[r.b];
          const off = r.p.clone().sub(b.p).applyQuaternion(b.q.clone().invert()).applyQuaternion(M.q);
          _m.compose(_p.set(M.x, M.y, M.z).add(off), M.q.clone().multiply(b.q.clone().invert()).multiply(r.q), r.s); rtM.setMatrixAt(i, _m); });
        rtM.instanceMatrix.needsUpdate = true; }
      if (poleM) { PL.forEach((pl, i) => { let x = pl.p.x, z = pl.p.z, y = pl.p.y;
          if (st.after) y = -50; else if (fD > 0) { const R = ride(x, z, fD); y += R.y - groundH(x, z); x = R.x; z = R.z; }
          _m.compose(_p.set(x, y, z), pl.q, pl.s); poleM.setMatrixAt(i, _m); }); poleM.instanceMatrix.needsUpdate = true; }
      // trees
      if (trunkM) { trees.forEach((tr, i) => {
          let x = tr.x, z = tr.z, y = groundH(x, z), lean = 0, ldx = 0, ldz = 0;
          if (st.after) y = -80;
          else if (fD > 0) { const R = ride(x, z, fD); x = R.x; z = R.z; y = R.y - 1.6 * R.m * clamp(fD / 6); /* seated into the coarse morphing face (no floating) */ lean = R.m * clamp(fD / 20) * (0.18 + 0.25 * tr.seed) * Math.sin(tr.ph + fD * 0.08); ldx = R.dx; ldz = R.dz; }
          qT.setFromEuler(eT.set(ldz * lean, tr.yaw, -ldx * lean));
          const h = 3.2 * tr.s;
          _m.compose(_p.set(x, y - 0.4, z), qT, _s.set(tr.s, h + 0.4, tr.s)); trunkM.setMatrixAt(i, _m);
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qT);
          _m.compose(_p.set(x, y, z).addScaledVector(up, h + 2.2 * tr.s), qT, _s.set(2.6 * tr.s, 3.4 * tr.s, 2.6 * tr.s)); crownM.setMatrixAt(i, _m); });
        trunkM.instanceMatrix.needsUpdate = crownM.instanceMatrix.needsUpdate = true; }
      W.update(S, t, { focus: st.focus });
    } };
  return api;
}
export { SUN, groundH, sField };
