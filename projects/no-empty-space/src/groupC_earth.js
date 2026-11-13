// no-empty-space group C: N3 THE EARTH SQUEEZE (s09) in space.js units (1 unit = 1 km, Earth centre at the origin).
// Sharp by construction: the crust is space.js's OWN Earth shader (the same 4k day map, ocean glint, atmosphere rim) drawn on
// an icosphere cut into ~34 THICK plates (jagged Voronoi cells, hot rock side walls). Over SQZ.earth (52.0 -> 55.0) every plate
// falls inward along the counter's curve (k = implodeK, radius RE(1-k) + R_MINI k: the same curve the kit's shards use), each
// with its own late start and a small tilt, so the crust breaks into stepped plates with glowing seams; a white-gold core
// shows through the seams; the oceans tear into white spray streaks that lag behind the falling crust; the cloud shell lags
// longest, tears and is pulled in last; the air halo fades; it ends as a white-gold point (the bead). Pure functions of film time.
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';
import { rng } from '@engine/util.js';
import { SQZ, R_MINI, K_POW } from './story.js';

export const RE = 6371;
const RM = R_MINI / 1000;                                              // km
const kOf = (film, delay = 0) => { const q = SQZ.earth, u = Math.min(1, Math.max(0, (film - q.T - delay) / (q.dur - delay))); return Math.pow(u, K_POW); };
export const radiusAt = (film, delay = 0) => { const k = kOf(film, delay); return RE * (1 - k) + RM * k; };
const uvOf = (d) => { let u = Math.atan2(d.z, -d.x) / (2 * Math.PI); if (u < 0) u += 1; return [u, 1 - Math.acos(Math.max(-1, Math.min(1, d.y))) / Math.PI]; };

