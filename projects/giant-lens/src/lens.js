// giant-lens SHARED EFFECTS (lead-owned; Builders import, never edit). Units agnostic: pass D, spot, glowR in scene units
// (metres on the ground sets, km in space). All are pure functions of the values you pass each frame (deterministic).
//   N1 createLens(S, o)  : a giant magnifying glass: convex glass body that refracts the sky (thin-lens inversion), Fresnel
//                          reflection, sun glint, dark rim, black handle. Casts a real shadow (castShadow on the rim/glass/handle).
//   N2 createBeam(S, o)  : faint additive light cone lens -> spot, white-hot core + orange halo billboards, a ground decal (the
//                          bright focusing disc + heat glow). No full-frame flashes: brightness lives in a few pixels + bloom.
//   N3 createBurn(S, o)  : a ribbon decal along the spot's path: white -> yellow -> orange glow -> black char (glow fades ~3 s).
//      createFlames(S, pts, o): fire.js flames with a per-flame ignition time (fire.js has one global `amt`).
//      heatColor(u)      : JS colour ramp 0..1 (black -> deep red -> orange -> yellow -> white) for car paint, panes, etc.
import { THREE } from '@engine/engine.js';
import { NOISE } from '@engine/glsl.js';

const GLSL_HEAT = `vec3 heatRamp(float u){ u = clamp(u, 0., 1.);
  vec3 c = mix(vec3(0.0), vec3(0.55,0.04,0.0), smoothstep(0.0, 0.25, u));
  c = mix(c, vec3(1.0,0.28,0.02), smoothstep(0.2, 0.5, u));
  c = mix(c, vec3(1.0,0.72,0.25), smoothstep(0.45, 0.75, u));
  return mix(c, vec3(1.0,0.97,0.9), smoothstep(0.7, 1.0, u)); }`;
export function heatColor(u, out = new THREE.Color()) {
  u = Math.min(1, Math.max(0, u)); const s = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  let c = [0, 0, 0]; const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  c = mix(c, [0.55, 0.04, 0], s(0, 0.25, u)); c = mix(c, [1, 0.28, 0.02], s(0.2, 0.5, u)); c = mix(c, [1, 0.72, 0.25], s(0.45, 0.75, u)); c = mix(c, [1, 0.97, 0.9], s(0.7, 1, u));
  return out.setRGB(c[0], c[1], c[2]);
}
const _q = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
// orthonormal basis around a unit axis
function basis(a) { const t = Math.abs(a.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); const e1 = new THREE.Vector3().crossVectors(t, a).normalize(); const e2 = new THREE.Vector3().crossVectors(a, e1); return [e1, e2]; }

