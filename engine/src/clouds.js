// Cloud deck seen from above: a sea of cumulus tops on the curved Earth, drawn as a background dome (like sky.js) that
// ray-marches a 2.5D heightfield (parallax relief: real silhouettes at the horizon). The heightfield is a tileable cumulus
// texture generated once on the GPU at load (cauliflower domes at three scales inside fbm clusters, + rare towers).
// Shaded live by the sun: wrapped diffuse, soft self-shadow (march toward the sun), crevice occlusion, blue sky-fill in
// the shadows, cast shadows on the sea seen through the gaps, and aerial perspective into the horizon haze.
//   const CL = createClouds(S, { base: 1400, thick: 1900, cover: 0.75 });
//   each frame: CL.update(S, { alt: camera altitude above sea level (m), sunDir: Vector3 });  CL.dip = horizon dip (rad)
// World frame: the camera's world y = 0 is at altitude `alt`; the Earth's centre is straight below at (0, -(R + alt), 0).
import * as THREE from 'three';
import { NOISE } from './glsl.js';
export const R_EARTH = 6371e3;
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
// pass 1: tileable cumulus height in [0,1] (0 = clear gap)
const GEN = `varying vec2 vUv; uniform float cover, towers, seed;
  float hp(vec2 c, float n){ c = mod(c, n); vec3 p3 = fract(vec3(c.xyx + seed*17.) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec2 hp2(vec2 c, float n){ return vec2(hp(c, n), hp(c + 19.19, n)); }
  float vnP(vec2 p, float n){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hp(i, n), hp(i + vec2(1,0), n), f.x), mix(hp(i + vec2(0,1), n), hp(i + vec2(1,1), n), f.x), f.y); }
  float fbmP(vec2 uv, float n, int oct){ float s = 0., a = 0.5, w = 0.; for (int i = 0; i < 6; i++){ if (i >= oct) break; s += a*vnP(uv*n, n); w += a; n *= 2.; a *= 0.5; } return s/w; }
  // max of jittered hemispherical domes of random radius (cauliflower puffs)
  float domes(vec2 uv, float n){ vec2 p = uv*n, i = floor(p), f = fract(p); float h = 0.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), c = i + g; vec2 r = hp2(c, n);
      vec2 o = g + 0.1 + 0.8*r - f; float rad = 0.5 + 0.45*hp(c + 7.7, n); float q = rad*rad - dot(o, o); if (q > 0.) h = max(h, sqrt(q)/0.95); }
    return h; }
  void main(){
    vec2 uv = vUv;
    vec2 wv = uv + 0.035*vec2(fbmP(uv + 0.5, 6., 3) - 0.5, fbmP(uv + 0.17, 6., 3) - 0.5);          // gentle domain warp
    float cl = fbmP(wv, 3., 5);                                                                       // cluster field (~8 km)
    float body = smoothstep(0.62 - cover*0.42, 0.78 - cover*0.42, cl);
    float puff = 0.52*domes(wv, 16.) + 0.3*domes(wv + 0.31, 41.) + 0.18*domes(wv + 0.67, 103.);
    float tw = pow(smoothstep(0.58, 0.86, fbmP(wv + 0.23, 5., 3)), 2.) * towers;                      // towering cells
    float h = (0.22 + 0.78*puff) * (0.55 + 0.45*body) * (1. + 1.6*tw*puff) - (1. - body)*0.62;
    gl_FragColor = vec4(clamp(h, 0., 2.5), 0., 0., 1.); }`;
// pass 2: height, gradient (texture units), and a blurred height for crevice occlusion
const PACK = `varying vec2 vUv; uniform sampler2D src; uniform float px;
  float H(vec2 o){ return texture2D(src, fract(vUv + o*px)).r; }
  void main(){ float h = H(vec2(0)); float gx = (H(vec2(1,0)) - H(vec2(-1,0)))*0.5/px, gy = (H(vec2(0,1)) - H(vec2(0,-1)))*0.5/px;
    float m = 0.; for (int i = 0; i < 8; i++){ float a = float(i)*0.785398; m += H(vec2(cos(a), sin(a))*6.) + H(vec2(cos(a+0.39), sin(a+0.39))*14.); } m /= 16.;
    gl_FragColor = vec4(h, gx*0.001, gy*0.001, m); }`;

