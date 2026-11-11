// Space set: Earth from orbit (day map, night lights, clouds, ocean glint, atmosphere rim + shell) with a debris ring
// (banded, sunlit, shadowed by Earth), the Sun with glare, and an all-sky starfield. Units: 1 = 1 km. Earth at the origin.
// gravity-flip additions (all OFF by default, so existing shots render identically):
//   EU.seabed 0..1   oceans gone: the exposed sea floor (dark sediment, paler shelves)      EU.cloudsI  surface clouds (1)
//   EU.surf 0..1 + EU.surfT (story s since the water landed): white surf erupting on every coast; needs o.coast (SDF)
//   EU.scar 0..1     the aftermath: scorched land, churned grey sea, embers on the night side, most lights out
//   EU.glowI + glowCol   orange light over the night side (a meteor storm)                 EU.atmI  air rim + halo (1)
//   EU.detail 0..1   procedural fine detail for close views (from low orbit)               o.seg = [w, h] sphere segments
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { texURL } from './engine.js';
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
    ringShadowI: { value: o.ring ? 0.35 : 0 }, ringN: { value: new THREE.Vector3(0, 1, 0) }, ringR: { value: new THREE.Vector2(1.15 * RE, 2.6 * RE) },
    coast: { value: null }, cloudsI: { value: 1 }, seabed: { value: 0 }, surf: { value: 0 }, surfT: { value: 0 }, scar: { value: 0 },
    glowI: { value: 0 }, glowCol: { value: new THREE.Color(1.0, 0.42, 0.12) }, atmI: { value: 1 }, detail: { value: 0 } };
  const seg = o.seg || [192, 96];
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, seg[0], seg[1]), new THREE.ShaderMaterial({ uniforms: EU,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO; void main(){ vUv = uv; vO = position; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `${NOISE} uniform sampler2D day, night, brc, coast; uniform vec3 sunDir, ringN, glowCol; uniform vec2 ringR; uniform float cityI, sunI, cloudShift, ringShadowI, cloudsI, seabed, surf, surfT, scar, glowI, atmI, detail;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vO;
      // fbm whose fine octaves fade out below the pixel footprint (fp, km per pixel): no shimmer from far, detail from near
      float dfbm(vec3 p, float lam, float fp){ float s = 0., a = 0.5, w = 0.; for (int i = 0; i < 7; i++){ float k = smoothstep(1.5*fp, 4.*fp, lam); s += a*k*(vn3(p/lam) - 0.5); w += a; p += vec3(7.1, 3.3, 5.9)*lam; lam *= 0.5; a *= 0.55; } return s/w*2.; }
      void main(){
        vec3 n = normalize(vN), L = normalize(sunDir), V = normalize(cameraPosition - vW);
        vec3 b = texture2D(brc, vUv).rgb; float clouds = texture2D(brc, vUv + vec2(cloudShift, 0.)).b * cloudsI;
        float mu = dot(n, L); float dayF = smoothstep(-0.12, 0.18, mu);
        vec3 dc = texture2D(day, vUv).rgb;
        float ocean = 1. - smoothstep(0.15, 0.5, b.g);
        float fp = length(fwidth(vW)) + 1e-4;
        if (detail > 0.) { float dn = dfbm(vO, 40., fp); dc *= 1. + detail * dn * 0.45 * (1. - ocean); }
        if (seabed > 0.) {                                  // the oceans are gone: sediment plains, paler shelves, ridges
          float shelf = smoothstep(0.045, 0.16, dc.g); float rn = fbm3(vO*0.0016), rr = 1. - abs(fbm3(vO*0.0007 + 3.1)*2. - 1.);
          vec3 sb = mix(vec3(0.075, 0.068, 0.06), vec3(0.30, 0.255, 0.19), shelf) * (0.75 + 0.5*rn) + vec3(0.05, 0.045, 0.04) * pow(rr, 6.) * (1. - shelf);
          if (detail > 0.) sb *= 1. + detail * dfbm(vO + 11., 30., fp) * 0.5;
          dc = mix(dc, sb, ocean * seabed); }
        if (scar > 0.) {                                    // after the return: scoured land, churned grey sea
          float bn = fbm3(vO*0.0011 + 5.), bk = smoothstep(0.35, 0.75, bn);
          vec3 burnt = mix(vec3(0.16, 0.12, 0.09), vec3(0.05, 0.04, 0.035), bk) * (0.8 + 0.4*fbm3(vO*0.006));
          vec3 churn = mix(vec3(0.06, 0.07, 0.075), vec3(0.24, 0.25, 0.24), smoothstep(0.45, 0.8, fbm3(vO*0.004 + 9.))) * (0.8 + 0.4*fbm3(vO*0.02 + 3.));
          dc = mix(dc, mix(mix(dc, burnt, 0.75), churn, ocean), scar); }
        vec3 col = dc * max(mu, 0.) * sunI;
        // ocean glint
        vec3 H = normalize(L + V); col += vec3(1.0,0.9,0.75) * pow(max(dot(n, H), 0.), 900.) * ocean * sunI * 0.5 * step(0., mu) * (1. - clouds) * (1. - seabed) * (1. - scar);
        // white surf on every coast at once (signed distance to the coast, km: > 0 on land)
        if (surf > 0.) { float d = texture2D(coast, vUv).r, s = surfT;
          float fl = smoothstep(0., 0.05, s), w = 7. + 12.*(1. - exp(-s/0.6));
          float wob = vn3(vO*0.015 + 7.)*0.7 + vn3(vO*0.04)*0.3, dd = d + (wob - 0.5)*w*0.9;
          float line = exp(-dd*dd/(w*w)) * (0.8 + 2.2*exp(-s/0.5)) * (0.55 + 0.9*smoothstep(0.3, 0.7, vn3(vO*0.05 + vec3(s*0.8, 0., 0.))*0.65 + vn3(vO*0.13)*0.35));   // the foam line: flares, then settles
          float reach = 8. + 32.*s + 8.*s*s;                                                     // spray sweeping out to sea
          float sea = smoothstep(-reach, -reach*0.35, d) * step(d, 0.) * (0.18 + 0.32*smoothstep(0.35, 0.75, fbm3(vO*0.012 + vec3(s*0.4))));
          float land = smoothstep(9. + 9.*s, 0., d) * step(0., d) * (0.3 + 0.25*fbm3(vO*0.02));  // the surge pushing inland
          float foam = fl * clamp(line + sea + land, 0., 3.) * (0.85 + 0.3*vn3(vO*0.08 + vec3(0., s*0.6, 0.)));
          col = mix(col, vec3(0.92, 0.96, 1.0) * max(mu*0.9 + 0.1, 0.) * sunI * 1.1, clamp(foam, 0., 1.) * surf);
          col += vec3(0.85, 0.93, 1.0) * max(foam - 1., 0.) * max(mu, 0.) * sunI * 0.5 * surf; }
        // clouds over everything
        vec3 cl = vec3(1.) * max(mu*0.9+0.1, 0.) * sunI * 1.05;
        col = mix(col, cl, clouds * 0.9 * smoothstep(-0.2, 0.05, mu));
        // night lights (dimmed under clouds), only on the night side
        vec3 nl = texture2D(night, vUv).rgb; col += nl * nl * vec3(1.0,0.75,0.45) * cityI * (1. - dayF) * (1. - clouds*0.7) * (1. - 0.85*scar);
        if (scar > 0.) { float em = smoothstep(0.62, 0.8, fbm3(vO*0.0035 + 2.)) * fbm3(vO*0.03); col += vec3(1.0, 0.32, 0.06) * em * scar * 0.5 * (1. - ocean) * (1. - dayF*0.85); }
        if (glowI > 0.) { float g = fbm3(vO*0.0012 + 4.); g = 0.25 + 2.2*g*g*g + 0.6*fbm3(vO*0.006); col += glowCol * glowI * g * (1. - dayF) * (0.6 + 0.4*(1. - ocean)); }
        // twilight band (reddened)
        col += vec3(1.0,0.45,0.2) * exp(-mu*mu*1400.) * 0.035 * sunI * (1. - clouds*0.5) * atmI;
        // ring shadow on Earth's day side: ray from surface to the sun crosses the ring plane inside ring radii
        if (ringShadowI > 0.) { float dn = dot(L, ringN); if (abs(dn) > 1e-3) { float tt = -dot(vW, ringN)/dn; if (tt > 0.) { vec3 hp = vW + L*tt; float r = length(hp);
              float band = 0.6 + 0.4*sin(r*0.004); if (r > ringR.x && r < ringR.y) col *= 1. - ringShadowI*band; } } }
        // atmosphere rim (Fresnel), lit side blue, terminator orange
        float fr = pow(1. - max(dot(n, V), 0.), 4.);
        col += mix(vec3(1.0,0.5,0.25), vec3(0.35,0.6,1.0), smoothstep(-0.22, 0.02, mu)) * fr * smoothstep(-0.3, 0.1, mu) * sunI * 0.9 * atmI;
        col += glowCol * glowI * fr * (1. - dayF) * 0.8 * atmI;
        gl_FragColor = vec4(col, 1.); }` }));
  earth.rotation.y = o.earthYaw ?? 0; scene.add(earth);
  // atmosphere shell (additive halo beyond the limb)
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.025, 128, 64), new THREE.ShaderMaterial({ uniforms: { sunDir: EU.sunDir, sunI: EU.sunI, atmI: EU.atmI, glowI: EU.glowI, glowCol: EU.glowCol }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir, glowCol; uniform float sunI, atmI, glowI; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n = normalize(vN), V = normalize(cameraPosition - vW); float rim = pow(clamp(1. - abs(dot(n, V)), 0., 1.), 6.);
        float mu = dot(-n, normalize(sunDir)); vec3 c = mix(vec3(1.0,0.45,0.2), vec3(0.3,0.55,1.0), smoothstep(-0.2, 0.4, mu)) * smoothstep(-0.4, 0.15, mu);
        c = c * sunI * 0.7 + glowCol * glowI * 0.5 * (1. - smoothstep(-0.3, 0.1, mu));
        gl_FragColor = vec4(c * rim * atmI, 1.); }` }));
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
  if (o.coast) S.pending.push(coastSDF(o.coastW ?? 2048).then((tx) => { EU.coast.value = tx; }));
  const api = { earth, atm, ring, stars, sun: sunG, EU, RU, sunDir,
    update(S, t) {
      starU.pxAng.value = THREE.MathUtils.degToRad(S.camera.fov) / S.H; RU.time.value = t; EU.cloudShift.value = t * 0.0008;
      sunG.position.copy(S.camera.position).addScaledVector(sunDir, 5e5);
      if (ring) { EU.ringN.value.set(0, 1, 0).applyQuaternion(ring.quaternion).normalize(); EU.ringR.value.set(RU.rIn.value, RU.rOut.value); }
      stars.position.copy(S.camera.position);
    } };
  return api;
}

// signed distance to the nearest coast (km; > 0 on land, < 0 at sea) from the roughness channel of the bump/roughness/clouds
// map (oceans are smooth there), by an exact 2-pass Euclidean distance transform (Felzenszwalb) with cos(latitude) spacing.
// Deterministic; well under a second at 2048 x 1024. A half-float red texture in the same equirect layout as the day map.
export function coastSDF(W = 2048) {
  const H = W / 2;
  return new Promise((res, rej) => { const img = new Image(); img.onerror = () => rej(new Error('coast: image failed')); img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, W, H); const px = cx.getImageData(0, 0, W, H).data; const land = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) land[i] = px[i * 4 + 1] > 110 ? 1 : 0;
    const dy = Math.PI * RE / H, BIG = 1e20, N = 2 * W;
    const f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1);
    const pass = (n, s2) => { let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
      for (let q = 1; q < n; q++) { let r = v[k], s = ((f[q] + s2 * q * q) - (f[r] + s2 * r * r)) / (2 * s2 * (q - r));
        while (s <= z[k]) { k--; r = v[k]; s = ((f[q] + s2 * q * q) - (f[r] + s2 * r * r)) / (2 * s2 * (q - r)); }
        k++; v[k] = q; z[k] = s; z[k + 1] = Infinity; }
      k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const r = v[k]; d[q] = s2 * (q - r) * (q - r) + f[r]; } };
    const edt = (target) => {             // squared distance (km^2) from every texel to the nearest texel with land == target
      const D = new Float64Array(W * H);
      for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = land[y * W + x] === target ? 0 : BIG; pass(H, dy * dy); for (let y = 0; y < H; y++) D[y * W + x] = d[y]; }
      for (let y = 0; y < H; y++) { const lat = (0.5 - (y + 0.5) / H) * Math.PI, dx = Math.max(2 * Math.PI * RE * Math.cos(lat) / W, 0.5);
        for (let x = 0; x < N; x++) f[x] = D[y * W + ((x - W / 2 + W) % W)]; pass(N, dx * dx);   // the row plus half a row of wrap each side
        for (let c = 0; c < W; c++) D[y * W + c] = d[c + W / 2]; }
      return D; };
    const toSea = edt(0), toLand = edt(1), out = new Uint16Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;      // data row 0 = south (uv.y = 0)
      const sd = land[i] ? Math.sqrt(toSea[i]) - 0.5 * dy : -(Math.sqrt(toLand[i]) - 0.5 * dy);
      out[(H - 1 - y) * W + x] = THREE.DataUtils.toHalfFloat(Math.max(-3000, Math.min(3000, sd))); }
    const tx = new THREE.DataTexture(out, W, H, THREE.RedFormat, THREE.HalfFloatType);
    tx.wrapS = THREE.RepeatWrapping; tx.wrapT = THREE.ClampToEdgeWrapping; tx.magFilter = tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true; res(tx); };
    img.src = texURL('earth_bump_roughness_clouds_4096.jpg'); });
}
