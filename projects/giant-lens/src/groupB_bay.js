// giant-lens group B: bay helpers for s04_bay and s05_town. Pure functions of the clock you pass (shot time tt).
//   pathFn(segs)              : piecewise spot path [{ t0, t1, a: Vector3, b: Vector3, ease, water, via? }] -> (tt) => { p, water }
//   boilParts(spotAt, o)      : N5 boil jet: white droplet jets + clumps rising from every water point the spot crosses (splash.js
//                               createSpray parts, kinds 0/1 only: crisp droplets, never a fluffy veil)
//   createFoam(S, spotAt, o)  : a white boiling-wake ribbon on the water behind the spot (appears on passage, fades)
//   createSeaShadow(S, o)     : the lens shadow on a horizontal plane at height h, depth test OFF so it lies over the wavy sea, the
//                               pier deck and the low shore (camera must be above h). Same analytic test as lens.js createLensShadow.
//   hideFromMirror(ocean, meshes), passTime(spotAt, p, t0, t1): when the spot passes nearest to p
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';
import { rng } from '@engine/util.js';
import { createLensShadow } from './lens.js';

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const EASE = { lin: (u) => u, io: sm, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), in3: (u) => u * u * u };
// quadratic Bézier through an optional control point `via`
export function pathFn(segs) {
  return (tt) => {
    let s = segs[0]; if (tt >= segs[segs.length - 1].t1) s = segs[segs.length - 1]; else for (const q of segs) if (tt < q.t1) { s = q; break; }
    const u = (EASE[s.ease ?? 'lin'])(Math.min(1, Math.max(0, (tt - s.t0) / (s.t1 - s.t0))));
    const p = s.via ? s.a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(s.via, 2 * u * (1 - u)).addScaledVector(s.b, u * u) : s.a.clone().lerp(s.b, u);
    return { p, water: !!s.water };
  };
}
export function passTime(spotAt, p, t0, t1, dt = 1 / 240) {
  let best = 1e9, bt = t0; for (let t = t0; t <= t1; t += dt) { const q = spotAt(t).p, d = Math.hypot(q.x - p.x, q.z - p.z); if (d < best) { best = d; bt = t; } }
  return { t: bt, d: best };
}
export function hideFromMirror(ocean, meshes) {
  const ob = ocean.refl.onBeforeRender;
  ocean.refl.onBeforeRender = (r, sc, cam) => { const vis = meshes.map((m) => m.visible); meshes.forEach((m) => { m.visible = false; }); ob(r, sc, cam); meshes.forEach((m, i) => { m.visible = vis[i]; }); };
}

// ---------------------------------------------------------------- N5: boil jet (createSpray parts)
// o: { t0, t1 (emission window, same clock as spray.update), rate 90 /s, w (spot diameter, m), k (scale: 1 = s04 6 m spot), seed }
// The jet is the sea flashing to steam under 11.6 MW/m²: a thin vertical core of droplets, ragged white clumps, a low ring of spray.
export function boilParts(spotAt, o) {
  const R = rng(o.seed ?? 515), parts = [], k = o.k ?? 1, w = o.w ?? 6, rate = o.rate ?? 90;
  for (let t = o.t0; t <= o.t1; t += 1 / rate) {
    const s = spotAt(t); if (!s.water) continue;
    const c = s.p, n = Math.round((o.n ?? 14) * (o.dens ? o.dens(t) : 1));
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(R()) * w * 0.45, a = R() * 6.283, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, q = R();
      if (q < 0.5) {            // the jet: near-vertical droplets, fast
        const vy = (16 + 22 * Math.pow(R(), 0.7)) * Math.sqrt(k), sp = (0.6 + 1.6 * R()) * Math.sqrt(k);
        parts.push({ p: [x, 0.3, z], v: [Math.cos(a) * sp, vy, Math.sin(a) * sp], t0: t + R() / rate, size: (0.12 + 0.22 * R()) * k, drag: 0.1, life: 4.5, kind: 0, shade: 0.92 + 0.08 * R() });
      } else if (q < 0.8) {     // ragged white clumps (sheets) in the lower jet
        const vy = (6 + 13 * R()) * Math.sqrt(k), sp = (1 + 3.5 * R()) * Math.sqrt(k);
        parts.push({ p: [x, 0.4, z], v: [Math.cos(a) * sp, vy, Math.sin(a) * sp], t0: t + R() / rate, size: (0.5 + 1.0 * R()) * k, drag: 0.35, life: 3.2, kind: 1, shade: 0.9 + 0.1 * R() });
      } else {                  // low ring of spray thrown sideways
        const sp = (4 + 7 * R()) * Math.sqrt(k), vy = (3 + 6 * R()) * Math.sqrt(k);
        parts.push({ p: [x, 0.25, z], v: [Math.cos(a) * sp, vy, Math.sin(a) * sp], t0: t + R() / rate, size: (0.1 + 0.16 * R()) * k, drag: 0.2, life: 2.5, kind: 0, shade: 0.85 + 0.15 * R() });
      }
    }
  }
  return parts;
}

