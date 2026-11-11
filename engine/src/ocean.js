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

// ---- gravity-flip slab (compiled in only with createOcean(S, { slab: true }); needs sField() in groundGLSL) ----
// surge: a decelerating bore pushed inland from the shoreline. Water-surface height above `level` at xz, ts s after impact.
const SURGE_GLSL = `
float surgeW(vec2 xz, float ts){
  float s = sField(xz);
  float front = surgeR*(1. - exp(-ts*surgeV/surgeR));
  float behind = front - s;
  float wf = smoothstep(-1.5, 9., behind) * smoothstep(-320., -30., s);
  float wob = 0.8 + 0.2*sin(xz.x*0.045 + xz.y*0.03 + ts*2.3) + 0.12*sin(xz.x*0.21 - ts*4.);
  return surgeH*wob*wf*(1. - 0.35*clamp(s/max(front, 1.), 0., 1.)); }`;
const SLAB_VS = `
        if (churn > 0.) { float c = churn*smoothstep(-0.5, 4., depth);
          p.y += c*(2.6*sin(xz.x*0.031 + time*1.3)*sin(xz.y*0.027 - time*1.1) + 1.6*sin(xz.x*0.083 - xz.y*0.061 + time*2.1) + 0.8*sin(xz.x*0.19 + xz.y*0.17 - time*3.3));
          n = normalize(n + c*vec3(0.25*sin(xz.x*0.083 + time), 0., 0.25*cos(xz.y*0.071 - time))); }
        vSurge = -1.;
        if (surgeT > 0.) { float W = surgeW(xz, surgeT); vSurge = W - (gh - level); if (W > p.y) { p.y = mix(p.y, W, smoothstep(-0.5, 0.5, vSurge)); } }
        p.y += lift;`;
const SLAB_FS = `
        if (lift > 0.01 && vDepth < 0.) discard;
        if (surgeT > 0. && vDepth < 0.6) {          // the surge over the land: muddy, churning, foam-streaked; a white breaking front
          float sd = vSurge; if (sd < -0.05 && vDepth < 0.) discard;
          float fl = fbm2(vFlat*vec2(0.09, 0.05) + vec2(time*0.6, -time*1.1));
          float fr = smoothstep(0.0, 1.0, sd)*smoothstep(5.5, 1.5, sd);
          vec3 mud = mix(vec3(0.10,0.22,0.20), vec3(0.26,0.34,0.27), fl)*(amb*1.5 + sunCol*sunI*0.45) + R*F*0.5;
          float wf = clamp(smoothstep(0.6, 0.74, fl + 0.3*fbm2(vFlat*0.35 - time*0.9))*0.75 + fr*0.95, 0., 1.);
          vec3 sc = mix(mud, foamLit*1.05, wf);
          float land = smoothstep(0.3, -0.3, vDepth);
          col = mix(col, sc, land); a = mix(a, smoothstep(-0.05, 0.25, sd), land);
        }
        if (churn > 0. && vDepth > -0.3) {          // the impact: the bay smashed into white water
          float c1 = fbm2(vWP.xz*0.035 + vec2(time*0.35, time*0.2)), c2 = fbm2(vWP.xz*0.16 - vec2(time*0.8, -time*0.5)), c3 = fbm2(vWP.xz*0.6 + time*1.3);
          float wc = churn*smoothstep(0.47, 0.64, c1*0.6 + c2*0.45 + 0.18*c3);
          float streak = churn*smoothstep(0.62, 0.7, fbm2(vWP.xz*vec2(0.05, 0.3) + c1*2.))*0.7;
          vec3 wfc = vec3(0.93, 0.96, 0.98)*(0.38 + 0.62*sunI*max(sunDir.y, 0.1))*(0.68 + 0.42*c3)*(0.8 + 0.3*c2);
          col = mix(col*vec3(0.7, 1.05, 1.1) + shallow*0.18*churn, wfc, clamp(wc + streak, 0., 1.)*0.95);
        }`;
