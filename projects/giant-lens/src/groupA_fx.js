// giant-lens GROUP A helpers (s01, s02, s09). Builder A owns this file.
//   createWisps(S, pts, o) : thin dark wisps off a char line / a burning roof (NOT fluffy smoke): vertical camera-facing
//                            streaks, warped by noise, each with its own start time (same clock as update).
//   beamOnto(rig, st, hit) : place the lens + its shadow by the GROUND target (lens centre = ground target + SUN·D), then
//                            draw the beam/spot on the first surface the sunline meets (car roof, canopy). The lens drifts
//                            smoothly while the spot jumps onto roofs (the spot sits ≤ 2 m nearer the glass: inside the
//                            dramatization; the counter still reads the law's 3,500 °C).
//   rayHit(g, boxes, spheres): first hit along the sunline above ground point g (cab/body tops, canopy spheres).
//   fleeCrowd(list, spotXZ, o): precompute each person's escape (start time, direction, speed) from the spot path; apply(tt).
//   burnRuns(S, hitAt, t0, t1, o): N3 burn ribbons, one per contiguous surface run (ground / a roof); canopies skipped.
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';
import { rng } from '@engine/util.js';
import { SUN } from './kit.js';
import { createBurn } from './lens.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- thin dark wisps
// pts: [{ p: Vector3 base, h: height m, w: width m, t0, grow 0.6, a: opacity 0.35, seed }]
export function createWisps(S, pts, o = {}) {
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const N = pts.length, aP = new Float32Array(N * 3), aH = new Float32Array(N), aW = new Float32Array(N), aT0 = new Float32Array(N), aG = new Float32Array(N), aA = new Float32Array(N), aK = new Float32Array(N);
  pts.forEach((q, i) => { q.p.toArray(aP, i * 3); aH[i] = q.h; aW[i] = q.w ?? 0.5; aT0[i] = q.t0 ?? 0; aG[i] = q.grow ?? 0.6; aA[i] = q.a ?? 0.35; aK[i] = q.seed ?? (i * 0.618) % 1; });
  for (const [k, a, n] of [['aP', aP, 3], ['aH', aH, 1], ['aW', aW, 1], ['aT0', aT0, 1], ['aG', aG, 1], ['aA', aA, 1], ['aK', aK, 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, n));
  g.instanceCount = N;
  const U = { time: { value: 0 }, col: { value: new THREE.Color(o.col ?? 0x16130f) }, I: { value: o.I ?? 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute vec3 aP; attribute float aH, aW, aT0, aG, aA, aK; uniform float time; varying vec2 vUv; varying float vK, vA, vAmt;
      void main(){ vUv = uv; vK = aK; vA = aA;
        float amt = smoothstep(aT0, aT0 + aG, time); vAmt = amt;
        vec3 toC = cameraPosition - aP; toC.y = 0.; toC = normalize(toC + vec3(1e-4, 0., 0.));
        vec3 rt = normalize(cross(vec3(0., 1., 0.), toC));
        float lean = (position.y) * (position.y) * 0.25 * sin(aK * 31.);                 // a little drift as it rises
        vec3 w = aP + rt * (position.x * aW * (0.6 + 1.2 * position.y) + lean * aH * 0.2) + vec3(0., position.y * aH * (0.35 + 0.65 * amt), 0.);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `${NOISE} uniform float time, I; uniform vec3 col; varying vec2 vUv; varying float vK, vA, vAmt;
      void main(){ float y = vUv.y;
        float n = fbm2(vec2(y * 2.2 - time * 0.9 + vK * 13., vK * 7.));
        float u = (vUv.x - 0.5) + (n - 0.5) * 0.7 * y;
        float wd = 0.07 + 0.16 * y;
        float a = exp(-(u * u) / (wd * wd)) * smoothstep(0.0, 0.12, y) * pow(1. - y, 1.6);
        a *= 0.65 + 0.35 * fbm2(vec2(vUv.x * 4. + vK, y * 5. - time * 1.6));
        a *= vA * vAmt * I;
        gl_FragColor = vec4(col * a, a); }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 24; S.scene.add(mesh);
  return { mesh, U, update(t) { U.time.value = t; } };
}

// ---------------------------------------------------------------- sunline hits
// boxes: [{ id, min: Vector3, max: Vector3 }] (axis-aligned tops; the top face is what the beam meets from 65° up)
// spheres: [{ id, c: Vector3, r }]. Returns { p, n, id } (id 'ground' on the paving).
export function rayHit(g, boxes = [], spheres = [], sun = SUN) {
  // the light comes DOWN the sunline, so the first surface it meets is the hit farthest from the ground (largest s)
  let best = null, bt = 0;
  for (const b of boxes) {                                     // ray from g along +sun: p = g + sun·s; top face at y = max.y
    const s = b.max.y / sun.y, x = g.x + sun.x * s, z = g.z + sun.z * s;
    if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && s > bt) { bt = s; best = { p: new THREE.Vector3(x, b.max.y, z), n: UP.clone(), id: b.id }; }
  }
  for (const c of spheres) {
    const oc = g.clone().sub(c.c), bq = oc.dot(sun), cq = oc.lengthSq() - c.r * c.r, d = bq * bq - cq;
    if (d < 0) continue; const s = -bq + Math.sqrt(d);
    if (s > bt) { bt = s; const p = g.clone().addScaledVector(sun, s); best = { p, n: p.clone().sub(c.c).normalize(), id: c.id }; }
  }
  return best ?? { p: new THREE.Vector3(g.x, 0, g.z), n: UP.clone(), id: 'ground' };
}

// lens + shadow by the ground target g; beam + spot on the hit surface
export function beamOnto(rig, st, hit) {
  rig.set({ ...st, n: UP });
  const C = Math.min(st.C, 11556), w = rig.w;
  rig.beam.set({ spot: hit.p, lensC: rig.centre, D: st.D, w, n: hit.n, C, heat: st.heat ?? 1, glowR: st.glowR ?? Math.max(w * 2.5, st.D * 0.012),
    beamI: st.beamI, coreI: st.coreI, discI: st.discI, glowI: st.glowI, minPx: st.minPx, t: st.t, visible: st.visible });
}

// ---------------------------------------------------------------- N3 runs (one ribbon per surface run)
export function burnRuns(S, hitAt, t0, t1, o = {}) {
  const dt = 0.01, runs = []; let cur = null;
  for (let t = t0; t <= t1 + 1e-6; t += dt) {
    const id = hitAt(t).id, ok = !(o.skip ?? ((k) => k.startsWith('tree')))(id);
    if (ok && cur && cur.id === id) cur.t1 = t;
    else { if (cur) runs.push(cur); cur = ok ? { id, t0: t, t1: t } : null; }
  }
  if (cur) runs.push(cur);
  return runs.filter((r) => r.t1 - r.t0 > 0.04).map((r) => createBurn(S, { spotAt: hitAt, t0: r.t0, t1: r.t1, n: Math.max(20, Math.round((r.t1 - r.t0) * 160)), width: o.width ?? 0.6,
    glowS: o.glowS ?? 3, lift: r.id === 'ground' ? 0.02 : 0.015 }));
}

// ---------------------------------------------------------------- the crowd runs clear of the spot
// list: crowd records (mutated: x/z/yaw per frame from x0/z0/yaw0). spotXZ(tt) -> [x, z]. o: { R 13, tMin, tMax, seed }
export function fleeCrowd(lists, spotXZ, o = {}) {
  const R0 = o.R ?? 13, T0 = o.tMin ?? 0.5, T1 = o.tMax ?? 4.6, r = rng(o.seed ?? 77), all = [];
  for (const list of lists) for (const p of list) {
    if (p.x0 === undefined) { p.x0 = p.x; p.z0 = p.z; p.yaw0 = p.yaw || 0; }
    const R = R0 * (0.75 + 0.5 * r()), react = 0.12 + 0.45 * r(), v = 2.8 + 2.6 * r(), side = (r() - 0.5) * 0.7;
    p.flee = null;
    for (let t = T0; t <= T1; t += 0.05) {
      const [sx, sz] = spotXZ(t), dx = p.x0 - sx, dz = p.z0 - sz, d = Math.hypot(dx, dz);
      if (d < R) { const a = Math.atan2(dz, dx) + side; p.flee = { t: t + react, dx: Math.cos(a), dz: Math.sin(a), v }; break; }
    }
    all.push(p);
  }
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  return { apply(tt) {
    for (const p of all) {
      const f = p.flee; if (!f || tt <= f.t) { p.x = p.x0; p.z = p.z0; p.yaw = p.yaw0; continue; }
      const u = tt - f.t, acc = 0.35, d = u < acc ? (f.v * u * u) / (2 * acc) : f.v * (u - acc / 2);
      p.x = p.x0 + f.dx * d; p.z = p.z0 + f.dz * d;
      const yr = Math.atan2(-f.dx, -f.dz), k = Math.min(1, u / 0.3); p.yaw = p.yaw0 + wrap(yr - p.yaw0) * k * k * (3 - 2 * k);
    }
  } };
}
