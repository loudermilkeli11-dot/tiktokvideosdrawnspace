// Mega-wave: a breaking wall of water as a REAL mesh (not a height field): a cross-section profile swept along a front.
// The profile runs from the long back slope over the crest, out along a throwing lip, curls under it (the tube) and runs
// down a steep face to a toe under the sea. Two shapes are blended per column: WALL (steep, no overhang) and PLUNGE (the lip
// thrown forward). Every column varies (height, lip reach, curl, front offset: smooth noise along the front), so the crest
// line is ragged and alive, never a ribbon. New in tsunami-524; no other module depends on it.
//   const MW = createMegaWave(S, { len: 14000, cols: 320, seed: 3 });   MW.group.position / rotation.y place it (local +Z = travel)
//   per frame: MW.set({ H, front, curl, lean, bend, time, sunDir })      H metres; front = local z of the crest line
//   MW.lipAt(x, st) -> world point of the lip tip for spray;  MW.U.cutY / cutSoft hide it below an altitude (cloud deck)
// Shading (MeshStandardMaterial + patches, so it takes the HDRI reflections, the sun and the fog): deep green-blue body that
// lightens up the face, thin-water translucency at the crest and lip (strongest looking toward the sun), foam as marbled
// patches and lace that flow UP the face into the lip (warped, broad: no "rain" streaks), churned white water at the toe,
// white water on the crest and the back, and ripple normals from the water normal map.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { fbm, clamp, sstep } from './util.js';

// control points (s forward, y up) in units of H. BACK is shared; the front 13 points are blended WALL -> PLUNGE by curl.
const BACK = [[-4.6, -0.03], [-2.7, 0.10], [-1.45, 0.40], [-0.62, 0.79], [-0.2, 0.97]];
const WALL = [[0.04, 1.0], [0.15, 0.975], [0.215, 0.92], [0.245, 0.86], [0.245, 0.82], [0.238, 0.78], [0.225, 0.72], [0.19, 0.56], [0.175, 0.38], [0.22, 0.2], [0.36, 0.075], [0.7, 0.005], [1.4, -0.045]];
const PLUNGE = [[0.13, 1.035], [0.37, 0.985], [0.54, 0.87], [0.63, 0.7], [0.585, 0.615], [0.46, 0.625], [0.27, 0.665], [0.12, 0.565], [0.085, 0.38], [0.14, 0.2], [0.30, 0.07], [0.66, 0.0], [1.4, -0.045]];
const NC = BACK.length + WALL.length;              // 18 control points
const STEPS = [3, 3, 3, 4, 5, 6, 6, 7, 7, 7, 6, 6, 6, 6, 5, 4, 3];   // samples per segment (dense round the lip)
// Catmull-Rom weights for every profile sample: [segment, u] -> weights on 4 control points
const SAMP = []; for (let i = 0; i < NC - 1; i++) for (let k = 0; k < STEPS[i]; k++) SAMP.push([i, k / STEPS[i]]); SAMP.push([NC - 2, 1]);
const NR = SAMP.length;
const crw = (u) => { const u2 = u * u, u3 = u2 * u; return [-0.5 * u3 + u2 - 0.5 * u, 1.5 * u3 - 2.5 * u2 + 1, -1.5 * u3 + 2 * u2 + 0.5 * u, 0.5 * u3 - 0.5 * u2]; };
const WTS = SAMP.map(([i, u]) => ({ i, w: crw(u), cp: i + u }));
export const CREST_CP = BACK.length;                // control index of the crest (5): arc length is measured from here