// ================================================================= N1: the lens
// o: { sky: createSky handle (copies dayZen/dayHor each frame) | zen, hor (hex), ground (hex), thick 0.14 (glass thickness / D),
//      rim 0.045 (tube / radius), handle true, handleLen 0.9 (× D/2... in radii), rimCol 0x1b1c20, handleCol 0x111214, sunI 1, shadows true }
// set({ centre, axis (unit, toward the Sun), D, handleAngle (rad, about the axis), sunDir }) every frame.
export function createLens(S, o = {}) {
  const group = new THREE.Group(); S.scene.add(group);
  const U = {
    centre: { value: new THREE.Vector3() }, axis: { value: new THREE.Vector3(0, 1, 0) }, f: { value: 20 }, R: { value: 10 },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, zen: { value: new THREE.Color(o.zen ?? 0x2f6fd0) }, hor: { value: new THREE.Color(o.hor ?? 0xa9cff0) },
    gnd: { value: new THREE.Color(o.ground ?? 0x7a7466) }, sunI: { value: o.sunI ?? 1 }, tint: { value: new THREE.Color(o.tint ?? 0xe4f4ee) },
    glow: { value: o.glow ?? 0.06 }, space: { value: o.space ? 1 : 0 },
  };
  const glassMat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 centre, axis, sunDir, zen, hor, gnd, tint; uniform float f, R, sunI, glow, space; varying vec3 vW, vN;
      vec3 skyCol(vec3 d){
        if (space > 0.5) return vec3(0.0) + sunI * 60. * pow(max(dot(d, sunDir), 0.), 3000.);
        float h = clamp(d.y, 0., 1.); vec3 c = mix(hor, zen, pow(h, 0.5));
        c = mix(c, gnd, smoothstep(0.0, -0.12, d.y));
        float s = max(dot(d, sunDir), 0.);
        return c + sunI * (60. * pow(s, 3000.) + 0.6 * pow(s, 60.) * vec3(1., 0.92, 0.8)); }
      void main(){
        vec3 V = normalize(vW - cameraPosition); vec3 N = normalize(vN); if (dot(N, V) > 0.) N = -N;
        float cosi = max(dot(-V, N), 0.); float fr = 0.04 + 0.96 * pow(1. - cosi, 5.);
        vec3 Rf = reflect(V, N);
        vec3 rr = vW - centre; rr -= dot(rr, axis) * axis;                  // lateral offset on the lens plane
        float along = abs(dot(V, axis));
        vec3 T = normalize(V - rr * (along / f));                           // thin lens: converge by r/f (inverts the far sky)
        float rn = length(rr) / R;
        vec3 thru = skyCol(T) * tint * (0.92 - 0.12 * rn * rn);
        vec3 refl = skyCol(Rf);
        vec3 c = mix(thru, refl, fr);
        c += glow * sunI * (0.6 + 0.4 * rn) * vec3(1.0, 0.97, 0.9) * (1. - space);   // a little scattered sunlight in the glass
        c += sunI * 6. * pow(max(dot(Rf, sunDir), 0.), 400.) * smoothstep(0.75, 1.0, rn); // edge glint
        gl_FragColor = vec4(c, 1.); }` });
  const th = o.thick ?? 0.14;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 48), glassMat); glass.scale.set(1, th, 1);
  const rimM = new THREE.MeshStandardMaterial({ color: o.rimCol ?? 0x1b1c20, metalness: 0.75, roughness: 0.3 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, o.rim ?? 0.045, 20, 192).rotateX(Math.PI / 2), rimM);
  const parts = [glass, rim];
  if (o.handle !== false) {
    const hl = o.handleLen ?? 0.9, hm = new THREE.MeshStandardMaterial({ color: o.handleCol ?? 0x111214, metalness: 0.2, roughness: 0.45 });
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.22, 32).rotateZ(Math.PI / 2), rimM); collar.position.set(1.12, 0, 0);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, hl, 8, 32).rotateZ(Math.PI / 2), hm); grip.position.set(1.23 + hl / 2 + 0.08, 0, 0);
    parts.push(collar, grip);
  }
  const body = new THREE.Group(); parts.forEach((m) => { m.castShadow = o.shadows ?? true; m.frustumCulled = false; body.add(m); }); group.add(body);
  const lens = { group, body, glass, rim, U, material: glassMat,
    set({ centre, axis, D, handleAngle = 0, sunDir }) {
      group.position.copy(centre); _q.setFromUnitVectors(_Y, axis); group.quaternion.copy(_q); body.rotation.set(0, handleAngle, 0);
      group.scale.setScalar(D / 2);
      U.centre.value.copy(centre); U.axis.value.copy(axis); U.f.value = D; U.R.value = D / 2; if (sunDir) U.sunDir.value.copy(sunDir);
      if (o.sky) { U.zen.value.copy(o.sky.U.dayZen.value); U.hor.value.copy(o.sky.U.dayHor.value); }
    } };
  return lens;
}

// ================================================================= N2: beam cone + spot
// set({ spot, lensC, D, w (spot diameter), n (surface normal at the spot, default +Y), C (concentration, suns), heat 0..1
//       (how hot the target glows: drives the halo), glowR (halo/decal radius, scene units), beamI 1, coreI 1, minPx 3 })
export function createBeam(S, o = {}) {
  const grp = new THREE.Group(); S.scene.add(grp);
  // cone: open cylinder, y in [0, 1] = spot -> lens; radii mixed in the vertex shader
  const cg = new THREE.CylinderGeometry(1, 1, 1, 128, 32, true); cg.translate(0, 0.5, 0);
  const CU = { spot: { value: new THREE.Vector3() }, lensC: { value: new THREE.Vector3() }, e1: { value: new THREE.Vector3(1, 0, 0) }, e2: { value: new THREE.Vector3(0, 0, 1) },
    rS: { value: 0.1 }, rL: { value: 10 }, I: { value: 1 }, col: { value: new THREE.Color(o.beamCol ?? 0xfff3df) } };
  const cone = new THREE.Mesh(cg, new THREE.ShaderMaterial({ uniforms: CU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform vec3 spot, lensC, e1, e2; uniform float rS, rL; varying float vH; varying vec3 vW, vN;
      void main(){ float h = position.y; float a = atan(position.z, position.x); vec3 rd = cos(a) * e1 + sin(a) * e2;
        vec3 p = mix(spot, lensC, h) + rd * mix(rS, rL, h); vH = h; vW = p; vN = rd; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `${NOISE} uniform float I, rS, rL; uniform vec3 col; varying float vH; varying vec3 vW, vN;
      void main(){ vec3 V = normalize(vW - cameraPosition); float sil = 1. - abs(dot(normalize(vN), V));
        float r = mix(rS, rL, vH); float conc = clamp(rL / max(r, 1e-4), 1., 40.);              // brighter toward the focus
        float d = (0.006 + 0.006 * conc) * (0.25 + 1.2 * sil * sil);
        d *= smoothstep(1.0, 0.82, vH) * (0.85 + 0.3 * vn3(vW * (3.0 / rL) + vec3(0., vH * 4., 0.)));
        gl_FragColor = vec4(col * d * I, 1.); }` }));
  cone.frustumCulled = false; cone.renderOrder = 25; grp.add(cone);
  // billboards: white-hot core and orange halo
  const bb = (frag) => { const U = { c: { value: new THREE.Vector3() }, size: { value: 1 }, I: { value: 1 }, col: { value: new THREE.Color(1, 1, 1) } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      vertexShader: `uniform vec3 c; uniform float size; varying vec2 vUv; void main(){ vUv = position.xy; vec4 v = viewMatrix * vec4(c, 1.); v.xy += position.xy * size; v.z += size * 0.9; gl_Position = projectionMatrix * v; }`,
      fragmentShader: `uniform float I; uniform vec3 col; varying vec2 vUv; void main(){ float r = length(vUv); ${frag} }` }));
    m.frustumCulled = false; m.renderOrder = 27; grp.add(m); return { m, U }; };
  const core = bb(`float k = exp(-r * r * 9.) + 0.25 * exp(-r * 3.5); gl_FragColor = vec4(col * k * I * smoothstep(1., 0.8, r), 1.);`);
  const halo = bb(`float k = exp(-r * r * 4.) * 0.8 + 0.2 * exp(-r * 6.); gl_FragColor = vec4(col * k * I * smoothstep(1., 0.7, r), 1.);`);
  // ground decal: focusing disc (bright, white) + heat glow (orange), on the surface at the spot
  const DU = { rDisc: { value: 1 }, discI: { value: 0 }, rGlow: { value: 1 }, glowI: { value: 0 }, heat: { value: 0 }, time: { value: 0 } };
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: DU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide,
    vertexShader: `uniform float rDisc, rGlow; varying vec2 vP; void main(){ float s = max(rDisc, rGlow) * 1.15; vP = position.xy * s; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy * s, 0., 1.); }`,
    fragmentShader: `${NOISE} ${GLSL_HEAT} uniform float rDisc, discI, rGlow, glowI, heat, time; varying vec2 vP;
      void main(){ float r = length(vP);
        float disc = smoothstep(rDisc, rDisc * 0.86, r) * discI * (0.92 + 0.08 * vn2(vP / max(rDisc, 1e-3) * 3. + time));
        float g = exp(-pow(r / max(rGlow, 1e-4), 2.) * 2.2) * glowI * (0.8 + 0.4 * vn2(vP / max(rGlow, 1e-3) * 2.5 + vec2(time * 0.7, 0.)));
        vec3 c = vec3(1.0, 0.96, 0.88) * disc + heatRamp(heat * (0.55 + 0.45 * exp(-r / max(rGlow, 1e-4) * 1.5))) * g;
        gl_FragColor = vec4(c, 1.); }` }));
  decal.frustumCulled = false; decal.renderOrder = 22; grp.add(decal);
  const _v = new THREE.Vector3(), _n = new THREE.Vector3();
  const beam = { group: grp, cone, core, halo, decal, CU, DU,
    set(st) {
      const { spot, lensC, D, w } = st, n = _n.copy(st.n ?? _Y).normalize(), C = st.C ?? 11556, heat = st.heat ?? 1, glowR = st.glowR ?? w * 3;
      const axis = _v.copy(lensC).sub(spot).normalize(); const [e1, e2] = basis(axis);
      CU.spot.value.copy(spot); CU.lensC.value.copy(lensC); CU.e1.value.copy(e1); CU.e2.value.copy(e2); CU.rS.value = w / 2; CU.rL.value = D / 2; CU.I.value = st.beamI ?? 1;
      // minimum on-screen size (px of the 1920-tall frame) for the core and halo
      const cam = S.camera, dist = cam.position.distanceTo(spot), mPerPx = (2 * dist * Math.tan((cam.fov * Math.PI) / 360)) / 1920;
      const minS = (st.minPx ?? 5) * mPerPx;
      const hot = Math.min(1, Math.max(0, (Math.log10(C) - 1) / 3));            // 0 at 10 suns, 1 at 10,000 suns
      core.U.c.value.copy(spot).addScaledVector(n, w * 0.15); core.U.size.value = Math.max(w * 1.6, minS * 2.2); core.U.I.value = (st.coreI ?? 1) * 18 * hot; core.U.col.value.setRGB(1, 0.97, 0.9);
      halo.U.c.value.copy(core.U.c.value); halo.U.size.value = Math.max(glowR * 1.6, minS * 6); halo.U.I.value = (st.coreI ?? 1) * 1.6 * heat * hot; heatColor(0.55 + 0.25 * heat, halo.U.col.value);
      decal.position.copy(spot).addScaledVector(n, 0.002 * D); decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      DU.rDisc.value = w / 2; DU.discI.value = (st.discI ?? 1) * Math.min(C, 40) * 0.35;
      DU.rGlow.value = glowR; DU.glowI.value = (st.glowI ?? 1) * 2.2 * heat; DU.heat.value = 0.35 + 0.6 * heat; DU.time.value = st.t ?? 0;
      grp.visible = st.visible ?? true;
    } };
  return beam;
}

// ================================================================= the lens shadow (analytic; shadow maps don't show on our renders)
// A multiply decal on the surface plane through the spot: every point whose sun-ray hits the glass, rim or handle is darkened to
// `dark` (sky light only). The spot itself is inside it (the lens sends that light to the spot). Objects standing in the shadow are
// not darkened (it lies on the surface). set({ centre, axis, D, handleDir (unit, world), spot, n, sun, handleLen }).
export function createLensShadow(S, o = {}) {
  const U = { C: { value: new THREE.Vector3() }, A: { value: new THREE.Vector3(0, 1, 0) }, Sd: { value: new THREE.Vector3(0, 1, 0) }, R: { value: 10 },
    H: { value: new THREE.Vector3(1, 0, 0) }, hl: { value: o.handleLen ?? 0.9 }, dark: { value: o.dark ?? 0.42 }, handle: { value: o.handle === false ? 0 : 1 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 C, A, Sd, H; uniform float R, hl, dark, handle; varying vec3 vW;
      void main(){ float t = dot(C - vW, A) / max(dot(Sd, A), 1e-3); vec3 d = vW + Sd * t - C;
        float r = length(d) / R; float aa = max(fwidth(r), 1e-4);
        float sh = 1. - smoothstep(1.045 - aa, 1.045 + aa, r);
        vec3 Y2 = cross(A, H); float x = dot(d, H) / R, y = dot(d, Y2) / R; float ax = max(fwidth(x), 1e-4);
        float hnd = handle * (smoothstep(1.0 - ax, 1.0 + ax, x) * (1. - smoothstep(1.4 + hl - ax, 1.4 + hl + ax, x)) * (1. - smoothstep(0.09 - ax, 0.09 + ax, abs(y))));
        float k = max(sh, hnd); gl_FragColor = vec4(vec3(mix(1., dark, k)), 1.); }` }));
  m.frustumCulled = false; m.renderOrder = 19; S.scene.add(m);
  return { mesh: m, U,
    set({ centre, axis, D, handleDir, spot, n = _Y, sun = axis }) {
      U.C.value.copy(centre); U.A.value.copy(axis); U.Sd.value.copy(sun); U.R.value = D / 2; if (handleDir) U.H.value.copy(handleDir);
      m.position.copy(spot).addScaledVector(n, 0.0005 * D); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const sy = Math.max(0.2, Math.abs(n.dot(sun))); m.scale.setScalar(((D / 2) * 2.6) / sy);
    } };
}

