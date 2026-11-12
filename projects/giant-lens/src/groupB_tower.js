// giant-lens group B: N4 melting panes on a city.js glass curtain wall (s03_tower). Pure functions of shot time tt.
//   createFacadeFX(S, { b, spotAt, wAt, cols, floors, t0, t1, seed }) -> { update(tt, lensState), panes, F, drops }
//   - a pane heat sim (precomputed at load): heating at the law's flux (1,400 K in GLASS_MELT_S under the spot), radiative cooling;
//   - panes that reach flow (1,420 °C) glow, sag and pour glowing drips that fall with g and land as burning drops;
//   - panes that only crack (thermal shock, ΔT > CRACK_K) burst out as glass shards; both leave a dark hole with ember edges;
//   - the analytic lens shadow on the facade only (the kit decal is an unbounded plane and would darken the sky above the roof).
// The window grid matches city.js exactly: glass bay 1.6 m, floor 3.6 m, pane g.x 0.06–0.94, g.y 0.08–0.90, shopfront below 5.5 m.
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';
import { rng } from '@engine/util.js';
import { GLASS_MELT_S } from './story.js';

export const BAY = 1.6, FL = 3.6;
export const T_FLOW = 1420, CRACK_K = 140;                  // °C glass flows; thermal-shock crack threshold (ΔT, K)
const RATE = 1400 / GLASS_MELT_S;                            // K/s under the full spot (story: 1,400 K in 1.53 s)
const G = 9.81;
const HEAT = `vec3 heatRamp(float u){ u = clamp(u, 0., 1.);
  vec3 c = mix(vec3(0.0), vec3(0.55,0.04,0.0), smoothstep(0.0, 0.25, u));
  c = mix(c, vec3(1.0,0.28,0.02), smoothstep(0.2, 0.5, u));
  c = mix(c, vec3(1.0,0.72,0.25), smoothstep(0.45, 0.75, u));
  return mix(c, vec3(1.0,0.97,0.9), smoothstep(0.7, 1.0, u)); }`;
export const heatN = (T) => Math.min(1, Math.max(0, (T - 420) / 1700));   // °C -> heat ramp 0..1 (1,400 °C ≈ 0.58 orange-yellow)
const COLLAPSE = 'gl_Position = vec4(2., 2., 2., 1.); return;';