export function createMegaWave(S, o = {}) {
  const L = o.len ?? 14000, NCOL = o.cols ?? 320, seed = o.seed ?? 3;
  const group = new THREE.Group(); S.scene.add(group);
  const nv = NCOL * NR;
  const pos = new Float32Array(nv * 3), aXA = new Float32Array(nv * 2), aY = new Float32Array(nv), aCP = new Float32Array(nv);
  for (let c = 0; c < NCOL; c++) for (let r = 0; r < NR; r++) aCP[c * NR + r] = WTS[r].cp;
  const idx = []; for (let c = 0; c < NCOL - 1; c++) for (let r = 0; r < NR - 1; r++) { const a = c * NR + r, b = a + NR, cc = a + 1, d = b + 1; idx.push(a, cc, b, b, cc, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aXA', new THREE.BufferAttribute(aXA, 2));
  geo.setAttribute('aY', new THREE.BufferAttribute(aY, 1)); geo.setAttribute('aCP', new THREE.BufferAttribute(aCP, 1)); geo.setIndex(idx);
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  const nTex = S.tex('water_normal_1k.jpg', { srgb: false, repeat: true });
  const U = { time: { value: 0 }, H: { value: 500 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff2df) }, sunI: { value: 1 },
    deepCol: { value: new THREE.Color(o.deep ?? 0x03262b) }, midCol: { value: new THREE.Color(o.mid ?? 0x0b4f55) }, sssCol: { value: new THREE.Color(o.sss ?? 0x1fae9a) },
    foamAmt: { value: o.foam ?? 1 }, flow: { value: o.flow ?? 40 }, nTex: { value: nTex }, across: { value: new THREE.Vector3(1, 0, 0) }, rip: { value: o.ripple ?? 0.35 },
    cutY: { value: -1e6 }, cutSoft: { value: 200 }, cutCol: { value: new THREE.Color(0xf4f6fa) }, sssI: { value: o.sssI ?? 1 } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, envMapIntensity: o.envI ?? 1.0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aXA; attribute float aY; attribute float aCP; varying vec2 vXA; varying float vY; varying float vCP; varying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXA = aXA; vY = aY; vCP = aCP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      ${NOISE}
      uniform float time, H, sunI, foamAmt, flow, rip, cutY, cutSoft, sssI; uniform vec3 sunDir, sunCol, deepCol, midCol, sssCol, across, cutCol; uniform sampler2D nTex;
      varying vec2 vXA; varying float vY; varying float vCP; varying vec3 vWp;
      float wFoam; vec3 wSSS; float wCut;`)
      .replace('#include <map_fragment>', `
        { float cp = vCP;
          float crestM = smoothstep(3.6, 4.7, cp) * (1. - smoothstep(8.4, 9.4, cp));
          float topM = smoothstep(4.0, 4.9, cp) * (1. - smoothstep(5.9, 6.7, cp));           // the crest's top: broken white water
          float lipF = smoothstep(5.9, 6.7, cp) * (1. - smoothstep(8.2, 9.0, cp));           // the lip's front: thin, translucent
          float tipM = exp(-pow((cp - 8.05)/0.35, 2.));                                       // the lip's edge throwing spray
          float underM = smoothstep(8.4, 9.2, cp) * (1. - smoothstep(11.0, 11.8, cp));
          float faceM = smoothstep(11.0, 12.0, cp) * (1. - smoothstep(14.6, 15.6, cp));
          float toeM = smoothstep(14.4, 15.8, cp);
          float backM = 1. - smoothstep(2.6, 4.0, cp);
          float Hs = clamp(H, 180., 700.);
          vec2 q = vXA + vec2(0., time*flow);                                  // the face flows up into the lip
          vec2 wq = q + (vec2(fbm2(q/(0.22*Hs) + 7.), fbm2(q/(0.22*Hs) + 1.3)) - 0.5)*0.3*Hs;
          float w1 = fbm2(q*vec2(1./(0.3*Hs), 1./(0.42*Hs)) + 3.1);
          float n1 = fbm2(wq*vec2(1./(0.085*Hs), 1./(0.15*Hs)));
          float n2 = fbm2(wq*vec2(1./(0.028*Hs), 1./(0.045*Hs)) + 5.);
          float lace = 1. - abs(2.*fbm2(wq*vec2(1./(0.05*Hs), 1./(0.075*Hs)) + 11.) - 1.);
          float y01 = clamp(vY, 0., 1.2);
          float f = 0.;
          f += topM * smoothstep(0.42, 0.66, n1*0.65 + n2*0.4);
          f += lipF * (smoothstep(0.62, 0.8, n1*0.6 + n2*0.45) * 0.75 + smoothstep(0.86, 0.97, lace)*0.5);
          f += tipM * smoothstep(0.3, 0.55, n2 + 0.15*n1);
          f += faceM * (smoothstep(0.66, 0.82, n1*0.55 + w1*0.45 + 0.06*(1. - y01)) * 0.7 + smoothstep(0.86, 0.97, lace)*smoothstep(0.45, 0.62, w1)*0.55);
          f += toeM * smoothstep(0.42, 0.66, n1*0.6 + n2*0.45 + 0.08*smoothstep(15.5, 16.5, cp));
          f += backM * smoothstep(0.55, 0.75, n1*0.6 + w1*0.5) * 0.75;
          f += underM * smoothstep(0.66, 0.82, n1*0.7 + n2*0.3) * 0.45;
          wFoam = clamp(f, 0., 1.) * foamAmt;
          vec3 body = mix(deepCol, midCol, smoothstep(0.05, 0.85, y01) + 0.35*lipF + 0.2*topM);
          body *= 0.85 + 0.3*n2;
          vec3 V = normalize(cameraPosition - vWp);
          float bk = pow(max(dot(-V, normalize(sunDir)), 0.), 2.);
          float thin = topM*0.45 + lipF*1.0 + underM*0.6 + faceM*smoothstep(0.5, 0.8, y01)*0.4;
          wSSS = sssCol*sunCol*sunI*sssI*(0.32 + 1.5*bk)*thin*(1. - wFoam)*(0.7 + 0.6*n1);
          vec3 foamC = vec3(0.93, 0.955, 0.97)*(0.82 + 0.25*n2);
          diffuseColor.rgb = mix(body, foamC, wFoam);
          wCut = smoothstep(cutY - cutSoft, cutY + cutSoft, vWp.y);
          if (wCut < h12(gl_FragCoord.xy + fract(time*7.31)*91.)) discard;
          diffuseColor.rgb = mix(cutCol, diffuseColor.rgb, smoothstep(0., 0.6, wCut));
          wFoam = max(wFoam, 1. - smoothstep(0., 0.6, wCut)); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.07, 0.85, wFoam);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float Hs = clamp(H, 180., 700.); vec2 q = vXA + vec2(0., time*flow);
          vec3 d1 = texture2D(nTex, q/(0.07*Hs)).xyz*2. - 1., d2 = texture2D(nTex, q/(0.022*Hs) + 0.37).xyz*2. - 1.;
          vec2 d = (d1.xy + 0.6*d2.xy)*rip*(1. - 0.7*wFoam);
          vec3 t1 = normalize((viewMatrix*vec4(across, 0.)).xyz); vec3 t2 = normalize(cross(normal, t1));
          normal = normalize(normal + t1*d.x + t2*d.y); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += wSSS;');
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 15; group.add(mesh);
  const st0 = { H: 500, front: 0, curl: 0.6, lean: 0, bend: 0, time: 0 };
  // per-column variation (deterministic: x and seed only, plus a slow drift with time)
  const colVar = (x, st) => {
    const Hn = Math.max(st.H, 1), t = st.time ?? 0;
    const e = sstep(L / 2, L / 2 - L * 0.18, Math.abs(x));
    return {
      hf: (1 + 0.17 * fbm(x / (1.6 * Hn) + seed * 3.1, seed) + 0.07 * fbm(x / (0.45 * Hn) + 5 + t * 0.1, seed + 2)) * (0.15 + 0.85 * e),
      curl: clamp((st.curl ?? 0.6) + 0.38 * fbm(x / (0.8 * Hn) + 11 + t * 0.12, seed + 4)),
      soff: 0.13 * Hn * fbm(x / (1.7 * Hn) + 3 + seed, seed + 6) - (st.bend ?? 0) * x * x,
    };
  };
  // profile of one column -> arrays of (s, y) in metres
  const cs = new Float32Array(NC * 2), ps = new Float32Array(NR * 2);
  function profile(x, st) {
    const v = colVar(x, st), H = st.H * v.hf, lean = st.lean ?? 0;
    for (let k = 0; k < NC; k++) { let s, y;
      if (k < BACK.length) { [s, y] = BACK[k]; } else { const a = WALL[k - BACK.length], b = PLUNGE[k - BACK.length]; s = a[0] + (b[0] - a[0]) * v.curl; y = a[1] + (b[1] - a[1]) * v.curl; }
      s += lean * Math.pow(Math.max(y, 0), 1.6) * 0.55;
      cs[k * 2] = s * H + v.soff; cs[k * 2 + 1] = y * H; }
    for (let r = 0; r < NR; r++) { const { i, w } = WTS[r]; const k0 = Math.max(i - 1, 0), k3 = Math.min(i + 2, NC - 1);
      ps[r * 2] = w[0] * cs[k0 * 2] + w[1] * cs[i * 2] + w[2] * cs[(i + 1) * 2] + w[3] * cs[k3 * 2];
      ps[r * 2 + 1] = w[0] * cs[k0 * 2 + 1] + w[1] * cs[i * 2 + 1] + w[2] * cs[(i + 1) * 2 + 1] + w[3] * cs[k3 * 2 + 1]; }
    return { H, v };
  }
  const colX = (c) => (c / (NCOL - 1) - 0.5) * L;
  const crestR = SAMP.findIndex((s) => s[0] === CREST_CP);
  const api = { group, mesh, U, len: L,
    set(st) {
      Object.assign(st0, st); const s = st0;
      U.H.value = s.H; U.time.value = s.time ?? 0; if (s.sunDir) U.sunDir.value.copy(s.sunDir).normalize();
      for (let c = 0; c < NCOL; c++) { const x = colX(c); const { H } = profile(x, s);
        let arc = 0; const a0 = c * NR;
        for (let r = 0; r < NR; r++) { const k = (a0 + r) * 3; pos[k] = x; pos[k + 1] = ps[r * 2 + 1]; pos[k + 2] = s.front + ps[r * 2];
          if (r > 0) arc += Math.hypot(ps[r * 2] - ps[r * 2 - 2], ps[r * 2 + 1] - ps[r * 2 - 1]);
          aXA[(a0 + r) * 2] = x; aXA[(a0 + r) * 2 + 1] = arc; aY[a0 + r] = ps[r * 2 + 1] / Math.max(H, 1); }
        const ac = aXA[(a0 + crestR) * 2 + 1]; for (let r = 0; r < NR; r++) aXA[(a0 + r) * 2 + 1] -= ac; }
      geo.attributes.position.needsUpdate = true; geo.attributes.aXA.needsUpdate = true; geo.attributes.aY.needsUpdate = true;
      geo.computeVertexNormals();
      U.across.value.set(1, 0, 0).applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));
    },
    // world position of the lip tip (control point 8 region) and of the crest for column x (metres along the front)
    lipAt(x, st = st0, which = 8) { profile(x, st); const r = SAMP.findIndex((s) => s[0] === which);
      group.updateMatrixWorld(); return new THREE.Vector3(x, ps[r * 2 + 1], st.front + ps[r * 2]).applyMatrix4(group.matrixWorld); },
    heightAt(x, st = st0) { return profile(x, st).H; },
  };
  return api;
}
