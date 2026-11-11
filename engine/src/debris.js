// Moon debris after the breakup (moon-2x s09-s11): meteors, horizon impact glows, the ring arc seen from the ground,
// and low rubble streams. Everything is a closed-form function of t (no state carried between frames), so sub-frame
// motion blur and any frame order give the same picture.
//   const M = createMeteors(S, list);   M.update(t)                 list: [{ c, v, t0, life, period?, tail, w, I, heat }]
//   meteorShower({ n, seed, centre, spread, ... })  -> list for createMeteors (parallel paths = one consistent direction)
//   const G = createImpacts(S, [{ p, t, r, dur }]);   G.update(t) -> summed glow 0.. (drive scene lights with it)
//   const A = createRingArc(S, { face, lat, r0, r1, dist, rocks });   A.update(t, camera)
//   const R = createStreams(S, [{ o, d, n, speed, spread, len, size }]);   R.update(t, camera)
import * as THREE from 'three';
import { rng } from './util.js';

// px angle (radians per canvas pixel) for min-width streaks/rocks
const pxAngOf = (S) => THREE.MathUtils.degToRad(S.camera.fov) / S.H;

// ---------------------------------------------------------------- meteors: instanced camera-facing ribbons
// a meteor's head passes point c at the middle of its life; it moves at v (world units / s). tail = seconds of path drawn.
export function createMeteors(S, list, o = {}) {
  const n = list.length;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const aC = new Float32Array(n * 3), aV = new Float32Array(n * 3), aT = new Float32Array(n * 4), aS = new Float32Array(n * 4);
  list.forEach((m, i) => { aC.set([m.c.x, m.c.y, m.c.z], i * 3); aV.set([m.v.x, m.v.y, m.v.z], i * 3);
    aT.set([m.t0, m.life, m.period ?? 0, m.end ?? 0], i * 4); aS.set([m.tail, m.w, m.I ?? 1, m.heat ?? 0.5], i * 4); });
  g.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); g.setAttribute('aV', new THREE.InstancedBufferAttribute(aV, 3));
  g.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 4)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4));
  g.instanceCount = n;
  const U = { time: { value: 0 }, pxAng: { value: 0.0004 }, gain: { value: o.gain ?? 1 }, minPx: { value: o.minPx ?? 1.4 },
    tailCol: { value: new THREE.Color(o.tailCol ?? 0xff4a10) }, headCol: { value: new THREE.Color(o.headCol ?? 0xffd2a0) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aC, aV; attribute vec4 aT, aS; uniform float time, pxAng, minPx;
      varying float vAlong, vHeadAt, vY, vI, vHeat;
      void main(){
        float lt = time - aT.x; if (aT.z > 0.) lt = mod(lt, aT.z);
        float u = lt / aT.y;
        if (u < 0. || u > 1.) { gl_Position = vec4(2., 2., 2., 1.); vI = 0.; return; }
        vec3 head = aC + aV * (lt - 0.5 * aT.y);
        float tl = min(aS.x * (aT.w > 0.5 ? 1. : 0.25 + 0.75 * smoothstep(0., 0.35, u)), lt + 0.02);
        vec3 tail = head - aV * tl;
        vec3 dir = normalize(aV);
        vec3 mid = mix(tail, head, 0.5);
        float dist = length(cameraPosition - mid);
        float w = max(aS.y, dist * pxAng * minPx);
        float Lseg = length(head - tail);
        vec3 P = mix(tail, head, position.x) + dir * position.x * w * 2.;          // head cap: 2w past the head
        vec3 side = normalize(cross(dir, cameraPosition - P));
        P += side * position.y * w * 2.;
        vAlong = position.x * (Lseg + 2. * w) / w; vHeadAt = Lseg / w; vY = position.y * 2.;
        float ign = smoothstep(0., 0.1, u), fo = 1. - smoothstep(0.82, 1., u) * (1. - aT.w);   // aT.w = 1: bolide ends on impact (no burn-out)
        vI = aS.z * ign * fo * pow(aS.y / w, 0.6); vHeat = aS.w;
        gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.);
      }`,
    fragmentShader: `uniform float gain; uniform vec3 tailCol, headCol; varying float vAlong, vHeadAt, vY, vI, vHeat;
      void main(){
        if (vI <= 0.) discard;
        float d = vAlong - vHeadAt;                                 // widths ahead of the head (+) / behind (-)
        float f = clamp(vAlong / max(vHeadAt, 1e-3), 0., 1.);       // 0 tail end .. 1 head
        float taper = mix(0.22, 0.75, f);
        float behind = 1. - step(0., d);
        float core = exp(-vY * vY / (taper * taper) * 2.2) * pow(f, 1.8) * behind;
        float halo = exp(-vY * vY * 0.7) * pow(f, 3.) * behind * 0.18;
        float head = exp(-(d * d * 1.6 + vY * vY * 1.6));
        vec3 tc = mix(tailCol * vec3(0.8, 0.5, 0.4), tailCol, f);
        vec3 hc = mix(headCol, vec3(1.0, 0.95, 0.88), vHeat * 0.6);
        vec3 col = tc * (core * 1.6 + halo) + hc * head * 3.2 + mix(tailCol, headCol, 0.5) * core * smoothstep(0.75, 1., f) * 1.2;
        gl_FragColor = vec4(col * vI * gain, 1.);
      }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 40; S.scene.add(mesh);
  return { mesh, U, list, update(t) { U.time.value = t; U.pxAng.value = pxAngOf(S); },
    // head position of meteor i at time t (null when not alive): for syncing lights/sound/impacts
    headAt(i, t) { const m = list[i]; let lt = t - m.t0; if (m.period) lt = ((lt % m.period) + m.period) % m.period; if (lt < 0 || lt > m.life) return null;
      return m.c.clone().addScaledVector(m.v, lt - 0.5 * m.life); } };
}