// underside of the lifted sea, seen from below: the seabed's shape + lift. Sky and sun through the water (refracted twice,
// Beer-Lambert per channel), single scattering (turquoise -> deep blue with thickness), caustic shimmer, boats as dark
// hull silhouettes at the top surface, Fresnel mirror of the land below at grazing angles, daylight haze.
const NBOAT = 24;
const UNDER_VS = `
  uniform float level, lift; varying vec3 vWP; varying float vDepth;
  float gH(vec2 p);
  void main(){ vec4 wp0 = modelMatrix*vec4(position,1.); vec2 xz = wp0.xz;
    float gh = groundH(xz); vDepth = level - gh;
    vec3 p = vec3(xz.x, min(gh, level) + lift - 0.15, xz.y); vWP = p;
    gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`;
const UNDER_FS = `
  uniform float time, level, lift, sunI, exposure, hazeD, causI, glitter;
  uniform vec3 sunDir, sunCol, skyZen, skyHor, absorb, scatThin, scatThick, landCol, bedCol, hazeCol;
  uniform sampler2D nTex; uniform vec4 boats[${NBOAT}];
  varying vec3 vWP; varying float vDepth;
  vec3 nm(vec2 uv){ return texture2D(nTex, uv).xzy*2.-1.; }
  float caus(vec2 uv, float t){ vec2 p = mod(uv*6.28318, 6.28318) - 250.; vec2 i = p; float c = 1.; const float inten = .005;
    for (int n = 0; n < 4; n++){ float tt = t*(1. - (3.5/float(n+1))); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1./length(vec2(p.x/(sin(i.x + tt)/inten), p.y/(cos(i.y + tt)/inten))); }
    c /= 4.; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.); }
  float hull(vec2 xz, float blur){ float m = 0.;
    for (int k = 0; k < ${NBOAT}; k++){ vec4 b = boats[k]; if (b.w <= 0.) continue; vec2 d = xz - b.xy; float c = cos(b.z), s = sin(b.z);
      vec2 l = vec2(c*d.x - s*d.y, s*d.x + c*d.y); l /= vec2(b.w*0.2, b.w*0.5); l.x /= 1. - 0.75*smoothstep(0.1, 1., l.y);
      m = max(m, smoothstep(1. + blur/b.w*3., 1. - blur/b.w*1.5, length(l))); }
    return m; }
  void main(){
    float gh = groundH(vWP.xz); float th = level - gh; if (th < 0.) discard;
    vec3 Vv = cameraPosition - vWP; float dist = length(Vv); vec3 V = Vv/dist;
    float e = 3.; vec3 nb = normalize(vec3(groundH(vWP.xz + vec2(e, 0.)) - groundH(vWP.xz - vec2(e, 0.)), -2.*e, groundH(vWP.xz + vec2(0., e)) - groundH(vWP.xz - vec2(0., e))));
    float fade = 1. - smoothstep(150., 1800., dist);
    vec3 dt = nm(vWP.xz/11. + vec2(time*0.012, -time*0.009)) + 0.6*nm(vWP.xz/4.3 - vec2(time*0.02, time*0.017));
    nb = normalize(nb + vec3(dt.x, 0., dt.z)*0.05*fade);
    vec3 I = -V; if (dot(I, nb) > 0.) nb = -nb;
    vec3 d1 = refract(I, nb, 1./1.333);
    float L = min(th/max(d1.y, 0.08), 60.);
    vec3 pt = vWP + d1*L;                                  // where the ray leaves through the wavy top surface
    vec3 dn = nm(pt.xz/9. + vec2(time*0.020, time*0.013)) + 0.6*nm(pt.xz/3.1 - vec2(time*0.031, -time*0.024)) + 0.8*nm(pt.xz/38. + vec2(-time*0.008, time*0.011));
    vec3 nt = normalize(vec3(0., 1., 0.) + vec3(dn.x, 0., dn.z)*0.32);
    vec3 d2 = refract(d1, -nt, 1.333); float tir = step(dot(d2, d2), 0.01);
    d2 = normalize(mix(d2, vec3(0., 1., 0.), tir));
    vec3 sky = mix(skyHor, skyZen, pow(max(d2.y, 0.), 0.5))*1.5;
    float cs = max(dot(d2, normalize(sunDir)), 0.);
    vec3 Lin = sky*(1. - 0.6*tir) + sunCol*sunI*(pow(cs, 900.)*40.*glitter + pow(cs, 60.)*1.2 + pow(cs, 8.)*0.25);
    vec3 T = exp(-absorb*L);
    float ca = caus(pt.xz/14. + vec2(0.13, 0.07)*time*0.2, time*0.35) + 0.5*caus(pt.xz/5.5 - 0.05*time, time*0.5 + 2.);
    float hm = hull(pt.xz, 0.4 + th*0.12);                 // boats on top: dark hulls through the water
    float hs = hm;
    float k = 1. - exp(-0.075*L);
    vec3 scat = mix(scatThin, scatThick, smoothstep(2., 26., th))*sunI*k*(0.8 + causI*ca*(1. - smoothstep(4., 30., th)) + 0.25*causI*ca);
    vec3 col = Lin*T*(1. - hm) + scat*(1. - 0.75*hs)*(1. - 0.55*hm);
    // the land below, mirrored at grazing angles
    float F = 0.02 + 0.98*pow(1. - clamp(dot(nb, V), 0., 1.), 5.);
    vec3 R = reflect(I, nb); vec2 gp = vWP.xz + R.xz*(vWP.y/max(-R.y, 0.05));
    float landF = smoothstep(-2., 6., groundH(gp) - level);
    col = mix(col, mix(bedCol, landCol, landF*0.5), F*0.3);
    // the thin glassy edge catches the light
    col += sunCol*sunI*0.35*smoothstep(1.2, 0.0, th)*(0.5 + 0.5*ca);
    col = mix(col, hazeCol, 1. - exp(-dist/hazeD));
    gl_FragColor = vec4(col*exposure, 1.); }`;

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
    thru: { value: 0 }, underCol: { value: new THREE.Color(1.0, 0.5, 0.2) },   // see-through Earth: core light from below
    lava: { value: 0 }, lavaI: { value: 4.0 },   // 0 = water, 1 = molten basalt (incandescent cracks, dark crust plates)
    // gravity-flip (compiled in only with o.slab; inert otherwise): the whole original sea lifted by `lift` metres, an underside
    // that mirrors the seabed, `churn` (0..1: the bay smashed to white water after the impact) and a surge (bore) over the land
    lift: { value: 0 }, churn: { value: 0 }, surgeT: { value: -1 }, surgeH: { value: 9 }, surgeR: { value: 140 }, surgeV: { value: 75 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${WGLSL}
      ${groundGLSL}
      uniform float time, amp, level; uniform mat4 texM, reflInv;
      ${o.slab ? 'uniform float lift, churn, surgeT, surgeH, surgeR, surgeV; varying float vSurge;' + SURGE_GLSL : ''}
      varying vec3 vWP; varying vec3 vN; varying float vJac; varying vec4 vRU; varying float vDepth; varying vec2 vFlat;
      void main(){
        vec4 wp0 = modelMatrix*vec4(position,1.); vec2 xz = wp0.xz;
        float gh = groundH(xz); float depth = level - gh;
        float atten = clamp(depth/6., 0.15, 1.) * smoothstep(-1., 1.5, depth);
        float dist = length(xz - cameraPosition.xz); float far = 1. - smoothstep(1500., 6000., dist);
        vec3 n; float j; vec3 p = gerstner(xz, time, amp, atten*far + 0.0001, n, j);
        ${o.slab ? SLAB_VS : ''}
        p.y += level; vWP = p; vN = n; vJac = j; vDepth = depth; vFlat = xz;
        vRU = texM * reflInv * vec4(xz.x, level${o.slab ? ' + lift' : ''}, xz.y, 1.);
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: `${NOISE}
      ${groundGLSL}
      uniform float time, amp, level, moonI, sunI, reflI, distort, foamAmt, surf, rough, glitter, exposure, thru, lava, lavaI; uniform vec3 underCol;
      ${o.slab ? 'uniform float lift, churn, surgeT; varying float vSurge;' : ''}
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
        ${o.slab ? SLAB_FS : ''}
        if (lava > 0.) {   // molten sea: cooled crust plates drift on incandescent melt; wave crests tear the crust open
          vec2 lp = vWP.xz*0.035 + vec2(time*0.006, -time*0.004);
          float n1 = fbm2(lp), n2 = fbm2(lp*2.9 + 3.1);
          float crust = smoothstep(0.30, 0.40, n1 + 0.22*n2);
          float stretch = smoothstep(0.97, 0.55, vJac) + 0.6*smoothstep(0.6, 1.6, vWP.y - level);
          float hot = clamp(1. - crust + 0.9*stretch, 0., 1.);
          float vein = pow(1. - abs(n2*2. - 1.), 7.)*(1. - 0.6*crust);
          float g2 = hot*hot*hot; vec3 lc = mix(vec3(0.016,0.009,0.007), vec3(0.95,0.13,0.02)*lavaI, g2) + vec3(1.0,0.36,0.05)*vein*lavaI*1.5*(0.35 + 0.65*hot);
          lc *= 0.8 + 0.2*sin(time*0.6 + n1*11.);
          float edge = smoothstep(0.6, 0.0, max(vDepth, 0.));                 // thin edge on the sand: brightest, fresh melt
          lc += vec3(1.0,0.32,0.05)*lavaI*0.35*edge;
          col = mix(col, lc + R*F*0.18, lava);
          a = mix(a, smoothstep(-0.05, 0.08, vDepth), lava);
        }
        if (thru > 0.) { float T = exp(-max(vDepth, 0.)/45.);                 // light through the clear seabed and the water column
          col += underCol*thru*(0.12 + 0.88*T)*(1. - F); a *= 1. - 0.8*thru*T*(1. - F); }
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
  refl.onBeforeRender = (r, sc, cam) => { const uv = under && under.visible; mesh.visible = false; if (under) under.visible = false; ob(r, sc, cam); mesh.visible = true; if (under) under.visible = uv; };
  mesh.refl = refl; mesh.U = U;
  let under = null;
  if (o.slab) {
    Object.assign(U, { skyZen: { value: new THREE.Color(0x2f6fd0) }, skyHor: { value: new THREE.Color(0xa6cdee) }, absorb: { value: new THREE.Vector3(0.32, 0.07, 0.045) },
      scatThin: { value: new THREE.Color(0x3fd6d0) }, scatThick: { value: new THREE.Color(0x0b3f8a) }, landCol: { value: new THREE.Color(0x9a8a70) }, bedCol: { value: new THREE.Color(0x1d3a3a) },
      hazeCol: { value: new THREE.Color(0xa6cdee) }, hazeD: { value: 9000 }, causI: { value: 1.4 },
      boats: { value: Array.from({ length: NBOAT }, () => new THREE.Vector4(0, 0, 0, 0)) } });
    const um = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
      vertexShader: groundGLSL + UNDER_VS.replace('float gH(vec2 p);', ''), fragmentShader: NOISE + groundGLSL + UNDER_FS });
    under = new THREE.Mesh(geo, um); under.frustumCulled = false; under.renderOrder = 9; under.visible = false;
  }
  mesh.update = (S, t) => {
    U.time.value = t;
    // follow the camera in XZ, snapped to the grid's inner spacing to avoid swimming
    const c = S.camera.position; mesh.position.set(Math.round(c.x / 4) * 4, 0, Math.round(c.z / 4) * 4);
    refl.position.y = U.level.value + U.lift.value; refl.updateMatrixWorld();
    if (under) { under.position.copy(mesh.position); under.visible = U.lift.value > 0.05; } U.reflInv.value.copy(refl.matrixWorld).invert();
  };
  return { mesh, refl, U, under, add(scene) { scene.add(refl); scene.add(mesh); if (under) scene.add(under); } };
}
