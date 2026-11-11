// Moon breakup: the real LROC/LOLA Moon cut into 12 chunks along the same Voronoi fracture network the moon shader draws
// (moon.js `crack`). Chunks share one set of textures, drift apart, tumble, and stretch along the Earth-Moon axis;
// instanced rubble fills the gaps and streams toward Earth as a tidal tail.
//   const B = createBreakup(S, { moon: {...createMoon opts} });
//   B.update(t, { centre: Vector3, radius, md (camera->moon dir), sunDir, crack 0..1, sep 0.., stretch 0.., tail 0.., airCol });
import * as THREE from 'three';
import { createMoon, defaultCells } from './moon.js';
import { rng } from './util.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function createBreakup(S, o = {}) {
  const cells = defaultCells();
  const base = createMoon(S, { ...(o.moon || {}), airlight: false, side: THREE.DoubleSide, cells });
  const group = new THREE.Group(); S.scene.add(group);
  const U = base.material.uniforms;
  const R = rng(o.seed ?? 5);
  const chunks = cells.map((c, i) => {
    const mat = base.material.clone(); mat.uniforms = { ...U, cell: { value: i } };
    const mesh = new THREE.Mesh(base.geometry, mat); mesh.frustumCulled = false;
    const pivot = new THREE.Group(); pivot.add(mesh); group.add(pivot);
    const axis = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
    return { mesh, pivot, c, axis, spin: 0.15 + R() * 0.5, out: 0.8 + R() * 0.5 };
  });
  // rubble: instanced rocks living on the fracture boundaries, flung outward as the chunks separate
  const N = o.rubble ?? 900;
  let rockGeo = mergeVertices(new THREE.IcosahedronGeometry(1, 3));
  { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const k = 0.78 + 0.22 * Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7 + 0.4) + 0.12 * Math.sin(v.z * 7.3 + v.x * 5.1) + 0.06 * Math.sin(v.y * 13.1 + v.z * 11.7);
      p.setXYZ(i, v.x * k * 1.15, v.y * k * 0.78, v.z * k); } rockGeo.computeVertexNormals(); }
  const rockU = { sunDir: { value: new THREE.Vector3(1, 0, 0) }, sunI: { value: 1.4 }, airCol: { value: new THREE.Color(0, 0, 0) }, hot: { value: 0.0 } };
  const rockMat = new THREE.ShaderMaterial({ uniforms: rockU,
    vertexShader: `attribute float aTone; varying vec3 vN; varying float vT; void main(){ vN = normalize(mat3(modelMatrix*instanceMatrix)*normal); vT = aTone; gl_Position = projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 sunDir, airCol; uniform float sunI, hot; varying vec3 vN; varying float vT;
      void main(){ float l = max(dot(normalize(vN), normalize(sunDir)), 0.); vec3 c = vec3(0.105,0.1,0.095)*(0.55+0.9*vT)*(0.05 + l)*sunI;
        c += vec3(1.0,0.4,0.1)*hot*(0.3+0.7*vT)*0.6; gl_FragColor = vec4(c + airCol, 1.); }` });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, N); rocks.frustumCulled = false; group.add(rocks);
  const tone = new Float32Array(N);
  const R2 = rng((o.seed ?? 5) + 1);
  const rk = [];
  for (let i = 0; i < N; i++) {
    // pick a point near a boundary between two cells: midpoint direction of two random neighbouring seeds + jitter
    const a = cells[Math.floor(R2() * cells.length)]; let b = cells[0], bd = -2; for (const c of cells) { if (c === a) continue; const d = a.dot(c) + R2() * 0.3; if (d > bd) { bd = d; b = c; } }
    const dir = a.clone().add(b).normalize().add(new THREE.Vector3(R2() - 0.5, R2() - 0.5, R2() - 0.5).multiplyScalar(0.25)).normalize();
    const tail = R2() < 0.45;
    rk.push({ dir, depth: 0.55 + R2() * 0.5, size: 0.003 + Math.pow(R2(), 4) * 0.028, fly: 0.6 + R2() * 1.6, tail, tpos: R2(), tspread: (R2() - 0.5), tspread2: (R2() - 0.5), spin: new THREE.Vector3(R2(), R2(), R2()).multiplyScalar(6) });
    tone[i] = R2();
  }
  rockGeo.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const orient = new THREE.Quaternion();
  return {
    group, chunks, rocks, U, rockU, base,
    // st: centre (world), radius (world units), md (camera->moon direction), sunDir, crack, sep (in moon radii), stretch, tail, airCol (THREE.Color), time
    update(t, st) {
      const Rm = st.radius, ctr = st.centre;
      // orient the moon so its near side (+X) faces the camera/Earth, north up (same as moon.faceNearSide)
      const d = st.md.clone().negate(); const yaw = Math.atan2(-d.z, d.x);
      orient.setFromEuler(e.set(0, yaw, 0)); orient.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.asin(THREE.MathUtils.clamp(d.y, -1, 1))));
      const toEarth = d.clone(); // world direction from the moon toward the camera/Earth
      U.sunDir.value.copy(st.sunDir); U.crack.value = st.crack ?? 1; if (st.airCol) U.airCol.value.copy(st.airCol); U.earthDir.value.copy(toEarth);
      const sep = st.sep ?? 0, stretch = st.stretch ?? 0;
      for (const ch of chunks) {
        const cw = ch.c.clone().applyQuaternion(orient);                       // chunk centre direction (world)
        const along = cw.dot(toEarth);                                          // tidal stretch: chunks on the Earth-Moon axis pull apart most
        const off = cw.clone().multiplyScalar(sep * ch.out * Rm).addScaledVector(toEarth, along * stretch * Rm);
        const cen = cw.clone().multiplyScalar(0.62 * Rm);                       // pivot ~ chunk centroid
        ch.pivot.position.copy(ctr).add(off).add(cen);
        ch.pivot.quaternion.copy(orient).premultiply(new THREE.Quaternion().setFromAxisAngle(ch.axis, sep * ch.spin));
        ch.mesh.position.copy(ch.c).multiplyScalar(-0.62 * Rm).applyQuaternion(orient.clone().invert()).applyQuaternion(orient); // keep pivot offset in moon space
        ch.mesh.position.copy(ch.c.clone().multiplyScalar(-0.62 * Rm));
        ch.mesh.scale.setScalar(Rm);
      }
      // rubble
      rockU.sunDir.value.copy(st.sunDir); if (st.airCol) rockU.airCol.value.copy(st.airCol); rockU.hot.value = st.hot ?? 0.15;
      const tl = st.tail ?? 0, show = Math.min(1, sep * 4 + (st.crack ?? 0) * 0.2);
      rk.forEach((r, i) => {
        let p;
        if (r.tail && tl > 0) { // stream toward Earth, fanning out
          const s = r.tpos * tl; p = ctr.clone().addScaledVector(toEarth, Rm * (1 + s * 6)).addScaledVector(new THREE.Vector3().crossVectors(toEarth, new THREE.Vector3(0, 1, 0)).normalize(), Rm * r.tspread * (0.3 + s * 1.5)).add(new THREE.Vector3(0, Rm * r.tspread2 * (0.2 + s * 0.8), 0));
        } else p = ctr.clone().addScaledVector(r.dir.clone().applyQuaternion(orient), Rm * (r.depth + sep * r.fly));
        const sz = r.size * Rm * (show > 0.01 ? Math.min(1, show) : 0.0001);
        q.setFromEuler(e.set(r.spin.x * (t * 0.1 + sep), r.spin.y * (t * 0.1 + sep), r.spin.z * sep));
        m4.compose(p, q, sc.setScalar(sz)); rocks.setMatrixAt(i, m4);
      });
      rocks.instanceMatrix.needsUpdate = true;
    },
  };
}