// a shower of parallel streaks (one consistent direction `dir`) whose mid points scatter around the camera's view.
// eye: camera position; look: unit view directions to scatter around (fan = half-angle deg); dist [d0,d1];
// speed (m/s), life [l0,l1] s, rate: meteors per second over [t0,t1]. Deterministic by seed.
export function meteorShower(o) {
  const R = rng(o.seed ?? 1), out = [];
  const { eye, look, dir, t0 = 0, t1 = 5, rate = 6, d0 = 6000, d1 = 30000, fanX = 25, fanY = 18, speed = 6000, l0 = 0.5, l1 = 1.3, minElev = 1 } = o;
  const up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(look, up).normalize(), upv = new THREE.Vector3().crossVectors(right, look).normalize();
  const N = Math.round((t1 - t0) * rate);
  for (let i = 0; i < N; i++) {
    const tm = t0 + (i + R()) / rate;                     // stratified start times (no clumps, no gaps)
    let d; let tries = 0;
    do { const ax = (R() * 2 - 1) * fanX * Math.PI / 180, ay = (R() * 2 - 1) * fanY * Math.PI / 180 + (o.biasY ?? 0) * Math.PI / 180;
      d = look.clone().addScaledVector(right, Math.tan(ax)).addScaledVector(upv, Math.tan(ay)).normalize(); } while (d.y < Math.sin(minElev * Math.PI / 180) && tries++ < 20);
    const dist = d0 * Math.pow(d1 / d0, R());
    const life = l0 + (l1 - l0) * R(), big = R();
    const sp = speed * (0.75 + 0.5 * R()) * (dist / 15000);           // farther ones move proportionally (similar screen speed)
    out.push({ c: eye.clone().addScaledVector(d, dist), v: dir.clone().multiplyScalar(sp), t0: tm, life, tail: life * (0.35 + 0.4 * R()),
      w: (o.w ?? 18) * (0.6 + 1.6 * big * big) * (dist / 15000), I: (o.I ?? 1) * (0.5 + 1.1 * big), heat: R() });
  }
  return out;
}