// ================================================================= N3: burn trail
// o: { spotAt(tt) -> { p: Vector3, n?: Vector3 }, t0, t1 (shot-time range the spot travels), n 400 samples, width (scene units),
//      lift (offset along n), glowS 3 (s of glow), charA 0.92, heatI 1 }.  update(tt): tt in the same clock as spotAt.
export function createBurn(S, o) {
  const N = o.n ?? 400, W = o.width ?? 0.6, lift = o.lift ?? 0.02;
  const P = [], Nn = [], T = [];
  for (let i = 0; i <= N; i++) { const tt = o.t0 + ((o.t1 - o.t0) * i) / N; const s = o.spotAt(tt); P.push(s.p.clone()); Nn.push((s.n ?? _Y).clone().normalize()); T.push(tt); }
  const pos = new Float32Array((N + 1) * 2 * 3), aT = new Float32Array((N + 1) * 2), aS = new Float32Array((N + 1) * 2), idx = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)], tan = b.clone().sub(a); if (tan.lengthSq() < 1e-12) tan.set(1, 0, 0); tan.normalize();
    const side = new THREE.Vector3().crossVectors(Nn[i], tan).normalize();
    for (let k = 0; k < 2; k++) { const s = k ? 1 : -1, j = i * 2 + k; const p = P[i].clone().addScaledVector(side, (s * W) / 2).addScaledVector(Nn[i], lift); p.toArray(pos, j * 3); aT[j] = T[i]; aS[j] = s; }
    if (i < N) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setIndex(idx);
  const U = { uT: { value: -1e9 }, glowS: { value: o.glowS ?? 3 }, charA: { value: o.charA ?? 0.92 }, heatI: { value: o.heatI ?? 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: `attribute float aT, aS; varying float vT, vS; varying vec3 vW; void main(){ vT = aT; vS = aS; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE} ${GLSL_HEAT} uniform float uT, glowS, charA, heatI; varying float vT, vS; varying vec3 vW;
      void main(){ float age = uT - vT; if (age < 0.) discard;
        float n = vn2(vec2(vT * 23., vS * 2.)) * 0.5 + 0.5, n2 = vn3(vW * 1.7) * 0.5 + 0.5;
        float edge = 1. - smoothstep(0.45 + 0.35 * n, 1.0, abs(vS));
        float a = edge * charA * smoothstep(0.0, 0.35, age) * (0.75 + 0.25 * n2);
        float core = exp(-vS * vS * 5.);
        float h = exp(-age / (glowS * 0.22)) * 0.75 + 0.25 * exp(-age / glowS);               // white -> orange in ~0.5 s, ember to ~3 s
        h *= core * (0.85 + 0.3 * n);
        vec3 em = heatRamp(h) * heatI * (0.4 + 22. * h * h * h) * smoothstep(0.02, 0.18, h);
        gl_FragColor = vec4(vec3(0.028, 0.022, 0.018) * a + em, a); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 21; mesh.receiveShadow = false; S.scene.add(mesh);
  return { mesh, U, P, T, update(tt) { U.uT.value = tt; } };
}

// ================================================================= flames with ignition times (fire.js look, per-flame start)
// pts: [{ p: Vector3 base, s: height, t0: ignition (same clock as update), grow 0.6 s, seed }]; o: { I 6 }
export function createFlames(S, pts, o = {}) {
  const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  const N = pts.length, aP = new Float32Array(N * 3), aS = new Float32Array(N), aK = new Float32Array(N), aT0 = new Float32Array(N), aG = new Float32Array(N);
  pts.forEach((q, i) => { q.p.toArray(aP, i * 3); aS[i] = q.s; aK[i] = q.seed ?? (i * 0.6180339) % 1; aT0[i] = q.t0 ?? 0; aG[i] = q.grow ?? 0.6; });
  for (const [k, a, n] of [['aP', aP, 3], ['aS', aS, 1], ['aK', aK, 1], ['aT0', aT0, 1], ['aG', aG, 1]]) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, n));
  g.instanceCount = N;
  const U = { time: { value: 0 }, I: { value: o.I ?? 6 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aP; attribute float aS, aK, aT0, aG; uniform float time; varying vec2 vUv; varying float vK;
      void main(){ vUv = uv; vK = aK; vec4 c = viewMatrix * vec4(aP, 1.);
        float amt = smoothstep(aT0, aT0 + aG, time);
        float s = aS * amt * (0.8 + 0.25 * fract(aK * 7.13) + 0.08 * sin(time * 9. + aK * 40.));
        c.xy += vec2(position.x * 0.62, position.y) * s; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `${NOISE}
      uniform float time, I; varying vec2 vUv; varying float vK;
      void main(){ vec2 u = vec2(vUv.x - 0.5, vUv.y);
        float n = fbm2(vec2(u.x*3.2 + vK*17., u.y*2.4 - time*2.8 - vK*5.));
        float n2 = fbm2(vec2(u.x*7. + vK*3., u.y*5. - time*4.1));
        float w = (1. - u.y)*0.42 + 0.03;
        float d = abs(u.x + (n - 0.5)*0.34*u.y) / w;
        float m = smoothstep(1., 0.1, d) * smoothstep(0., 0.08, u.y) * smoothstep(1., 0.2, u.y + (n - 0.5)*0.55 + (n2 - 0.5)*0.25);
        vec3 c = mix(vec3(0.9,0.12,0.01), vec3(1.0,0.55,0.12), smoothstep(0.35, 1.0, 1. - d) * (1. - u.y*0.8));
        gl_FragColor = vec4(c * m * I, 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 20; S.scene.add(mesh);
  return { mesh, U, update(t) { U.time.value = t; } };
}