// SP: createSpace handle (ring: false). o: { plates 34, detail 60, th 0.07 (RE), seed }
export function createEarthSqueeze(S, SP, o = {}) {
  const R = rng(o.seed ?? 909), NP = o.plates ?? 34, th = o.th ?? 0.07, T = SQZ.earth.T, DUR = SQZ.earth.dur;
  SP.earth.visible = false; SP.EU.cloudsI.value = 0;                  // the crust draws the planet; the cloud shell draws the clouds
  // ---- plate seeds (jittered Fibonacci sphere) and per-plate motion
  const seeds = [], plates = [];
  for (let i = 0; i < NP; i++) { const y = 1 - (2 * (i + 0.5)) / NP, r = Math.sqrt(1 - y * y), a = i * 2.39996 + (R() - 0.5) * 0.5;
    seeds.push(new THREE.Vector3(Math.cos(a) * r, y + (R() - 0.5) * 0.08, Math.sin(a) * r).normalize()); }
  seeds.forEach((s, i) => { const ax = new THREE.Vector3().crossVectors(s, new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5)).normalize();
    plates.push({ c: s, ax, tilt: (R() < 0.5 ? -1 : 1) * (0.08 + 0.16 * R()), delay: 1.0 * Math.pow(R(), 1.2), push: 0.003 + 0.004 * R(), pos: [], nrm: [], uv: [], wpos: [], wd: [] }); });
  const wob = (d, i) => 1 + 0.22 * (Math.sin(d.x * 9.1 + i) * Math.sin(d.y * 7.7 + 2 * i) * Math.sin(d.z * 8.3 + 0.5 * i)) + 0.08 * Math.sin(d.x * 23 + d.y * 19 + d.z * 21 + i);
  const plateOf = (d) => { let best = 0, bd = 1e9; seeds.forEach((s, i) => { const a = Math.acos(Math.max(-1, Math.min(1, d.dot(s)))) * wob(d, i); if (a < bd) { bd = a; best = i; } }); return best; };
  // ---- the icosphere crust
  const ico = new THREE.IcosahedronGeometry(1, o.detail ?? 60), P = ico.attributes.position, nf = P.count / 3;
  const key = (v) => `${Math.round(v.x * 1e5)},${Math.round(v.y * 1e5)},${Math.round(v.z * 1e5)}`;
  const faceP = new Int16Array(nf), edges = new Map(), A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), cen = new THREE.Vector3();
  for (let f = 0; f < nf; f++) {
    A.fromBufferAttribute(P, 3 * f).normalize(); B.fromBufferAttribute(P, 3 * f + 1).normalize(); Cc.fromBufferAttribute(P, 3 * f + 2).normalize();
    cen.copy(A).add(B).add(Cc).normalize(); const pi = plateOf(cen); faceP[f] = pi; const pl = plates[pi];
    const vs = [A, B, Cc], uvs = vs.map(uvOf); const us = uvs.map((q) => q[0]);
    if (Math.max(...us) - Math.min(...us) > 0.5) uvs.forEach((q) => { if (q[0] < 0.5) q[0] += 1; });            // the date-line seam
    if (Math.abs(cen.y) > 0.995) { const uc = uvOf(cen)[0]; uvs.forEach((q) => { q[0] = uc; }); }               // the poles
    vs.forEach((v, k) => { pl.pos.push(v.x * RE, v.y * RE, v.z * RE); pl.nrm.push(v.x, v.y, v.z); pl.uv.push(uvs[k][0], uvs[k][1]); });
    for (const [p, q] of [[A, B], [B, Cc], [Cc, A]]) { const kk = [key(p), key(q)].sort().join('|'); const e = edges.get(kk); if (e) e.push(f); else edges.set(kk, [f, p.clone(), q.clone()]); }
  }
  // side walls along every plate boundary (both plates get one), r = 1 -> 1 - th, aD = depth fraction 0 (surface) -> 1
  for (const e of edges.values()) { if (e.length < 4) continue; const [f0, p, q, f1] = e; if (faceP[f0] === faceP[f1]) continue;
    for (const pi of [faceP[f0], faceP[f1]]) { const W = plates[pi].wpos, D = plates[pi].wd, i = 1 - th;
      const quad = [[p, 1, 0], [q, 1, 0], [q, i, 1], [p, 1, 0], [q, i, 1], [p, i, 1]];
      quad.forEach(([v, s, d]) => { W.push(v.x * s * RE, v.y * s * RE, v.z * s * RE); D.push(d); }); } }
  // ---- materials: crust = space.js's Earth shader; walls = hot rock; core = white-gold
  const hotU = { sunDir: SP.EU.sunDir, heat: { value: 0 } };
  const hotM = new THREE.ShaderMaterial({ uniforms: hotU, side: THREE.DoubleSide,
    vertexShader: `attribute float aD; varying float vD; varying vec3 vW; void main(){ vD = aD; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir; uniform float heat; varying float vD; varying vec3 vW;
      void main(){ vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); float dif = abs(dot(n, normalize(sunDir)));
        vec3 rock = mix(vec3(0.42, 0.33, 0.25), vec3(0.22, 0.16, 0.12), smoothstep(0., 0.5, vD)) * (0.25 + 1.1*dif);
        float strata = 0.85 + 0.15*step(0.5, fract(vD*7.));
        vec3 hot = mix(vec3(1.0, 0.42, 0.12)*2.2, vec3(1.0, 0.86, 0.6)*5.0, smoothstep(0.55, 1.0, vD));
        gl_FragColor = vec4(mix(rock*strata, hot, smoothstep(0.2, 0.95, vD)*heat), 1.); }` });
  plates.forEach((pl) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pl.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(pl.nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(pl.uv, 2));
    const grp = new THREE.Group(); grp.matrixAutoUpdate = false; grp.add(new THREE.Mesh(g, SP.earth.material));
    if (pl.wpos.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pl.wpos, 3)); wg.setAttribute('aD', new THREE.Float32BufferAttribute(pl.wd, 1)); grp.add(new THREE.Mesh(wg, hotM)); }
    grp.children.forEach((m) => { m.frustumCulled = false; }); S.scene.add(grp); pl.grp = grp; });
  const coreU = { I: { value: 0 } };
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(RE, 5), new THREE.ShaderMaterial({ uniforms: coreU,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float I; varying vec3 vN; varying vec3 vW; void main(){ float f = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
      gl_FragColor = vec4(mix(vec3(1.0, 0.62, 0.22), vec3(1.0, 0.93, 0.78), f)*I, 1.); }` }));
  core.frustumCulled = false; S.scene.add(core);
  // ---- the cloud shell (same texture channel and lighting as space.js's clouds), lagging, tearing
  const cloudU = { brc: SP.EU.brc, cloudShift: SP.EU.cloudShift, sunDir: SP.EU.sunDir, sunI: SP.EU.sunI, tear: { value: 0 }, op: { value: 1 } };
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(RE * 1.006, 256, 128), new THREE.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vO; void main(){ vUv = uv; vO = normalize(position); vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `${NOISE} uniform sampler2D brc; uniform vec3 sunDir; uniform float cloudShift, sunI, tear, op; varying vec2 vUv; varying vec3 vN; varying vec3 vO;
      void main(){ float c = texture2D(brc, vUv + vec2(cloudShift, 0.)).b; float mu = dot(normalize(vN), normalize(sunDir));
        float n = fbm3(vO*7.) * 0.7 + fbm3(vO*23.)*0.3; c *= smoothstep(tear - 0.12, tear + 0.02, n);
        vec3 col = vec3(1.)*max(mu*0.9 + 0.1, 0.)*sunI*1.05; gl_FragColor = vec4(col, c*0.9*smoothstep(-0.2, 0.05, mu)*op); }` }));
  clouds.renderOrder = 2; S.scene.add(clouds);
  // ---- ocean spray streaks: random directions, kept only over the ocean (the same channel space.js reads), lagging the crust
  const NS = o.spray ?? 13000, aN = new Float32Array(NS * 4), aL = new Float32Array(NS * 4);
  for (let i = 0; i < NS; i++) { const z = 2 * R() - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - z * z); aN.set([Math.cos(a) * r, z, Math.sin(a) * r, R()], i * 4);
    aL.set([0.05 + 0.16 * R(), 0.012 + 0.03 * R(), 16 + 22 * R(), 0.4 + 1.2 * R()], i * 4); }                // lag s, lift (RE), width km, spin
  const sg = new THREE.InstancedBufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  sg.setAttribute('aN', new THREE.InstancedBufferAttribute(aN, 4)); sg.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 4)); sg.instanceCount = NS;
  const sprU = { film: { value: 0 }, T: { value: T }, dur: { value: DUR }, brc: SP.EU.brc, sunDir: SP.EU.sunDir, kp: { value: K_POW }, rm: { value: RM } };
  const spray = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: sprU, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aN; attribute vec4 aL; uniform float film, T, dur, kp, rm; uniform sampler2D brc; varying float vA; varying float vL;
      float kAt(float t){ float u = clamp((t - T)/dur, 0., 1.); return pow(u, kp); }
      void main(){ vec3 d = normalize(aN.xyz); float lag = aL.x;
        vec2 uv = vec2(atan(d.z, -d.x)/6.2831853, 1. - acos(clamp(d.y, -1., 1.))/3.14159265); uv.x = fract(uv.x);
        float ocean = 1. - smoothstep(0.15, 0.5, texture2D(brc, uv).g);
        float a = film - T - 0.1 - lag*0.6; if (ocean < 0.6 || a < 0. || film > T + dur + lag) { gl_Position = vec4(2., 2., 2., 1.); return; }
        float k = kAt(film - lag), k2 = kAt(film - lag + 0.04); float ang = aL.w*k;
        d = vec3(cos(ang)*d.x - sin(ang)*d.z, d.y, sin(ang)*d.x + cos(ang)*d.z);
        float r = (${RE}.*(1. - k) + rm*k) * (1. + aL.y*sin(3.14159*clamp(a/0.9, 0., 1.))*(1. - k));
        float spd = max(0., ${RE}.*(k2 - k)/0.04);                                         // km/s inward
        float len = clamp(spd*0.035, 50., 420.) * (1. - k*0.85), w = aL.z * (1. - 0.6*k);
        vec3 c = d*r; vec3 V = normalize(cameraPosition - c); vec3 side = normalize(cross(d, V));
        vec3 p = c + side*position.x*w + d*position.y*len;                                 // trails outward behind the inward-moving head
        vA = smoothstep(0., 0.25, a)*(1. - smoothstep(0.45, 0.8, k)); vL = position.y;
        gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 sunDir; varying float vA; varying float vL; void main(){ if (vA <= 0.01) discard; vec3 c = mix(vec3(0.95, 0.98, 1.0)*1.7, vec3(0.75, 0.88, 1.0)*0.9, vL);
      gl_FragColor = vec4(c*vA, 1.); }` }));
  spray.frustumCulled = false; spray.renderOrder = 3; S.scene.add(spray);
  // ---- the bead (a camera-facing radial glow; min size in design px so the point always reads)
  const beadU = { I: { value: 0 }, col: { value: new THREE.Color(0xffe2a8) } };
  const bead = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: beadU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv*2. - 1.; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
    fragmentShader: `uniform float I; uniform vec3 col; varying vec2 vUv; void main(){ float d = length(vUv); if (d > 1.) discard;
      float core = smoothstep(0.3, 0.0, d), halo = pow(max(0., 1. - d), 3.)*0.55; gl_FragColor = vec4((col*halo + vec3(1., 0.97, 0.9)*core)*I, 1.); }` }));
  bead.frustumCulled = false; bead.renderOrder = 60; S.scene.add(bead);
  const M4 = new THREE.Matrix4(), Mt = new THREE.Matrix4(), Mr = new THREE.Matrix4(), Ms = new THREE.Matrix4(), Mg = new THREE.Matrix4();
  const beadI = (film) => { const a = (film - (T + 0.55 * DUR)) / (0.45 * DUR); if (a < 0) return 0; if (a < 1) return 9 * a * a; return 9 * (0.6 + 0.4 * Math.exp(-2.5 * (film - T - DUR))); };
  return { plates, core, clouds, spray, bead, radiusAt,
    update(film, cam) {
      const crack = Math.max(0, Math.min(1, (film - T) / 0.35)), crackOut = Math.sin(Math.PI * Math.min(1, crack)) * (film < T + 0.6 ? 1 : 0);
      let rmin = RE;
      plates.forEach((pl) => { const k = kOf(film, pl.delay), r = RE * (1 - k) + RM * k; rmin = Math.min(rmin, r);
        const s = (r / RE) * (1 + pl.push * crackOut), ang = pl.tilt * (0.25 * crack + 2.2 * k * (1 - k) + 0.5 * k);
        const g = 1 - (0.022 * crack + 0.09 * k);                          // each plate draws in about its own centre: glowing seams open
        const cp = pl.c.clone().multiplyScalar(RE);
        Mt.makeTranslation(cp.x, cp.y, cp.z); Mr.makeRotationAxis(pl.ax, ang); M4.multiplyMatrices(Mt, Mr).multiply(Mg.makeScale(g, g, g)).multiply(Ms.makeTranslation(-cp.x, -cp.y, -cp.z));
        pl.grp.matrix.copy(Ms.makeScale(s, s, s).multiply(M4)); pl.grp.matrixWorldNeedsUpdate = true;
        pl.grp.visible = r > 0.6; });
      const k = kOf(film);
      hotU.heat.value = Math.min(1, crack * 0.8 + 1.5 * k);
      core.scale.setScalar(Math.max(RM, rmin * (1 - th) * 0.985) / RE); coreU.I.value = film < T ? 0 : 1.6 + 4 * k; core.visible = film >= T && rmin > 0.6;
      const kc = kOf(film, 0.45); clouds.scale.setScalar(Math.max(RM, RE * 1.006 * (1 - kc) + RM * kc) / (RE * 1.006)); cloudU.tear.value = -0.2 + 1.4 * Math.pow(kc, 0.6); clouds.visible = kc < 0.995;
      SP.atm.scale.setScalar(Math.max(1e-4, (1 - kc) + (RM / RE) * kc)); SP.EU.atmI.value = 1 - Math.pow(kc, 0.5); SP.atm.visible = kc < 0.995;
      sprU.film.value = film;
      const I = beadI(film); bead.visible = I > 0;
      if (I > 0 && cam) { const dist = cam.position.length(), pxW = (2 * dist * Math.tan((cam.fov * Math.PI / 180) / 2)) / 960;
        bead.position.set(0, 0, 0); bead.quaternion.copy(cam.quaternion); bead.scale.setScalar(Math.max(RM, 9 * pxW) * 3 * (0.6 + 0.4 * Math.min(1, I / 9))); beadU.I.value = I; }
    } };
}