// ---------------------------------------------------------------- impact glows: orange domes on the far horizon
// list: [{ p: Vector3 ground point, t: time of impact, r: final radius (m), dur: fade time (s), I }]
export function createImpacts(S, list, o = {}) {
  const geo = new THREE.SphereGeometry(1, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const glowGeo = new THREE.PlaneGeometry(2, 2);
  const items = list.map((L) => {
    const U = { e: { value: 0 }, heat: { value: 1 } };
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vH; void main(){ vec4 w = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); vH = position.y; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float e, heat; varying vec3 vN; varying vec3 vV; varying float vH;
        void main(){ float mu = abs(dot(normalize(vN), normalize(vV)));
          float rim = pow(1. - mu, 2.2);                                  // bright shell edge = crisp dome outline
          float body = 0.32 + 0.9 * rim + 0.5 * (1. - vH) * (1. - vH);   // hotter at the base
          vec3 hot = vec3(1.0, 0.62, 0.22), cool = vec3(1.0, 0.26, 0.05);
          vec3 c = mix(cool, hot, clamp(heat * (0.6 + 0.4 * (1. - vH)), 0., 1.));
          gl_FragColor = vec4(c * body * e, 1.); }` });
    const dome = new THREE.Mesh(geo, mat); dome.frustumCulled = false; dome.renderOrder = 30; S.scene.add(dome);
    const GU = { e: { value: 0 } };
    const gmat = new THREE.ShaderMaterial({ uniforms: GU, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy; vec4 mv = modelViewMatrix*vec4(0.,0.,0.,1.); vec3 s = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.); mv.xy += position.xy*s.xy; gl_Position = projectionMatrix*mv; }',
      fragmentShader: `uniform float e; varying vec2 vUv; void main(){ float r = length(vUv*vec2(0.55, 1.)); float y = vUv.y;
        float g = exp(-r*r*3.2) * (y > 0. ? 1. : exp(-y*y*40.));       // sky glow above the horizon, cut at the ground
        gl_FragColor = vec4(vec3(1.0, 0.38, 0.09) * g * e, 1.); }` });
    const glow = new THREE.Mesh(glowGeo, gmat); glow.frustumCulled = false; glow.renderOrder = 29; S.scene.add(glow);
    return { L, dome, glow, U, GU };
  });
  const env = (L, t) => { const dt = t - L.t; if (dt < 0) return 0; return (1 - Math.exp(-dt / 0.09)) * Math.exp(-dt / (L.dur ?? 2.2)); };
  return { items,
    update(t) { let sum = 0;
      for (const it of items) { const L = it.L, dt = t - L.t, e = env(L, t); const vis = e > 0.002;
        it.dome.visible = it.glow.visible = vis; if (!vis) continue; sum += e * (L.I ?? 1);
        const r = L.r * (0.22 + 0.78 * (1 - Math.exp(-Math.max(dt, 0) * 1.6)));
        it.dome.position.copy(L.p); it.dome.scale.set(r, r * (L.squash ?? 0.85), r);
        it.U.e.value = e * (L.I ?? 1) * (o.domeI ?? 2.2); it.U.heat.value = Math.exp(-Math.max(dt, 0) / 0.8);
        it.glow.position.copy(L.p); it.glow.scale.set(r * 3.2, r * 2.2, 1); it.GU.e.value = e * (L.I ?? 1) * (o.glowI ?? 0.35); }
      return sum; },
    env(t) { return items.reduce((s, it) => s + env(it.L, t) * (it.L.I ?? 1), 0); } };
}

// ---------------------------------------------------------------- rock geometry (lumpy, low-poly)
export function rockGeometry(detail = 1, seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 0.75 + 0.2 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + 0.4) + 0.1 * Math.sin(v.z * 7.3 + v.x * 5.1);
    p.setXYZ(i, v.x * k * 1.2, v.y * k * 0.75, v.z * k); }
  g.computeVertexNormals(); return g;
}
function rockMaterial(o = {}) {
  const U = { sunDir: { value: new THREE.Vector3(0.5, 0.4, 0.2).normalize() }, sunI: { value: o.sunI ?? 1.6 }, hot: { value: o.hot ?? 0 }, hotDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: o.glow ?? 0 }, air: { value: new THREE.Color(0, 0, 0) }, fade: { value: o.fade ?? 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute float aTone; varying vec3 vN; varying float vT; varying float vD; void main(){ vec4 w = modelMatrix*instanceMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix*instanceMatrix)*normal); vT = aTone; vD = length(w.xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 sunDir, hotDir, air; uniform float sunI, hot, fade, glow; varying vec3 vN; varying float vT; varying float vD;
      void main(){ vec3 n = normalize(vN); float l = max(dot(n, normalize(sunDir)), 0.);
        vec3 c = vec3(0.16, 0.15, 0.14) * (0.6 + 0.8 * vT) * (0.06 + l) * sunI;
        float h = pow(max(dot(n, normalize(hotDir)), 0.), 1.5) * hot * (0.4 + 0.6 * vT);
        c += vec3(1.0, 0.36, 0.08) * h * 2.5 + vec3(1.0, 0.6, 0.25) * hot * 0.08 + vec3(0.95, 0.9, 0.82) * glow * (0.5 + vT);
        float ex = fade > 0. ? exp(-vD / fade) : 1.;
        gl_FragColor = vec4(mix(air, c, ex), 1.); }` });
  mat.U = U; return mat;
}

// ---------------------------------------------------------------- the ring arc seen from the ground
// True geometry: Earth's centre is R_E below the camera, the ring lies in the equatorial plane at r0..r1 Earth radii.
// `face` = horizontal direction ("east") where the arc rises from the horizon; lat (deg) tilts the arch toward `face x up`.
// The band and rocks are drawn at `dist` along the true directions (parallax ignored: the ring is thousands of km away).
export function createRingArc(S, o = {}) {
  const lat = (o.lat ?? 12) * Math.PI / 180, r0 = o.r0 ?? 1.3, r1 = o.r1 ?? 2.0, DIST = o.dist ?? 40000;
  const E = (o.face ?? new THREE.Vector3(0, 0, -1)).clone().setY(0).normalize(), Up = new THREE.Vector3(0, 1, 0);
  const N = new THREE.Vector3().crossVectors(Up, E).normalize();                    // "north" (arch leans to -N)
  const Q = Up.clone().multiplyScalar(Math.cos(lat)).addScaledVector(N, -Math.sin(lat));
  const C = Up.clone().multiplyScalar(-1);                                           // Earth's centre (units of R_E)
  const dirAt = (th, r, out = new THREE.Vector3()) => out.copy(C).addScaledVector(E, r * Math.cos(th)).addScaledVector(Q, r * Math.sin(th)).normalize();
  // theta range: from just below the horizon on one side to the other side
  const th0 = Math.asin(Math.min(1, 1 / (r1 * Math.cos(lat)))) - 0.08, th1 = Math.PI - th0;
  const nu = 360, nv = 12, pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const th = th0 + (th1 - th0) * i / nu, rr = r0 + (r1 - r0) * j / nv; const d = dirAt(th, rr).multiplyScalar(DIST); pos.push(d.x, d.y, d.z); uv.push(j / nv, th); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const U = { I: { value: o.I ?? 1.0 }, time: { value: 0 }, col: { value: new THREE.Color(o.color ?? 0xd9d2c4) }, warm: { value: new THREE.Color(0xff8a4a) }, spin: { value: o.spin ?? 0.004 }, shadow: { value: o.shadow ?? 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vD; void main(){ vUv = uv; vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float I, time, spin, shadow; uniform vec3 col, warm; varying vec2 vUv; varying vec3 vD;
      float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h1(i), h1(i+1.), f); }
      void main(){ float r = vUv.x, th = vUv.y - time*spin;
        // ringlets: a few sharp-edged bands and gaps, constant along the orbit (slightly banded, never foggy)
        float b = 0.5 + 0.22*sin(r*31.4 + 1.3) + 0.14*sin(r*83. + 0.4) + 0.1*(n1(r*160.) - 0.5) * 2.;
        b *= smoothstep(0.0, 0.035, r) * smoothstep(1.0, 0.94, r);
        b *= mix(0.12, 1., smoothstep(0.004, 0.012, abs(r - 0.63)));   // a dark gap
        b *= mix(0.45, 1., smoothstep(0.0, 0.02, abs(r - 0.22)));
        b *= 0.88 + 0.24 * n1(th * 300. + r * 7.);                       // clumps drifting along the orbit
        float el = vD.y;
        float hz = smoothstep(-0.002, 0.05, el);                          // fades into the horizon haze
        vec3 c = mix(warm, col, smoothstep(0.0, 0.22, el));               // reddened near the horizon
        float edgeOn = 1. + 1.4 * exp(-el * 18.);                          // thicker optical path low down
        float sh = 1. - shadow * smoothstep(0.55, 0.85, vUv.y / 3.1416) ; // optional Earth-shadow side
        gl_FragColor = vec4(c * b * I * hz * edgeOn * sh, 1.); }` });
  const band = new THREE.Mesh(g, mat); band.frustumCulled = false; band.renderOrder = -500; S.scene.add(band);
  // rocks: thousands of small instanced boulders sparkling in the band (sized in pixels at `dist`)
  const n = o.rocks ?? 5000, R = rng(o.seed ?? 9);
  const rg = rockGeometry(0, 3); const tone = new Float32Array(n); const rk = [];
  for (let i = 0; i < n; i++) { const rr = r0 + (r1 - r0) * Math.pow(R(), 0.9); rk.push({ th: th0 + (th1 - th0) * R(), r: rr, s: 0.6 + 2.2 * Math.pow(R(), 3), w: R() * 6.28 }); tone[i] = R(); }
  rg.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
  const rmat = rockMaterial({ sunI: o.rockI ?? 3.0, glow: o.rockGlow ?? 1.2 });
  const rocks = new THREE.InstancedMesh(rg, rmat, n); rocks.frustumCulled = false; rocks.renderOrder = -400; S.scene.add(rocks);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return { band, rocks, U, rockU: rmat.U, dirAt, E, N, Q,
    update(t, cam) { U.time.value = t; band.position.copy(cam.position);
      const px = pxAngOf(S) * DIST * 0.985, sp = U.spin.value;
      for (let i = 0; i < n; i++) { const k = rk[i]; dirAt(k.th + t * sp, k.r, v); if (v.y < -0.01) { m4.makeScale(0, 0, 0); rocks.setMatrixAt(i, m4); continue; }
        v.multiplyScalar(DIST * 0.985).add(cam.position); q.setFromEuler(e.set(k.w + t * 0.3, k.w * 2., 0)); m4.compose(v, q, sc.setScalar(px * k.s)); rocks.setMatrixAt(i, m4); }
      rocks.instanceMatrix.needsUpdate = true; } };
}

// ---------------------------------------------------------------- low rubble streams skimming overhead
// stream: { o: Vector3 a point on the stream's axis, d: unit direction of travel, n rocks, speed (m/s), spread (m, across),
//           len (m, length of the repeating stream), size [s0,s1] (m), glowW (m), glowI }
// Rocks wrap along the stream (closed form). Each rock trails a hot streak; a smooth orange glow ribbon runs along the stream.
export function createStreams(S, streams, o = {}) {
  const R = rng(o.seed ?? 21);
  const rg = rockGeometry(1, 7);
  const all = []; const trails = [];
  for (const st of streams) {
    const side = new THREE.Vector3().crossVectors(st.d, new THREE.Vector3(0, 1, 0)).normalize(), up2 = new THREE.Vector3().crossVectors(side, st.d).normalize();
    for (let i = 0; i < st.n; i++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * st.spread;
      const off = side.clone().multiplyScalar(Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr * 0.45);
      const sp = st.speed * (0.92 + 0.16 * R()), period = st.len / sp, ph = R() * period;
      const size = st.size[0] + (st.size[1] - st.size[0]) * Math.pow(R(), 3);
      // closed form: centre(t) = o + off + d * sp * (mod(t + ph, period) - period/2)
      const k = { o: st.o.clone().add(off), d: st.d, sp, period, ph, size, w: R() * 6.28, spin: 0.2 + R() * 0.8 };
      all.push(k);
      if (size > (st.trailMin ?? 0)) trails.push({ c: k.o.clone(), v: st.d.clone().multiplyScalar(sp), t0: -ph, life: period, period, end: 1,
        tail: (st.tail ?? 0.25) * (0.6 + 0.8 * R()), w: size * (st.trailW ?? 0.7), I: (st.trailI ?? 0.8) * (0.5 + size / st.size[1]), heat: 0.3 + 0.5 * R() });
    }
  }
  const tone = new Float32Array(all.length); for (let i = 0; i < all.length; i++) tone[i] = R();
  rg.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
  const rmat = rockMaterial({ sunI: o.sunI ?? 1.2, hot: o.hot ?? 0.8, fade: o.fade ?? 0 });
  const rocks = new THREE.InstancedMesh(rg, rmat, all.length); rocks.frustumCulled = false; S.scene.add(rocks);
  // trail head(t) = c + v*(mod(t - t0, P) - P/2) equals the rock centre because t0 = -ph
  const M = createMeteors(S, trails, { gain: o.trailGain ?? 1, minPx: 1.2 });
  // glow ribbons along each stream (camera-facing strip along the axis): smooth orange heat glow, crisp-ish core
  const ribbons = streams.map((st) => {
    const L = st.len, nseg = 200, P = [], A = [];
    for (let i = 0; i <= nseg; i++) { const s = -L / 2 + L * i / nseg; for (const y of [-1, 1]) { const p = st.o.clone().addScaledVector(st.d, s); P.push(p.x, p.y, p.z); A.push(y, i / nseg); } }
    const idx = []; for (let i = 0; i < nseg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aY', new THREE.Float32BufferAttribute(A, 2)); g.setIndex(idx);
    const U = { W: { value: st.glowW ?? st.spread * 2.5 }, I: { value: st.glowI ?? 0.6 }, dir: { value: st.d.clone() }, time: { value: 0 }, fade: { value: o.fade ?? 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec2 aY; uniform float W; uniform vec3 dir; varying float vY; varying float vS; varying float vD;
        void main(){ vec3 p = position; vec3 side = normalize(cross(dir, cameraPosition - p)); p += side * aY.x * W; vY = aY.x; vS = aY.y; vD = length(p - cameraPosition);
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float I, time, fade; varying float vY; varying float vS; varying float vD;
        void main(){ float y = abs(vY); float core = exp(-y*y*10.), wide = exp(-y*y*3.5) * 0.12;
          float ends = smoothstep(0., 0.08, vS) * smoothstep(1., 0.92, vS);
          float ex = fade > 0. ? exp(-vD / fade) : 1.;
          vec3 c = vec3(1.0, 0.42, 0.12) * core + vec3(0.9, 0.22, 0.06) * wide;
          gl_FragColor = vec4(c * I * ends * ex, 1.); }` });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 20; S.scene.add(m); return { m, U };
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return { rocks, rockU: rmat.U, trails: M, ribbons,
    update(t, cam) {
      all.forEach((k, i) => { const P = k.period; let u = ((t + k.ph) % P + P) % P - P / 2; v.copy(k.o).addScaledVector(k.d, k.sp * u);
        q.setFromEuler(e.set(k.w + t * k.spin, k.w * 1.7 + t * k.spin * 0.6, k.w)); m4.compose(v, q, sc.setScalar(k.size)); rocks.setMatrixAt(i, m4); });
      rocks.instanceMatrix.needsUpdate = true; M.update(t); for (const r of ribbons) r.U.time.value = t; } };
}