// ---------------------------------------------------------------- the boiling wake: white foam ribbon on the water
// o: { t0, t1, n 600, width, lift 0.55, fade 4 (s), seed }; update(tt). Drawn only where spotAt(t).water.
export function createFoam(S, spotAt, o) {
  const N = o.n ?? 600, W = o.width ?? 8, lift = o.lift ?? 0.55;
  const P = [], T = [], Wt = [];
  for (let i = 0; i <= N; i++) { const t = o.t0 + ((o.t1 - o.t0) * i) / N, s = spotAt(t); P.push(s.p.clone().setY(lift)); T.push(t); Wt.push(s.water ? 1 : 0); }
  const pos = new Float32Array((N + 1) * 6), aT = new Float32Array((N + 1) * 2), aS = new Float32Array((N + 1) * 2), aW = new Float32Array((N + 1) * 2), idx = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)], tan = b.clone().sub(a).setY(0); if (tan.lengthSq() < 1e-9) tan.set(1, 0, 0); tan.normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x);
    for (let k = 0; k < 2; k++) { const sg = k ? 1 : -1, j = i * 2 + k; P[i].clone().addScaledVector(side, (sg * W) / 2).toArray(pos, j * 3); aT[j] = T[i]; aS[j] = sg; aW[j] = Wt[i]; }
    if (i < N && Wt[i] && Wt[i + 1]) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setIndex(idx);
  const U = { uT: { value: -1e9 }, fade: { value: o.fade ?? 4 }, sunI: { value: o.sunI ?? 1.0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: `attribute float aT, aS; varying float vT, vS; varying vec3 vW; void main(){ vT = aT; vS = aS; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE} uniform float uT, fade, sunI; varying float vT, vS; varying vec3 vW;
      void main(){ float age = uT - vT; if (age < 0.) discard;
        float n = vn2(vW.xz * 0.35 + vec2(0., uT * 0.8)) * 0.5 + 0.5, n2 = vn2(vW.xz * 1.3 - uT * 1.1) * 0.5 + 0.5;
        float wid = 1. - smoothstep(0.35 + 0.35 * n + 0.25 * min(age / 2., 1.), 1.0, abs(vS));
        float a = wid * smoothstep(0.0, 0.12, age) * (0.55 + 0.45 * exp(-age / fade)) * (0.55 + 0.45 * n2);
        vec3 c = vec3(0.93, 0.95, 0.96) * (0.75 + 0.35 * n2) * sunI;
        gl_FragColor = vec4(c * a, a); }` });
  mat.blending = THREE.CustomBlending; mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneMinusSrcAlphaFactor;
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 18; S.scene.add(mesh);
  return { mesh, U, update(tt) { U.uT.value = tt; } };
}

// ---------------------------------------------------------------- the lens shadow over the sea (plane y = h, no depth test)
// set({ centre, axis, D, handleDir, spot, sun }): the spot is projected onto the plane. Hide it from the ocean mirror.
export function createSeaShadow(S, o = {}) {
  const sh = createLensShadow(S, { dark: o.dark ?? 0.5 });
  sh.mesh.material.depthTest = false; sh.mesh.renderOrder = 17;
  const h = o.h ?? 0.3, _p = new THREE.Vector3(), N = new THREE.Vector3(0, 1, 0);
  return { mesh: sh.mesh, U: sh.U,
    set(st) { _p.copy(st.spot); const k = (st.spot.y - h) / Math.max(st.sun.y, 1e-3); _p.addScaledVector(st.sun, -k); _p.y = h;
      sh.set({ centre: st.centre, axis: st.axis ?? st.sun, D: st.D, handleDir: st.handleDir, spot: _p, n: N, sun: st.sun }); } };
}
// the rig's handle direction in world space (same formula as kit lensRig)
export const handleDirOf = (rig, ha, out = new THREE.Vector3()) => out.set(Math.cos(ha), 0, -Math.sin(ha)).applyQuaternion(rig.lens.group.quaternion);