export function facadeOf(b) { return { z0: b.z + b.d / 2, x0: b.x - b.w / 2, x1: b.x + b.w / 2, h: b.h, cx: b.x }; }
export function paneRect(F, k, j) { const x = F.cx + k * BAY, y = j * FL; return { x0: x + 0.06 * BAY, x1: x + 0.94 * BAY, y0: y + 0.08 * FL, y1: y + 0.9 * FL }; }
const rectDist = (r, x, y) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1));
// sag of a molten pane s seconds after it starts to flow (shared by the shader and the drip emitter)
const sagA = (s) => 3.4 * sm(s / 2.2), sagB = (s) => 0.45 * sm(s / 1.2);
function sm(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

export function createFacadeFX(S, o) {
  const F = facadeOf(o.b), R = rng(o.seed ?? 303);
  const t0 = o.t0 ?? -0.2, t1 = o.t1 ?? 4.8, DT = 1 / 240, NS = Math.ceil((t1 - t0) / DT) + 1;
  // ---- panes in the band
  const panes = [];
  for (const k of o.cols) for (const j of o.floors) { const r = paneRect(F, k, j); if (r.x0 < F.x0 + 0.3 || r.x1 > F.x1 - 0.3 || r.y1 > F.h - 0.3 || r.y0 < 5.5) continue; panes.push({ k, j, r, T: new Float32Array(NS) }); }
  // ---- heat sim (deterministic, at load): dT/dt = RATE·kernel - radiative loss (both faces, ε 0.9, 15 kg/m², c 840)
  for (const p of panes) {
    let T = 20, peak = 20, melt = 1e9, crack = 1e9;
    for (let i = 0; i < NS; i++) {
      const t = t0 + i * DT, s = o.spotAt(t).p, w = o.wAt(t), d = rectDist(p.r, s.x, s.y);
      const k = d <= 0 ? 1 : d < w / 2 ? 1 - 0.6 * (d / (w / 2)) : 0.12 * Math.exp(-(d - w / 2) / 1.0);
      const Tk = T + 273.15, loss = (2 * 0.9 * 5.67e-8 * (Math.pow(Tk, 4) - Math.pow(293, 4))) / (15 * 840);
      T = Math.min(3400, T + (RATE * k - loss) * DT); p.T[i] = T; peak = Math.max(peak, T);
      if (melt > 1e8 && T >= T_FLOW) melt = t;
      if (crack > 1e8 && T >= 20 + CRACK_K) crack = t;
    }
    p.peak = peak; p.melt = melt; p.shatter = melt < 1e8 ? 1e9 : crack < 1e8 ? crack + 0.1 + R() * 0.3 : 1e9;
    p.open = melt < 1e8 ? melt + 0.15 : p.shatter;
  }
  const Tat = (p, tt) => { const f = (Math.min(Math.max(tt, t0), t1) - t0) / DT, i = Math.min(NS - 2, Math.floor(f)), u = f - i; return p.T[i] * (1 - u) + p.T[i + 1] * u; };
  const N = panes.length, z0 = F.z0;
  const U = { time: { value: 0 }, z0: { value: z0 }, I: { value: 1 }, uPx: { value: 0.001 } };
  const aRect = new Float32Array(N * 4), aMelt = new Float32Array(N), aGone = new Float32Array(N), aOpen = new Float32Array(N), aSeed = new Float32Array(N);
  panes.forEach((p, i) => { aRect.set([p.r.x0, p.r.y0, p.r.x1 - p.r.x0, p.r.y1 - p.r.y0], i * 4); aMelt[i] = p.melt; aGone[i] = p.shatter; aOpen[i] = p.open; aSeed[i] = R(); });
  const heatAttr = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); heatAttr.setUsage(THREE.DynamicDrawUsage);
  const inst = (geo, extra = {}) => { const g = new THREE.InstancedBufferGeometry(); g.index = geo.index; g.setAttribute('position', geo.attributes.position);
    g.setAttribute('aRect', new THREE.InstancedBufferAttribute(aRect, 4)); g.setAttribute('aMelt', new THREE.InstancedBufferAttribute(aMelt, 1)); g.setAttribute('aGone', new THREE.InstancedBufferAttribute(aGone, 1));
    g.setAttribute('aOpen', new THREE.InstancedBufferAttribute(aOpen, 1)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1)); g.setAttribute('aHeat', heatAttr);
    for (const k in extra) g.setAttribute(k, extra[k]); g.instanceCount = N; return g; };
  const grid = new THREE.PlaneGeometry(1, 1, 10, 12); grid.translate(0.5, 0.5, 0);
  // ---- molten sheets (only drawn once a pane glows; sag after it flows)
  const sheet = new THREE.Mesh(inst(grid), new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `${NOISE} attribute vec4 aRect; attribute float aMelt, aGone, aHeat, aSeed; uniform float time, z0; varying float vH, vV, vU;
      void main(){ if (time >= aGone || (aHeat < 0.01 && time < aMelt)) { ${COLLAPSE} }
        float u = position.x, v = position.y, s = max(time - aMelt, 0.);
        float A = 3.4 * smoothstep(0., 2.2, s), B = 0.45 * smoothstep(0., 1.2, s), nk = smoothstep(0., 1.5, s);
        float x = aRect.x + aRect.z * (0.5 + (u - 0.5) * (1. - 0.5 * nk * pow(1. - v, 1.5)));
        float wob = vn2(vec2(u * 3.0 + aSeed * 17., s * 0.8));
        float droop = A * pow(1. - v, 1.4) * (0.7 + 0.3 * sin(3.1416 * u)) + 0.45 * A * (1. - v) * wob;
        float y = aRect.y + aRect.w * v - droop;
        float z = z0 + 0.04 + B * sin(3.1416 * clamp(1.05 - v, 0., 1.)) * sin(3.1416 * u) + 0.35 * A * pow(1. - v, 2.);
        vH = aHeat; vV = v; vU = u; gl_Position = projectionMatrix * viewMatrix * vec4(x, y, z, 1.); }`,
    fragmentShader: `${NOISE} ${HEAT} uniform float I, time; varying float vH, vV, vU;
      void main(){ float n = vn2(vec2(vU * 6., vV * 5. - time * 0.6)) * 0.5 + 0.5;
        float h = vH * (0.46 + 0.22 * n) * (0.9 + 0.15 * (1. - vV));          // molten glass reads orange (cream/white only under the spot core)
        vec3 c = vec3(0.05, 0.07, 0.08) + heatRamp(h) * (0.9 + 2.0 * h * h * h) * I;
        gl_FragColor = vec4(c, 1.); }` }));
  sheet.frustumCulled = false; S.scene.add(sheet);
  // ---- holes (dark interior, ember edges) once a pane has flowed or shattered
  const hole = new THREE.Mesh(inst(grid), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute vec4 aRect; attribute float aOpen, aHeat; uniform float time, z0; varying vec2 vL; varying float vH;
      void main(){ if (time < aOpen) { ${COLLAPSE} } vL = position.xy * aRect.zw; vH = aHeat;
        gl_Position = projectionMatrix * viewMatrix * vec4(aRect.x + position.x * aRect.z, aRect.y + position.y * aRect.w, z0 + 0.02, 1.); }`,
    fragmentShader: `${NOISE} ${HEAT} uniform float I; varying vec2 vL; varying float vH; uniform float time;
      void main(){ float e = min(min(vL.x, 1.408 - vL.x), min(vL.y, 2.952 - vL.y));
        float edge = 1. - smoothstep(0.0, 0.22, e + 0.05 * vn2(vL * 9.));
        vec3 c = vec3(0.022, 0.018, 0.016) + vec3(0.35, 0.07, 0.01) * vH * 0.5 * (1. - vL.y / 2.952);
        c += heatRamp(vH * 0.85 + 0.12) * edge * (0.25 + 5. * vH * vH * vH) * I;
        gl_FragColor = vec4(c, 1.); }` }));
  hole.frustumCulled = false; S.scene.add(hole);

  // ---- drips: glowing glass drops from the sagging sheets, falling with g, landing as burning drops
  const drops = [];
  panes.forEach((p) => { if (p.melt > 1e8) return; const n = 46;
    for (let i = 0; i < n; i++) { const s = 0.35 + 2.6 * Math.pow(i / n, 1.15) + R() * 0.05, u = 0.5 + (R() - 0.5) * 0.7 * (1 - 0.5 * sm(s / 1.5));
      const A = sagA(s), x = p.r.x0 + (p.r.x1 - p.r.x0) * u, y = p.r.y0 - A * (0.7 + 0.3 * Math.sin(Math.PI * u)) - 0.1, z = z0 + 0.1 + 0.35 * A;
      drops.push({ p: new THREE.Vector3(x, y, z), v: new THREE.Vector3((R() - 0.5) * 0.9, -1.0 - R() * 1.6, 0.3 + R() * 1.1), t0: p.melt + s, s: 0.22 + R() * 0.25, h: 0.42 + R() * 0.2 }); } });
  drops.forEach((d) => { d.tl = (d.v.y + Math.sqrt(d.v.y * d.v.y + 2 * G * d.p.y)) / G; d.land = d.p.clone().addScaledVector(d.v, d.tl); d.land.y = 0; });
  const quad = new THREE.PlaneGeometry(2, 2);
  const mkInst = (base, list, fields) => { const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position);
    for (const [name, n, f] of fields) { const a = new Float32Array(list.length * n); list.forEach((d, i) => { const v = f(d); if (n === 1) a[i] = v; else a.set(v, i * n); }); g.setAttribute(name, new THREE.InstancedBufferAttribute(a, n)); }
    g.instanceCount = list.length; return g; };
  const LAND = `float landT(vec3 p0, vec3 v){ return (v.y + sqrt(v.y * v.y + 2. * ${G.toFixed(2)} * max(p0.y, 0.))) / ${G.toFixed(2)}; }`;
  const drip = new THREE.Mesh(mkInst(quad, drops, [['aP', 3, (d) => d.p.toArray()], ['aV', 3, (d) => d.v.toArray()], ['aT0', 1, (d) => d.t0], ['aS', 1, (d) => d.s], ['aH', 1, (d) => d.h]]),
    new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `${LAND} attribute vec3 aP, aV; attribute float aT0, aS, aH; uniform float time, uPx; varying vec2 vUv; varying float vH;
        void main(){ float tau = time - aT0; vUv = position.xy; if (tau < 0.) { ${COLLAPSE} }
          float tl = landT(aP, aV), tf = min(tau, tl); vec3 p = aP + aV * tf; p.y -= 0.5 * ${G.toFixed(2)} * tf * tf;
          vec3 vel = aV; vel.y -= ${G.toFixed(2)} * tf;
          if (tau >= tl) { float age = tau - tl; vH = aH * 0.8 * exp(-age / 1.8);
            vec3 wp = p + vec3(position.x, 0., position.y) * aS * (1.7 + 0.8 * min(age * 5., 1.)); wp.y = 0.03;
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.); return; }
          vH = aH; vec4 c = viewMatrix * vec4(p, 1.), c2 = viewMatrix * vec4(p - vel * 0.05, 1.);
          float s = max(aS, 2.2 * uPx * -c.z);
          vec2 ax = c.xy - c2.xy; float L = length(ax); vec2 dr = L > 1e-6 ? ax / L : vec2(0., 1.), nr = vec2(-dr.y, dr.x);
          vec4 q = vec4((c.xy + c2.xy) * 0.5 + nr * position.x * s + dr * position.y * (0.5 * L + s), c.z, 1.);
          gl_Position = projectionMatrix * q; }`,
      fragmentShader: `${HEAT} uniform float I; varying vec2 vUv; varying float vH;
        void main(){ float k = smoothstep(1., 0.25, length(vUv)); gl_FragColor = vec4(heatRamp(vH) * (1.1 + 3.0 * vH * vH * vH) * k * I, 1.); }` }));
  drip.frustumCulled = false; drip.renderOrder = 26; S.scene.add(drip);

  // ---- shards: cracked panes burst outward as glass pieces that glint and fall
  const shards = [];
  panes.forEach((p) => { if (p.shatter > 1e8) return; const pk = Tat(p, p.shatter);
    for (let i = 0; i < 12; i++) { const ax = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      shards.push({ p: new THREE.Vector3(p.r.x0 + (p.r.x1 - p.r.x0) * R(), p.r.y0 + (p.r.y1 - p.r.y0) * R(), z0 + 0.05), v: new THREE.Vector3((R() - 0.5) * 2.4, R() * 1.6, 1.2 + R() * 3.4),
        ax, w: 4 + R() * 9, t0: p.shatter + R() * 0.06, s: 0.22 + R() * 0.4, h: heatN(pk), seed: R() }); } });
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.6, -0.5, 0, 0.7, -0.35, 0, -0.1, 0.75, 0]), 3)); tri.setIndex([0, 1, 2]);
  const shard = new THREE.Mesh(mkInst(tri, shards, [['aP', 3, (d) => d.p.toArray()], ['aV', 3, (d) => d.v.toArray()], ['aAx', 3, (d) => d.ax.toArray()], ['aT0', 1, (d) => d.t0], ['aS', 1, (d) => d.s], ['aW', 1, (d) => d.w], ['aH', 1, (d) => d.h], ['aSeed', 1, (d) => d.seed]]),
    new THREE.ShaderMaterial({ uniforms: { ...U, sun: { value: new THREE.Vector3(0, 1, 0) } }, side: THREE.DoubleSide,
      vertexShader: `${LAND} attribute vec3 aP, aV, aAx; attribute float aT0, aS, aW, aH, aSeed; uniform float time; varying vec3 vN, vW; varying float vH;
        vec3 rot(vec3 v, vec3 k, float a){ return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1. - cos(a)); }
        void main(){ float tau = time - aT0; if (tau < 0.) { ${COLLAPSE} }
          float tl = landT(aP, aV), tf = min(tau, tl); vec3 p = aP + aV * tf; p.y -= 0.5 * ${G.toFixed(2)} * tf * tf;
          float a = aW * tf + aSeed * 6.28; vec3 lp = rot(position * aS, aAx, a); vN = rot(vec3(0., 0., 1.), aAx, a);
          if (tau >= tl) { lp.y *= 0.1; p.y = 0.04; }
          vW = p + lp; vH = aH * exp(-tau / 1.4); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`,
      fragmentShader: `${HEAT} uniform vec3 sun; uniform float I; varying vec3 vN, vW; varying float vH;
        void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); if (dot(N, V) < 0.) N = -N;
          float gl = pow(max(dot(reflect(-V, N), sun), 0.), 30.);
          vec3 c = vec3(0.16, 0.24, 0.27) * (0.35 + 0.5 * max(dot(N, sun), 0.)) + vec3(1.0, 0.97, 0.9) * gl * 3.0 + heatRamp(vH) * (0.4 + 6. * vH * vH * vH) * I;
          gl_FragColor = vec4(c, 1.); }` }));
  shard.frustumCulled = false; S.scene.add(shard);

  // ---- the lens shadow on this facade only (same analytic test as lens.js createLensShadow)
  const SU = { C: { value: new THREE.Vector3() }, A: { value: new THREE.Vector3(0, 1, 0) }, Sd: { value: new THREE.Vector3(0, 1, 0) }, R: { value: 10 },
    H: { value: new THREE.Vector3(1, 0, 0) }, hl: { value: 0.9 }, dark: { value: o.dark ?? 0.5 } };
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(F.x1 - F.x0, F.h), new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 C, A, Sd, H; uniform float R, hl, dark; varying vec3 vW;
      void main(){ float t = dot(C - vW, A) / max(dot(Sd, A), 1e-3); vec3 d = vW + Sd * t - C; float r = length(d) / R; float aa = max(fwidth(r), 1e-4);
        float sh = 1. - smoothstep(1.045 - aa, 1.045 + aa, r);
        vec3 Y2 = cross(A, H); float x = dot(d, H) / R, y = dot(d, Y2) / R; float ax = max(fwidth(x), 1e-4);
        float hnd = smoothstep(1.0 - ax, 1.0 + ax, x) * (1. - smoothstep(1.4 + hl - ax, 1.4 + hl + ax, x)) * (1. - smoothstep(0.09 - ax, 0.09 + ax, abs(y)));
        gl_FragColor = vec4(vec3(mix(1., dark, max(sh, hnd))), 1.); }` }));
  shade.position.set((F.x0 + F.x1) / 2, F.h / 2, z0 + 0.01); shade.renderOrder = 19; S.scene.add(shade);

  const fx = { F, panes, drops, shards, U, sheet, hole, drip, shard, shade, Tat,
    // tt: shot time; lens: { centre, D, handleDir, sun }
    update(tt, lens) {
      U.time.value = tt; const cam = S.camera; U.uPx.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / S.H;
      panes.forEach((p, i) => { heatAttr.array[i] = heatN(Tat(p, tt)); }); heatAttr.needsUpdate = true;
      if (lens) { SU.C.value.copy(lens.centre); SU.A.value.copy(lens.sun); SU.Sd.value.copy(lens.sun); SU.R.value = lens.D / 2; SU.H.value.copy(lens.handleDir); shard.material.uniforms.sun.value.copy(lens.sun); }
    } };
  return fx;
}
