// The 524 m RUN-UP (s02): the impact splash and a sheet of water climbing the head wall, conformed to the slope (a mesh
// parameterised by height: column x, row = height above the sea), its torn white front at runupAt(t) with spray off it, the
// conifers on the slope snapped and swallowed as the front passes, and the TRIMLINE left behind (forest stripped to soil).
import { THREE, mountH, SUN } from './kit.js';
import { createSpray } from '@engine/splash.js';
import { NOISE } from '@engine/glsl.js';
import { rng, clamp, sstep, fbm } from '@engine/util.js';
import { runupAt, T, RUNUP } from './story.js';

// z on the head wall at column x where the mountain reaches height h (the wall rises toward -z beyond z ~ -4200)
export function slopeZ(x, h) { let lo = -4150, hi = -6500; for (let k = 0; k < 36; k++) { const m = (lo + hi) / 2; if (mountH(x, m) < h) lo = m; else hi = m; } return (lo + hi) / 2; }
export function slopeN(x, z) { const e = 6, gx = (mountH(x + e, z) - mountH(x - e, z)) / (2 * e), gz = (mountH(x, z + e) - mountH(x, z - e)) / (2 * e); return new THREE.Vector3(-gx, 1, -gz).normalize(); }

export function makeRunup(S, W, o = {}) {
  const X0 = o.x0 ?? -1250, X1 = o.x1 ?? 420, NX = o.nx ?? 160, HMAX = RUNUP + 60, NH = o.nh ?? 120;
  const pos = new Float32Array(NX * NH * 3), aH = new Float32Array(NX * NH), aX = new Float32Array(NX * NH);
  for (let i = 0; i < NX; i++) { const x = X0 + (X1 - X0) * i / (NX - 1);
    for (let j = 0; j < NH; j++) { const h = -15 + (HMAX + 15) * Math.pow(j / (NH - 1), 1.15), z = slopeZ(x, Math.max(h, 1)), n = slopeN(x, z), k = i * NH + j;
      const y = Math.max(mountH(x, z), h); pos.set([x + n.x * 5, y + n.y * 5, z + n.z * 5], k * 3); aH[k] = h; aX[k] = x; } }
  const idx = []; for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NH - 1; j++) { const a = i * NH + j, b = a + NH, c = a + 1, d = b + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aH', new THREE.BufferAttribute(aH, 1));
  g.setAttribute('aX', new THREE.BufferAttribute(aX, 1)); g.setIndex(idx); g.computeVertexNormals();
  const XC = (X0 + X1) / 2, XH = (X1 - X0) / 2;
  const U = { front: { value: -100 }, time: { value: 0 }, xc: { value: XC }, xh: { value: XH } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aH; attribute float aX; varying float vH; varying float vX;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = aH; vX = aX;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${NOISE}\nuniform float front, time, xc, xh; varying float vH; varying float vX; float rFoam;`)
      .replace('#include <map_fragment>', `
        { float n1 = fbm2(vec2(vX/50., vH/90. - time*1.6)), n2 = fbm2(vec2(vX/20., vH/32. - time*3.5) + 3.), n3 = fbm2(vec2(vX/6., vH/22. - time*6.) + 7.);
          float taper = 1. - smoothstep(0.7, 1.0, abs(vX - xc)/xh);
          float edge = front*taper + 30.*(fbm2(vec2(vX/90., time*0.6)) - 0.5) + 12.*(n2 - 0.5) - 25.*(1. - taper);
          if (vH > edge) discard;
          float d = edge - vH;                                                   // metres below the torn front
          float wf = smoothstep(45., 2., d + 25.*(n2 - 0.5)) * 0.95 + smoothstep(0.56, 0.76, n1*0.45 + n2*0.4 + n3*0.3)*0.8;   // white front + streaks racing up
          vec3 water = mix(vec3(0.05,0.16,0.15), vec3(0.20,0.30,0.27), n1) * (0.8 + 0.4*n3);    // silty, grey-green water
          rFoam = clamp(wf, 0., 1.);
          diffuseColor.rgb = mix(water, vec3(0.93,0.95,0.96)*(0.85 + 0.2*n2), rFoam); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.08, 0.8, rFoam);');
  };
  const sheet = new THREE.Mesh(g, mat); sheet.frustumCulled = false; sheet.renderOrder = 12; S.scene.add(sheet);
  // conifers on the run-up face (instanced: crown cone + trunk), snapped as the front reaches them
  const R = rng(o.seed ?? 33), trees = [];
  for (let i = 0; i < 8000 && trees.length < (o.trees ?? 2600); i++) { const x = X0 - 100 + R() * (X1 - X0 + 200), h = 8 + R() * 700, z = slopeZ(x, h);
    const n = slopeN(x, z); if (n.y < 0.45) continue; trees.push({ x, y: mountH(x, z) - 1, z, h, s: 18 + R() * 22, yaw: R() * 6.28, fall: R() }); }
  const crownG = new THREE.ConeGeometry(0.28, 0.8, 7, 1).translate(0, 0.62, 0), trunkG = new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5).translate(0, 0.15, 0);
  const crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0x1d3320, roughness: 0.95 }), trees.length);
  const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.95 }), trees.length);
  const c = new THREE.Color(); trees.forEach((t, i) => crown.setColorAt(i, c.setHSL(0.3 + 0.05 * R(), 0.35 + 0.15 * R(), 0.1 + 0.06 * R())));
  for (const m of [crown, trunk]) { m.frustumCulled = false; S.scene.add(m); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  // impact splash at the slab's entry + spray off the climbing front
  const parts = [], IP = o.impact;
  for (let k = 0; k < 1100; k++) { const a = R() * 6.28, up = 70 + 230 * Math.pow(R(), 0.8), out = 40 + 120 * R(), r = R(), kind = r < 0.5 ? 0 : r < 0.92 ? 1 : 2;
    parts.push({ p: [IP.x + Math.cos(a) * 70 * R(), 5, IP.z + Math.sin(a) * 70 * R()], v: [Math.cos(a) * out, up, Math.sin(a) * out - 40], t0: T.impact + 4 - (o.film0 ?? T.impact) + 0.25 * R(),
      size: kind === 1 ? 12 + 26 * R() : kind === 0 ? 2.5 + 4 * R() : 35 + 40 * R(), drag: kind === 2 ? 0.9 : kind === 0 ? 0.12 : 0.3, life: 4.5, kind, shade: 0.95 }); }
  for (let ft = T.impact + 0.1; ft < T.runupTop + 0.4; ft += 0.06) { const h = runupAt(ft);
    for (let x = X0 + 30; x < X1 - 20; x += 34) { const xj = x + (R() - 0.5) * 30, z = slopeZ(xj, h), n = slopeN(xj, z), up = new THREE.Vector3(n.x, 0, n.z).normalize().negate();
      const sp = (RUNUP / (T.runupTop - T.impact)) * (1 - (ft - T.impact) / (T.runupTop - T.impact + 0.3)) * 1.2;
      parts.push({ p: [xj, mountH(xj, z) + 8, z], v: [up.x * sp * 0.6 + (R() - 0.5) * 20, sp * (0.5 + 0.6 * R()) + 20, up.z * sp * 0.6], t0: ft + 4 - (o.film0 ?? T.impact) + R() * 0.06,
        size: 10 + 22 * R(), drag: 0.8, life: 2.2, kind: R() < 0.7 ? 1 : 2, shade: 0.95 }); } }
  const spray = createSpray(S, parts, { hazeD: 16000 }); spray.U.sunDir.value.copy(SUN); spray.U.streak.value = 1 / 20; spray.U.amb.value.set(0x7f9fc0);
  return { sheet, U, trees, spray,
    update(ft, t) {
      const h = ft < T.impact ? -100 : runupAt(ft); U.front.value = h; U.time.value = t;
      W.MT.U.stripA.value.set(XC, XH, 0, h - 30);
      trees.forEach((tr, i) => { const tp = 1 - sstep(0.7, 1.0, Math.abs(tr.x - XC) / XH), hl = h * tp - 25 * (1 - tp);
        const u = clamp((hl - tr.h + 10) / 40), gone = hl > tr.h + 45;
        q.setFromEuler(e.set(-1.4 * u * (0.6 + 0.4 * tr.fall), tr.yaw, 0.5 * u * (tr.fall - 0.5), 'YXZ'));
        if (gone) m4.makeScale(0, 0, 0); else m4.compose(v.set(tr.x, tr.y + u * 10, tr.z), q, sc.setScalar(tr.s));
        crown.setMatrixAt(i, m4); trunk.setMatrixAt(i, m4); });
      crown.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = true;
      spray.update(t);
    } };
}
