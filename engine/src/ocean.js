// Ocean: Gerstner swell (JS mirror for floating objects), detail normals, planar reflections (moon path, town lights),
// Fresnel, shallow-water tint + surf/shore foam from an analytic ground-height function, crest foam, moon/sun glitter.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { NOISE } from './glsl.js';
// wave set: [dirAngleDeg, wavelength m, steepness Q, relative amp]
export const WAVES = [[200, 60, 0.35, 1.0], [215, 31, 0.40, 0.55], [185, 18, 0.45, 0.32], [230, 11, 0.5, 0.18], [170, 7.3, 0.5, 0.11], [250, 4.1, 0.5, 0.06]];
const G = 9.81;
const waveParams = WAVES.map(([a, L, Q, r]) => { const k = 2 * Math.PI / L; const d = [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]; return { d, k, w: Math.sqrt(G * k), Q, r, A: r * L / 60 * 0.9 }; });
// JS mirror: height of the water surface (approx, ignores horizontal displacement) at x,z,t with amplitude scale amp
export function waveHeight(x, z, t, amp = 1, level = 0) {
  let y = level; for (const p of waveParams) y += amp * p.A * Math.sin(p.k * (p.d[0] * x + p.d[1] * z) - p.w * t); return y;
}
export function waveSlope(x, z, t, amp = 1) { // gradient for tilting boats
  let gx = 0, gz = 0; for (const p of waveParams) { const c = amp * p.A * p.k * Math.cos(p.k * (p.d[0] * x + p.d[1] * z) - p.w * t); gx += c * p.d[0]; gz += c * p.d[1]; } return [gx, gz];
}
const WGLSL = `
const int NW = ${WAVES.length};
uniform float wA[NW]; uniform float wK[NW]; uniform float wW[NW]; uniform float wQ[NW]; uniform vec2 wD[NW];
vec3 gerstner(vec2 xz, float t, float amp, float atten, out vec3 nrm, out float jac){
  vec3 p = vec3(xz.x, 0., xz.y); vec3 tx = vec3(1,0,0), tz = vec3(0,0,1); jac = 1.;
  for (int i=0;i<NW;i++){ float A = wA[i]*amp*atten; float f = wK[i]*dot(wD[i], xz) - wW[i]*t; float s = sin(f), c = cos(f); float Q = wQ[i];
    p.x += Q*A*wD[i].x*c; p.z += Q*A*wD[i].y*c; p.y += A*s;
    float WA = wK[i]*A;
    tx += vec3(-Q*wD[i].x*wD[i].x*WA*s, wD[i].x*WA*c, -Q*wD[i].x*wD[i].y*WA*s);
    tz += vec3(-Q*wD[i].x*wD[i].y*WA*s, wD[i].y*WA*c, -Q*wD[i].y*wD[i].y*WA*s);
    jac -= Q*WA*s; }
  nrm = normalize(cross(tz, tx)); return p; }`;
