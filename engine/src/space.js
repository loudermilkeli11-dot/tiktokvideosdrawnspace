// Space set: Earth from orbit (day map, night lights, clouds, ocean glint, atmosphere rim + shell) with a debris ring
// (banded, sunlit, shadowed by Earth), the Sun with glare, and an all-sky starfield. Units: 1 = 1 km. Earth at the origin.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
export const RE = 6371;
export function createSpace(S, o = {}) {
  const { scene } = S;
  const day = S.tex('earth_day_4096.jpg', { repeat: true }), night = S.tex('earth_night_4096.jpg', { repeat: true });
  const brc = S.tex('earth_bump_roughness_clouds_4096.jpg', { srgb: false, repeat: true });
  const sunDir = new THREE.Vector3(...(o.sunDir || [1, 0.25, 0.3])).normalize();
  // ---- stars (all-sky) ----
  const starU = { pxAng: { value: 0.0004 }, I: { value: o.stars ?? 0.35 }, mwN: { value: new THREE.Vector3(0.45, 0.35, 0.82).normalize() } };
  const stars = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ uniforms: starU, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,0.)).xyz); vec4 p = projectionMatrix*viewMatrix*vec4(cameraPosition + vD*1e6, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `${NOISE} uniform float pxAng, I; uniform vec3 mwN; varying vec3 vD;
      vec3 L(vec3 d, float sc, float dens, float br){ vec3 p = d*sc; vec3 c = floor(p); float h = h13(c); if (h < 1.-dens) return vec3(0.);
        vec3 sd = normalize(c + 0.25 + 0.5*vec3(h13(c+7.1), h13(c+3.3), h13(c+5.9))); float a = length(d - sd); float w = pxAng*0.75;
        return mix(vec3(0.75,0.85,1.), vec3(1.,0.85,0.65), h13(c+2.2)) * pow(h13(c+1.7), 6.)*br * exp(-a*a/(w*w)); }
      void main(){ vec3 d = normalize(vD); vec3 s = L(d,160.,0.06,8.) + L(d,380.,0.05,3.) + L(d,800.,0.05,1.2);
        float b = dot(d, mwN); float band = exp(-b*b/0.03); float n = fbm3(d*6.), lanes = smoothstep(0.35, 0.75, fbm3(d*11.+3.));
        s += vec3(0.55,0.6,0.75)*band*(0.35+0.9*n)*(1.-0.75*lanes*band)*0.035 + L(d,1100.,0.12*band,0.9);
        gl_FragColor = vec4(s*I, 1.); }` }));
  stars.frustumCulled = false; stars.renderOrder = -10000; scene.add(stars);
  // ---- Earth ----
  const EU = { day: { value: day }, night: { value: night }, brc: { value: brc }, sunDir: { value: sunDir }, time: { value: 0 }, cityI: { value: o.cityI ?? 1.6 }, sunI: { value: o.sunI ?? 2.6 }, cloudShift: { value: 0 },
    ringShadowI: { value: o.ring ? 0.35 : 0 }, ringN: { value: new THREE.Vector3(0, 1, 0) }, ringR: { value: new THREE.Vector2(1.15 * RE, 2.6 * RE) } };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 192, 96), new THREE.ShaderMaterial({ uniforms: EU,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D day, night, brc; uniform vec3 sunDir, ringN; uniform vec2 ringR; uniform float cityI, sunI, cloudShift, ringShadowI; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      vec3 toLin(vec3 c){ return c; }
      void main(){
        vec3 n = normalize(vN), L = normalize(sunDir), V = normalize(cameraPosition - vW);
        vec3 b = texture2D(brc, vUv).rgb; float clouds = texture2D(brc, vUv + vec2(cloudShift, 0.)).b;
        float mu = dot(n, L); float dayF = smoothstep(-0.12, 0.18, mu);
        vec3 dc = texture2D(day, vUv).rgb;
        float ocean = smoothstep(0.35, 0.6, b.g) ; // roughness map: oceans are smooth (dark in G)
        ocean = 1. - smoothstep(0.15, 0.5, b.g);
        vec3 col = dc * max(mu, 0.) * sunI;
        // ocean glint
        vec3 H = normalize(L + V); col += vec3(1.0,0.9,0.75) * pow(max(dot(n, H), 0.), 900.) * ocean * sunI * 0.5 * step(0., mu) * (1. - clouds);
        // clouds over everything
        vec3 cl = vec3(1.) * max(mu*0.9+0.1, 0.) * sunI * 1.05;
        col = mix(col, cl, clouds * 0.9 * smoothstep(-0.2, 0.05, mu));
        // night lights (dimmed under clouds), only on the night side
        vec3 nl = texture2D(night, vUv).rgb; col += nl * nl * vec3(1.0,0.75,0.45) * cityI * (1. - dayF) * (1. - clouds*0.7);
        // twilight band (reddened)
        col += vec3(1.0,0.45,0.2) * exp(-mu*mu*1400.) * 0.035 * sunI * (1. - clouds*0.5);
        // ring shadow on Earth's day side: ray from surface to the sun crosses the ring plane inside ring radii
        if (ringShadowI > 0.) { float dn = dot(L, ringN); if (abs(dn) > 1e-3) { float tt = -dot(vW, ringN)/dn; if (tt > 0.) { vec3 hp = vW + L*tt; float r = length(hp);
              float band = 0.6 + 0.4*sin(r*0.004); if (r > ringR.x && r < ringR.y) col *= 1. - ringShadowI*band; } } }
        // atmosphere rim (Fresnel), lit side blue, terminator orange
        float fr = pow(1. - max(dot(n, V), 0.), 4.);
        col += mix(vec3(1.0,0.5,0.25), vec3(0.35,0.6,1.0), smoothstep(-0.22, 0.02, mu)) * fr * smoothstep(-0.3, 0.1, mu) * sunI * 0.9;
        gl_FragColor = vec4(col, 1.); }` }));
  earth.rotation.y = o.earthYaw ?? 0; scene.add(earth);
  // atmosphere shell (additive halo beyond the limb)
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.025, 128, 64), new THREE.ShaderMaterial({ uniforms: { sunDir: EU.sunDir, sunI: EU.sunI }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir; uniform float sunI; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n = normalize(vN), V = normalize(cameraPosition - vW); float rim = pow(clamp(1. - abs(dot(n, V)), 0., 1.), 6.);
        float mu = dot(-n, normalize(sunDir)); vec3 c = mix(vec3(1.0,0.45,0.2), vec3(0.3,0.55,1.0), smoothstep(-0.2, 0.4, mu)) * smoothstep(-0.4, 0.15, mu);
        gl_FragColor = vec4(c * rim * sunI * 0.7, 1.); }` }));
  scene.add(atm);
  // ---- debris ring ----
  let ring = null; const RU = { sunDir: EU.sunDir, sunI: EU.sunI, rIn: { value: (o.ringIn ?? 1.15) * RE }, rOut: { value: (o.ringOut ?? 2.6) * RE }, I: { value: o.ringI ?? 1.0 }, time: { value: 0 } };
  if (o.ring !== false) {
    ring = new THREE.Mesh(new THREE.RingGeometry(RU.rIn.value, RU.rOut.value, 512, 8), new THREE.ShaderMaterial({ uniforms: RU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `${NOISE} uniform vec3 sunDir; uniform float sunI, rIn, rOut, I, time; varying vec3 vW;
        void main(){ float r = length(vW); float u = (r - rIn)/(rOut - rIn); if (u < 0. || u > 1.) discard;
          float a = atan(vW.z, vW.x);
          float bands = 0.35 + 0.65*fbm2(vec2(u*38., 3.7)) + 0.25*fbm2(vec2(u*160., 9.1)) - 0.12;
          bands *= 0.55 + 0.45*smoothstep(0.15, 0.45, u) * smoothstep(0.95, 0.55, u);   // brightest mid-ring
          float gaps = smoothstep(0.015, 0.045, abs(u - 0.47)) * (0.6 + 0.4*smoothstep(0.005, 0.02, abs(u - 0.74)));
          float clump = 0.75 + 0.25*fbm2(vec2(a*40., u*30.) + time*0.02);
          float dens = bands * gaps * clump * smoothstep(0., 0.08, u) * smoothstep(1., 0.82, u);
          // Earth's shadow: point is shadowed if the ray toward the sun hits the Earth sphere
          vec3 L = normalize(sunDir); float b = dot(vW, L), c = dot(vW, vW) - ${(RE * RE).toFixed(1)}; float disc = b*b - c;
          float shadow = (disc > 0. && b < 0.) ? 0.04 : 1.;
          vec3 V = normalize(cameraPosition - vW); float fwd = pow(max(dot(-V, L), 0.), 6.); // forward scattering glow
          vec3 col = vec3(0.92,0.86,0.78) * dens * (0.55 + 2.5*fwd) * sunI * 0.55 * shadow;
          gl_FragColor = vec4(col * I, clamp(dens, 0., 1.) * 0.75 * I); }` }));
    ring.rotation.x = -Math.PI / 2; ring.frustumCulled = false; scene.add(ring);
  }
  // ---- sun (disc + glare sprite) ----
  const sunG = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { I: { value: o.sunGlare ?? 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy += position.xy*(-mv.z)*0.6; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float I; varying vec2 vUv; void main(){ vec2 d = vUv-0.5; float r = length(d)*2.; float core = smoothstep(0.035, 0.02, r)*30.; float glow = exp(-r*7.)*2.5 + exp(-r*2.5)*0.3;
      float rays = pow(abs(cos(atan(d.y,d.x)*4.)), 40.)*exp(-r*3.)*0.6; gl_FragColor = vec4(vec3(1.0,0.95,0.85)*(core+glow+rays)*I*smoothstep(1.,0.6,r), 1.); }` }));
  sunG.frustumCulled = false; scene.add(sunG);
  const api = { earth, atm, ring, stars, sun: sunG, EU, RU, sunDir,
    update(S, t) {
      starU.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H; RU.time.value = t; EU.cloudShift.value = t * 0.0008;
      sunG.position.copy(S.camera.position).addScaledVector(sunDir, 5e5);
      if (ring) { EU.ringN.value.set(0, 1, 0).applyQuaternion(ring.quaternion).normalize(); EU.ringR.value.set(RU.rIn.value, RU.rOut.value); }
      stars.position.copy(S.camera.position);
    } };
  return api;
}