export function createClouds(S, o = {}) {
  const { renderer } = S, N = o.res ?? 2048;
  const P = o.period ?? 26000, base = o.base ?? 1400, thick = o.thick ?? 1900;
  // ---- generate the heightfield once ----
  const rtH = new THREE.WebGLRenderTarget(N, N, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  const rtT = new THREE.WebGLRenderTarget(N, N, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  rtT.texture.anisotropy = 1;
  const qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; qs.add(quad);
  quad.material = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: GEN, depthTest: false, depthWrite: false,
    uniforms: { cover: { value: o.cover ?? 0.75 }, towers: { value: o.towers ?? 1.0 }, seed: { value: o.seed ?? 3 } } });
  const prevT = renderer.getRenderTarget();
  renderer.setRenderTarget(rtH); renderer.render(qs, qc);
  quad.material = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: PACK, depthTest: false, depthWrite: false, uniforms: { src: { value: rtH.texture }, px: { value: 1 / N } } });
  renderer.setRenderTarget(rtT); renderer.render(qs, qc); renderer.setRenderTarget(prevT);
  rtH.dispose();
  // ---- the dome ----
  const U = {
    hTex: { value: rtT.texture }, period: { value: P }, base: { value: base }, thick: { value: thick }, alt: { value: 15000 }, RE: { value: R_EARTH },
    sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() }, sunCol: { value: new THREE.Color(o.sunCol ?? 0xfff3e2) }, sunI: { value: o.sunI ?? 1.45 },
    skyCol: { value: new THREE.Color(o.skyCol ?? 0x5d8fe0) }, skyI: { value: o.skyI ?? 0.55 }, hazeCol: { value: new THREE.Color(o.hazeCol ?? 0xc9dcf5) }, hazeL: { value: o.hazeL ?? 170e3 },
    seaCol: { value: new THREE.Color(o.seaCol ?? 0x0a2a4a) }, pxAng: { value: 0.0007 }, texel: { value: P / N }, offset: { value: new THREE.Vector2(o.ox ?? 0, o.oz ?? 0) },
    regional: { value: o.regional ?? 0.35 }, exposure: { value: 1 }, steps: { value: o.steps ?? 28 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,0.)).xyz); vec4 p = projectionMatrix*viewMatrix*vec4(cameraPosition + vD*1000., 1.); gl_Position = p.xyww; }',
    fragmentShader: `${NOISE}
      uniform sampler2D hTex; uniform float period, base, thick, alt, RE, sunI, skyI, hazeL, pxAng, texel, regional, exposure, steps;
      uniform vec3 sunDir, sunCol, skyCol, hazeCol, seaCol; uniform vec2 offset; varying vec3 vD;
      vec3 C; float lodK; float reg;
      // cloud top altitude (m above sea level) at map position xz; -1 where clear
      vec4 tex(vec2 xz, float lod){ return textureLod(hTex, (xz + offset)/period, lod); }
      float topAt(vec2 xz, float lod, out vec4 T){ T = tex(xz, lod); float h = max(T.r - reg, 0.)/(1. - reg + 1e-3); return h > 0.002 ? base + h*thick : -1.; }
      float altOf(vec3 p){ return length(p - C) - RE; }
      vec2 sph(vec3 ro, vec3 rd, float r){ vec3 oc = ro - C; float b = dot(oc, rd), c = dot(oc, oc) - r*r, h = b*b - c; if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h); }
      void main(){
        vec3 d = normalize(vD);
        C = vec3(0., -(RE + alt), 0.); vec3 ro = cameraPosition;                    // world y = 0 is at altitude alt
        float Rt = RE + base + thick*2.6;                                         // top of the tallest towers
        vec2 st = sph(ro, d, Rt); if (st.x < 0.) discard;                          // above the deck's horizon: the sky shows
        vec2 sb = sph(ro, d, RE + base);
        float t0 = st.x, t1 = sb.x > 0. ? sb.x : st.y;                             // march from the top shell to the cloud base (or out again)
        // slowly varying regional thinning (breaks the tiling, opens clear patches)
        vec3 pe = ro + d*t0; reg = regional * smoothstep(0.35, 0.75, fbm2((pe.xz + offset)/95000.)) * 0.9;
        float sinG = max(-d.y, 0.02);
        lodK = pxAng/texel * mix(1., 1./sinG, 0.35);
        // march (steps cluster near the entry), then refine
        float tPrev = t0, tHit = -1.; vec4 T; float n = steps;
        for (int i = 1; i <= 64; i++){ if (float(i) > n) break; float u = float(i)/n; float t = mix(t0, t1, u*u*(0.35 + 0.65*u) / 1.0);
          vec3 p = ro + d*t; float lod = log2(max(t*lodK, 1.)); float top = topAt(p.xz, lod, T);
          if (top > 0. && altOf(p) <= top){ tHit = t; break; } tPrev = t; }
        vec3 col; float dist;
        if (tHit > 0.){
          float a = tPrev, b = tHit;
          for (int k = 0; k < 5; k++){ float m = 0.5*(a + b); vec3 p = ro + d*m; float top = topAt(p.xz, log2(max(m*lodK, 1.)), T); if (top > 0. && altOf(p) <= top) b = m; else a = m; }
          dist = b; vec3 p = ro + d*b; float lod = log2(max(b*lodK, 1.));
          float top = topAt(p.xz, lod, T); float h01 = (top - base)/thick;
          // normal from the stored gradient (texture units -> metres)
          vec2 g = T.gb*1000.*thick/period/(1. - reg + 1e-3); vec3 nrm = normalize(vec3(-g.x, 1., -g.y));
          vec3 L = normalize(sunDir);
          float wrap = clamp((dot(nrm, L) + 0.45)/1.45, 0., 1.);
          // soft self-shadow: march toward the sun across the heightfield
          float sh = 1., ts = 60.;
          for (int k = 0; k < 7; k++){ vec3 q = p + L*ts; vec4 Tq; float tq = topAt(q.xz, lod + 0.5, Tq); if (tq > 0.) sh = min(sh, clamp(1. - (tq - altOf(q))/220., 0., 1.)); ts *= 1.75; }
          float occ = clamp(0.55 + (T.r - T.a)*2.2, 0., 1.) * (0.7 + 0.3*clamp(h01, 0., 1.));     // crevices darker, high tops open
          vec3 sunL = sunCol*sunI*wrap*sh;
          vec3 fill = skyCol*skyI*(0.45 + 0.55*occ) + vec3(0.9, 0.93, 1.0)*0.12*occ;              // blue sky fill + bounce
          col = (sunL + fill)*(0.92 + 0.08*vn3(p*0.004));
          // sunward edges glow when the light comes through (silver lining)
          col += sunCol*sunI*0.18*pow(max(dot(d, L), 0.), 6.)*(1. - wrap);
        } else {
          // through a gap: the sea below, with the deck's shadows on it
          vec2 sg = sph(ro, d, RE); dist = sg.x > 0. ? sg.x : t1; vec3 p = ro + d*dist; vec3 L = normalize(sunDir);
          vec3 q = p + L*((base + thick*0.45)/max(L.y, 0.2)); vec4 Tq; float lod = log2(max(dist*lodK, 1.));
          float shd = topAt(q.xz, lod, Tq) > 0. ? 0.35 : 1.;
          col = seaCol*(sunI*0.9*max(L.y, 0.)*shd + skyI*0.5) + skyCol*0.06;
        }
        // aerial perspective (the lower atmosphere between us and the deck), brighter toward the horizon
        float f = 1. - exp(-dist/hazeL);
        col = mix(col, hazeCol, f);
        gl_FragColor = vec4(col*exposure, 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat); mesh.frustumCulled = false; mesh.renderOrder = -9990;
  S.scene.add(mesh);
  const api = { mesh, U, texture: rtT.texture, dip: 0,
    update(S, st = {}) {
      if (st.alt != null) U.alt.value = st.alt; if (st.sunDir) U.sunDir.value.copy(st.sunDir).normalize();
      U.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H;
      const r = R_EARTH + base + thick * 0.6, h = R_EARTH + U.alt.value; api.dip = Math.acos(Math.min(1, r / h));   // dip of the visible deck horizon
    } };
  return api;
}