export function createOcean(S, o = {}) {
  const groundGLSL = o.groundGLSL || 'float groundH(vec2 p){ return -200.; }';
  const nTex = S.tex('water_normal_1k.jpg', { srgb: false, repeat: true });
  const rs = o.reflScale ?? 0.5;
  const refl = new Reflector(new THREE.PlaneGeometry(1, 1), { textureWidth: Math.round(S.W * rs), textureHeight: Math.round(S.H * rs), clipBias: 0.02 });
  refl.rotation.x = -Math.PI / 2; refl.scale.set(1e5, 1e5, 1); refl.frustumCulled = false; refl.renderOrder = -20000;
  const texM = refl.material.uniforms.textureMatrix.value; // updated by Reflector each render (before the ocean draws)
  refl.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
  refl.getRenderTarget().texture.type = THREE.HalfFloatType;
  const U = {
    time: { value: 0 }, amp: { value: o.amp ?? 0.6 }, level: { value: o.level ?? 0 }, nTex: { value: nTex }, refl: { value: refl.getRenderTarget().texture }, texM: { value: texM }, reflInv: { value: new THREE.Matrix4() },
    moonDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() }, moonCol: { value: new THREE.Color(0xdfe6ff) }, moonI: { value: 1.0 },
    sunDir: { value: new THREE.Vector3(0, -0.3, -1).normalize() }, sunCol: { value: new THREE.Color(0xffc890) }, sunI: { value: 0.0 },
    deep: { value: new THREE.Color(o.deep ?? 0x02121a) }, shallow: { value: new THREE.Color(o.shallow ?? 0x0b4a52) }, sand: { value: new THREE.Color(o.sandCol ?? 0x6d6150) },
    amb: { value: new THREE.Color(o.amb ?? 0x0a1830) }, reflI: { value: o.reflI ?? 1.0 }, distort: { value: o.distort ?? 0.035 },
    foamAmt: { value: o.foam ?? 1.0 }, surf: { value: o.surf ?? 1.0 }, rough: { value: o.rough ?? 0.16 }, glitter: { value: o.glitter ?? 0.35 },
    wA: { value: waveParams.map((p) => p.A) }, wK: { value: waveParams.map((p) => p.k) }, wW: { value: waveParams.map((p) => p.w) }, wQ: { value: waveParams.map((p) => p.Q) },
    wD: { value: waveParams.map((p) => new THREE.Vector2(p.d[0], p.d[1])) },
    exposure: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${WGLSL}
      ${groundGLSL}
      uniform float time, amp, level; uniform mat4 texM, reflInv;
      varying vec3 vWP; varying vec3 vN; varying float vJac; varying vec4 vRU; varying float vDepth; varying vec2 vFlat;
      void main(){
        vec4 wp0 = modelMatrix*vec4(position,1.); vec2 xz = wp0.xz;
        float gh = groundH(xz); float depth = level - gh;
        float atten = clamp(depth/6., 0.15, 1.) * smoothstep(-1., 1.5, depth);
        float dist = length(xz - cameraPosition.xz); float far = 1. - smoothstep(1500., 6000., dist);
        vec3 n; float j; vec3 p = gerstner(xz, time, amp, atten*far + 0.0001, n, j);
        p.y += level; vWP = p; vN = n; vJac = j; vDepth = depth; vFlat = xz;
        vRU = texM * reflInv * vec4(xz.x, level, xz.y, 1.);
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: `${NOISE}
      ${groundGLSL}
      uniform float time, amp, level, moonI, sunI, reflI, distort, foamAmt, surf, rough, glitter, exposure;
      uniform sampler2D nTex, refl; uniform vec3 moonDir, moonCol, sunDir, sunCol, deep, shallow, sand, amb;
      varying vec3 vWP; varying vec3 vN; varying float vJac; varying vec4 vRU; varying float vDepth; varying vec2 vFlat;
      vec3 nm(vec2 uv){ return texture2D(nTex, uv).xzy*2.-1.; }
      float ggx(vec3 n, vec3 v, vec3 l, float r){ vec3 h = normalize(v+l); float a = r*r; float nh = max(dot(n,h),0.); float d = nh*nh*(a*a-1.)+1.; return a*a/(3.14159*d*d) * max(dot(n,l),0.); }
      void main(){
        vec3 V = cameraPosition - vWP; float dist = length(V); V /= dist;
        float fade = 1. - smoothstep(200., 2500., dist);
        vec3 d1 = nm(vWP.xz/9. + vec2(time*0.020, time*0.013)); vec3 d2 = nm(vWP.xz/3.1 - vec2(time*0.031, -time*0.024)); vec3 d3 = nm(vWP.xz/38. + vec2(-time*0.008, time*0.011));
        vec3 dn = vec3(d1.x+d2.x*0.6+d3.x*0.8, 0., d1.z+d2.z*0.6+d3.z*0.8);
        vec3 n = normalize(vN + dn*(0.22*fade + 0.10)*(0.5+amp));
        if (!gl_FrontFacing) n = -n;
        float cosT = clamp(dot(n, V), 0., 1.);
        float F = 0.02 + 0.98*pow(1.-cosT, 5.);
        // planar reflection, distorted by normals (stretched vertically -> long light streaks)
        vec2 ru = vRU.xy/vRU.w; ru += vec2(n.x*0.5, n.z*3.0)*distort*(0.6+0.4*fade);
        vec3 R = texture2D(refl, ru).rgb * reflI;
        // body colour
        float shallowF = 1. - smoothstep(0.0, 9., vDepth);
        vec3 body = mix(deep, shallow, 0.35*shallowF + 0.15*clamp((vWP.y-level)/max(amp,0.1)*0.5+0.5, 0., 1.));
        body = mix(body, sand*0.5, smoothstep(2.0, 0.0, vDepth)*0.6);
        vec3 lightAmb = amb + moonCol*moonI*0.05*max(moonDir.y,0.) + sunCol*sunI*0.08*max(sunDir.y+0.1, 0.);
        vec3 col = body*lightAmb*2.;
        // subsurface glow on crests facing light
        float sss = pow(max(dot(V, -normalize(moonDir+vec3(0,0.3,0))), 0.), 4.) * clamp(vWP.y-level, 0., 2.) * 0.4;
        col += shallow*moonCol*moonI*sss*0.3;
        col = mix(col, R, F);
        // glitter: analytic specular of moon & sun
        float sp = ggx(n, V, normalize(moonDir), rough) * moonI + ggx(n, V, normalize(sunDir), rough) * sunI * 4.;
        col += (moonCol*ggx(n, V, normalize(moonDir), rough)*moonI + sunCol*ggx(n, V, normalize(sunDir), rough)*sunI*4.) * glitter * 0.6;
        // foam: crests (jacobian) + surf lines near shore
        float crest = smoothstep(0.85, 0.45, vJac) * (0.5 + 0.5*fbm2(vWP.xz*0.35 + time*0.2));
        float sd = max(vDepth, 0.);
        float surfL = 0.5+0.5*sin(sd*1.7 - time*1.4 + fbm2(vFlat*0.05)*6.);
        float surfF = smoothstep(4.0, 0.5, sd) * smoothstep(0.55, 0.95, surfL) * surf;
        float edge = smoothstep(0.9, 0.0, sd) * surf;
        float foamN = fbm2(vWP.xz*1.3 + vec2(time*0.3, 0.)) ;
        float foam = clamp((crest*0.6 + surfF*0.9 + edge) * smoothstep(0.35, 0.7, foamN + 0.25*edge), 0., 1.) * foamAmt * fade;
        vec3 foamLit = vec3(0.9,0.95,1.0) * (amb*1.6 + moonCol*moonI*0.18*max(moonDir.y, 0.05) + sunCol*sunI*0.4*max(sunDir.y+0.1,0.)) + R*0.15;
        col = mix(col, foamLit, foam*0.85);
        // wet-edge alpha: let the sand show through in the last few cm
        float a = smoothstep(-0.05, 0.25, vDepth);
        gl_FragColor = vec4(col*exposure, a);
      }`,
    transparent: true, depthWrite: true,
  });
  // radial grid: dense near the centre, out to ~20 km
  const rings = o.rings ?? 150, segs = o.segs ?? 288, r0 = 0.6, rMax = o.radius ?? 20000;
  const kk = Math.pow(rMax / r0, 1 / rings);
  const pos = [], idx = [];
  pos.push(0, 0, 0);
  for (let i = 0; i <= rings; i++) { const r = r0 * Math.pow(kk, i); for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + i * segs + j, b = 1 + i * segs + (j + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  // Reflector hides only itself: hide the ocean during the mirror render
  const ob = refl.onBeforeRender.bind(refl);
  refl.onBeforeRender = (r, sc, cam) => { mesh.visible = false; ob(r, sc, cam); mesh.visible = true; };
  mesh.refl = refl; mesh.U = U;
  mesh.update = (S, t) => {
    U.time.value = t;
    // follow the camera in XZ, snapped to the grid's inner spacing to avoid swimming
    const c = S.camera.position; mesh.position.set(Math.round(c.x / 4) * 4, 0, Math.round(c.z / 4) * 4);
    refl.position.y = U.level.value; refl.updateMatrixWorld(); U.reflInv.value.copy(refl.matrixWorld).invert();
  };
  return { mesh, refl, U, add(scene) { scene.add(refl); scene.add(mesh); } };
}
