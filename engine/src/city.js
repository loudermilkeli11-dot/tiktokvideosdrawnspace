// "The City": a sunny downtown set. A street grid around a central plaza with a fountain, towers with daylight curtain-wall /
// punched-window facades, cars, trees, street lamps and loose props (benches, bins, planters) that the lift system can throw.
//   const C = createCity(S, { seed, blocks: 3 });  ->  { group, cars[], props[], trees, fountain, ground(x,z), lanes, update(t) }
// Units: metres. Plaza centred on the origin; avenues run along X and Z every PERIOD metres. Ground is y = 0.
import * as THREE from 'three';
import { rng } from './util.js';
import { NOISE } from './glsl.js';
export const PERIOD = 120, STREET = 24, SIDEWALK = 5;          // grid period, street width (kerb to kerb + sidewalks), sidewalk width
const ROAD = STREET - 2 * SIDEWALK;                              // 14 m roadway: 2 lanes each way
export const SL = (k) => (k + 0.5) * PERIOD;                     // street centre-lines; blocks are centred on k*PERIOD
export function createCity(S, o = {}) {
  const R = rng(o.seed ?? 11), group = new THREE.Group(); S.scene.add(group);
  const NB = o.blocks ?? 3;                                      // blocks from the centre in each direction
  // ---------- ground: asphalt, lane marks, kerbs, sidewalks, plaza paving ----------
  const gMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  gMat.onBeforeCompile = (sh) => {
    sh.uniforms.period = { value: PERIOD }; sh.uniforms.street = { value: STREET }; sh.uniforms.walk = { value: SIDEWALK };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${NOISE}\nuniform float period, street, walk; varying vec3 vWp;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p = vWp.xz; vec2 qq = p - period*0.5; vec2 c = qq - period*floor(qq/period + 0.5);   // offset from the nearest street centre-lines (streets at (k+0.5)*period)
        vec2 a = abs(c); float hs = street*0.5, rd = hs - walk;
        float inX = step(a.y, hs), inZ = step(a.x, hs);                    // inside a street running along X / along Z
        float plaza = step(max(abs(p.x), abs(p.y)), period*0.5 - hs);      // the central plaza (the block at the origin)
        float n = vn2(p*0.35)*0.5 + vn2(p*2.1)*0.5;
        vec3 asphalt = vec3(0.075,0.078,0.085)*(0.85+0.3*n);
        vec3 walkC = vec3(0.50,0.49,0.46)*(0.85+0.25*n);
        vec3 col = vec3(0.30,0.29,0.27);                                    // block interiors (mostly under buildings)
        float road = max(step(a.y, rd)*inX, step(a.x, rd)*inZ);
        float side = max(inX, inZ) * (1. - road);
        col = mix(col, walkC, side); col = mix(col, asphalt, road);
        // kerb lines and lane marks (dashed centre lines, solid edge lines)
        float kerb = max(inX*smoothstep(0.25, 0., abs(a.y - rd)), inZ*smoothstep(0.25, 0., abs(a.x - rd)));
        col = mix(col, vec3(0.62,0.6,0.56), kerb*(1. - plaza));
        float dashX = step(0.5, fract(p.x/6.)) * smoothstep(0.12, 0.05, abs(c.y)) * inX * (1. - inZ);
        float dashZ = step(0.5, fract(p.y/6.)) * smoothstep(0.12, 0.05, abs(c.x)) * inZ * (1. - inX);
        col = mix(col, vec3(0.85,0.75,0.35), max(dashX, dashZ));
        // crossings (zebra) near each junction
        float zx = inZ*step(abs(c.y), rd)*step(rd - 4., abs(c.y)) * step(abs(c.x), rd) * step(0.5, fract(c.x/1.2));
        float zz = inX*step(abs(c.x), rd)*step(rd - 4., abs(c.x)) * step(abs(c.y), rd) * step(0.5, fract(c.y/1.2));
        col = mix(col, vec3(0.8,0.8,0.78), max(zx, zz)*(1. - plaza));
        // plaza paving: warm stone squares with a darker ring around the fountain
        vec2 t = fract(p/0.9); float grout = smoothstep(0.04, 0.0, min(min(t.x, 1.-t.x), min(t.y, 1.-t.y)));
        float tv = vn2(floor(p/0.9)*1.7); vec3 pave = mix(vec3(0.46,0.40,0.34), vec3(0.58,0.50,0.42), tv)*(0.92+0.12*n) * (1. - 0.3*grout);
        float ring = smoothstep(1., 0., abs(length(p) - 17.)) ;
        pave = mix(pave, vec3(0.36,0.33,0.3), ring*0.8);
        col = mix(col, pave, plaza);
        diffuseColor.rgb = col;`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 1, 1).rotateX(-Math.PI / 2), gMat); ground.receiveShadow = true; group.add(ground);
  // ---------- buildings ----------
  const B = [];
  for (let bi = -NB; bi <= NB; bi++) for (let bj = -NB; bj <= NB; bj++) {
    if (bi === 0 && bj === 0) continue;                         // the plaza
    const cx = bi * PERIOD, cz = bj * PERIOD, half = (PERIOD - STREET) / 2, d = Math.hypot(bi, bj);
    const nx = 1 + Math.floor(R() * 2), nz = 1 + Math.floor(R() * 2);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const w = (2 * half) / nx, dd = (2 * half) / nz; const x0 = cx - half + w * (i + 0.5), z0 = cz - half + dd * (j + 0.5);
      const tall = Math.max(0, 1 - d / (NB + 1.5)); const h = 22 + R() * 50 + tall * tall * (60 + R() * 170) * (R() < 0.75 ? 1 : 0.35);
      B.push({ x: x0, z: z0, w: w - 2 - R() * 3, d: dd - 2 - R() * 3, h, seed: R(), glass: R() < 0.55 + tall * 0.3 ? 1 : 0, hue: R() });
    }
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const aSize = new Float32Array(B.length * 3), aSeed = new Float32Array(B.length), aGlass = new Float32Array(B.length);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0, envMapIntensity: 1.0 });
  bMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aSize; attribute float aSeed; attribute float aGlass; varying vec3 vL; varying vec3 vLN; varying float vSeed; varying float vGlass; varying vec3 vSz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position*aSize; vLN = normal; vSeed = aSeed; vGlass = aGlass; vSz = aSize;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vL; varying vec3 vLN; varying float vSeed; varying float vGlass; varying vec3 vSz;
      float hh(float n){ return fract(sin(n*127.1)*43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 an = abs(vLN); vec2 f = an.x > 0.5 ? vL.zy : vL.xy; if (an.y > 0.5) f = vL.xz;
        float roof = step(0.5, an.y);
        float fl = 3.6, bay = vGlass > 0.5 ? 1.6 : 2.6;
        vec2 cf = vec2(f.x/bay, f.y/fl); vec2 g = fract(cf);
        float ground = step(f.y, 5.5);                                         // tall shopfront storey
        vec3 stone = mix(vec3(0.72,0.66,0.58), vec3(0.62,0.42,0.32), step(0.6, hh(vSeed*7.)))*(0.85+0.3*hh(vSeed*3.));
        vec3 glassT = mix(vec3(0.20,0.32,0.38), vec3(0.28,0.36,0.30), hh(vSeed*5.))*(0.8+0.4*hh(vSeed*9.));
        float win = (vGlass > 0.5) ? step(0.06, g.x)*step(g.x, 0.94)*step(0.08, g.y)*step(g.y, 0.9)
                                    : step(0.25, g.x)*step(g.x, 0.75)*step(0.2, g.y)*step(g.y, 0.75);
        float shop = ground*step(0.6, f.y)*step(f.y, 4.6)*step(0.08, fract(f.x/6.))*step(fract(f.x/6.), 0.92);
        vec3 wall = vGlass > 0.5 ? vec3(0.12,0.13,0.14) : stone;
        vec3 wc = mix(vec3(0.05,0.06,0.07), glassT, 0.6 + 0.4*hh(floor(cf.x)*13.1 + floor(cf.y)*7.7 + vSeed*31.));
        vec3 col = mix(wall, wc, max(win*(1. - ground), shop));
        col = mix(col, vec3(0.32,0.31,0.3), roof);
        diffuseColor.rgb = col;
        float glassy = max(win*(1. - ground), shop)*(1. - roof);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.85, 0.08, glassy);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.0, 0.85, glassy*(vGlass > 0.5 ? 1. : 0.6));');
  };
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, B.length); bMesh.castShadow = true; bMesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  B.forEach((b, i) => { m4.compose(new THREE.Vector3(b.x, 0, b.z), q.identity(), new THREE.Vector3(b.w, b.h, b.d)); bMesh.setMatrixAt(i, m4); aSize.set([b.w, b.h, b.d], i * 3); aSeed[i] = b.seed; aGlass[i] = b.glass; });
  bGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3)); bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1)); bGeo.setAttribute('aGlass', new THREE.InstancedBufferAttribute(aGlass, 1));
  bMesh.frustumCulled = false; group.add(bMesh);
  // ---------- lanes (for traffic): along X and Z at offsets +-3.5 (right-hand traffic) ----------
  const lanes = [];
  for (let k = -NB - 1; k <= NB; k++) for (const off of [-5.25, -1.75, 1.75, 5.25]) { lanes.push({ axis: 'x', c: SL(k) + off, dir: off > 0 ? -1 : 1 }); lanes.push({ axis: 'z', c: SL(k) + off, dir: off > 0 ? 1 : -1 }); }
  // ---------- cars: body + cabin + wheels, instanced; per-car pose set by the shot (cars[i].{x,y,z,yaw,rx,rz}) ----------
  const NC = o.cars ?? 140, cars = [];
  const PAL = [0xd8d8d8, 0x1d1f24, 0xb21d1d, 0x2a4f9a, 0xe0b23a, 0x8a8f96, 0xf2f2ee, 0x2f6b4a, 0xd96a2b, 0x5a2a6a, 0x101010, 0xc7c0b0];
  for (let i = 0; i < NC; i++) {
    const L = lanes[Math.floor(R() * lanes.length)]; const s = (R() - 0.5) * 2 * (NB + 0.5) * PERIOD;
    const onX = L.axis === 'x'; let x = onX ? s : L.c, z = onX ? L.c : s;
    const nearJ = (v) => Math.abs(v - SL(Math.round((v - PERIOD / 2) / PERIOD))) < STREET * 0.5 + 3;          // keep junctions clear
    if (nearJ(onX ? x : z)) { i--; continue; }
    const kind = R(); cars.push({ x, y: 0, z, yaw: onX ? (L.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (L.dir > 0 ? 0 : Math.PI), lane: L, v: 6 + R() * 7, col: PAL[Math.floor(R() * PAL.length)],
      L: kind < 0.15 ? 9 : kind < 0.3 ? 5.2 : 4.4, H: kind < 0.15 ? 2.9 : kind < 0.3 ? 1.9 : 1.45, W: kind < 0.15 ? 2.5 : 1.85, rx: 0, rz: 0, ry: 0, seed: R() });
  }
  const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
  const wheelG = (() => { const g = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14); g.rotateZ(Math.PI / 2); return g; })();
  const bodyM = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.55 }), NC);
  const cabM = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.06, metalness: 0.9 }), NC);
  const whM = new THREE.InstancedMesh(wheelG, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }), NC * 4);
  for (const m of [bodyM, cabM, whM]) { m.castShadow = true; m.frustumCulled = false; group.add(m); }
  cars.forEach((c, i) => bodyM.setColorAt(i, new THREE.Color(c.col)));
  // ---------- trees: trunk + lumpy canopy ----------
  const trees = [];
  for (let k = -NB - 1; k <= NB; k++) for (let s = -(NB + 0.5) * PERIOD; s < (NB + 0.5) * PERIOD; s += 11 + R() * 4) {
    for (const side of [-1, 1]) { const off = side * (STREET * 0.5 - 1.6);
      const a = { x: s, z: SL(k) + off }, b = { x: SL(k) + off, z: s };
      for (const p of [a, b]) { const cc = (v) => Math.abs(v - SL(Math.round((v - PERIOD / 2) / PERIOD))); if (cc(p.x) < STREET * 0.5 + 2 && cc(p.z) < STREET * 0.5 + 2) continue; if (R() < 0.75) trees.push({ ...p, s: 0.8 + R() * 0.5, seed: R() }); } }
  }
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; trees.push({ x: Math.cos(a) * 34, z: Math.sin(a) * 34, s: 1.0 + R() * 0.3, seed: R() }); }     // plaza ring
  let canG = new THREE.IcosahedronGeometry(1, 5);
  { const p = canG.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);
      const k = 1 + 0.18 * Math.sin(v.x * 4.1 + v.y * 2.3) * Math.sin(v.z * 3.7 + 1.1) + 0.1 * Math.sin(v.y * 9.1 + v.x * 7.7); p.setXYZ(i, v.x * k * 2.6, v.y * k * 2.2 + 5.6, v.z * k * 2.6); } canG.computeVertexNormals(); }
  const trunkG = new THREE.CylinderGeometry(0.16, 0.24, 4.4, 8); trunkG.translate(0, 2.2, 0);
  const canM = new THREE.InstancedMesh(canG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), trees.length);
  const trM = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9 }), trees.length);
  trees.forEach((t, i) => { m4.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromEuler(e.set(0, t.seed * 6.28, 0)), new THREE.Vector3(t.s, t.s, t.s)); canM.setMatrixAt(i, m4); trM.setMatrixAt(i, m4);
    canM.setColorAt(i, new THREE.Color().setHSL(0.24 + 0.08 * t.seed, 0.45 + 0.2 * t.seed, 0.22 + 0.1 * t.seed)); });
  for (const m of [canM, trM]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
  // ---------- street lamps (static) ----------
  const lampP = []; for (let k = -NB - 1; k <= NB; k++) for (let s = -(NB + 0.5) * PERIOD; s < (NB + 0.5) * PERIOD; s += 30) for (const side of [-1, 1]) { const off = side * (STREET * 0.5 - 0.6); lampP.push([s + 7, SL(k) + off], [SL(k) + off, s + 7]); }
  const poleG = new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6); poleG.translate(0, 3.75, 0);
  const poles = new THREE.InstancedMesh(poleG, new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.5, metalness: 0.6 }), lampP.length);
  lampP.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); poles.setMatrixAt(i, m4); }); poles.castShadow = true; poles.frustumCulled = false; group.add(poles);
  // ---------- loose props: benches, bins, planters, cafe tables (liftable) ----------
  const props = [];
  for (let i = 0; i < (o.props ?? 220); i++) { const a = R() * Math.PI * 2, r = 8 + R() * 30;
    let x = Math.cos(a) * r, z = Math.sin(a) * r; if (R() < 0.45) { const k = Math.floor(R() * (2 * NB + 2)) - NB - 1, s = (R() - 0.5) * 2 * NB * PERIOD, off = (R() < 0.5 ? -1 : 1) * (STREET * 0.5 - 2.6); if (R() < 0.5) { x = s; z = SL(k) + off; } else { x = SL(k) + off; z = s; } }
    if (Math.hypot(x, z) < 7.5) continue;
    const t = R(); props.push({ x, y: 0, z, yaw: R() * 6.28, rx: 0, rz: 0, ry: 0, kind: t < 0.35 ? 0 : t < 0.6 ? 1 : t < 0.8 ? 2 : 3, seed: R(),
      dims: t < 0.35 ? [1.8, 0.85, 0.6] : t < 0.6 ? [0.55, 1.0, 0.55] : t < 0.8 ? [1.2, 0.7, 1.2] : [0.8, 0.75, 0.8] }); }
  const PCOL = [0x6a4a30, 0x2d4a33, 0x8a7a68, 0xf2f2ee];
  const propM = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), props.length);
  props.forEach((p, i) => propM.setColorAt(i, new THREE.Color(PCOL[p.kind]))); propM.castShadow = true; propM.frustumCulled = false; group.add(propM);
  // ---------- fountain: basin + water disc + jet droplets (liftable water) ----------
  const basin = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.45, 10, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.7 })); basin.position.y = 0.45; basin.castShadow = true; group.add(basin);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2e7f93, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48).rotateX(-Math.PI / 2), waterMat); disc.position.y = 0.55; group.add(disc);
  const ND = 1600, drops = []; for (let i = 0; i < ND; i++) drops.push({ a: R() * 6.28, r: Math.pow(R(), 0.6) * 5.6, ph: R(), s: 0.04 + R() * 0.1, jet: R() < 0.6 });
  const dropM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xdff4fa, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: 0x6a8a94, emissiveIntensity: 0.25 }), ND);
  dropM.frustumCulled = false; group.add(dropM);
  const v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  const api = { group, cars, props, trees, lanes, buildings: B, bodyM, cabM, whM, propM, disc, dropM, drops,
    ground: () => 0,
    // place everything; lift(h): vertical offset for loose things at this instant (metres), spin: tumble scale (rad), time t
    update(t, st = {}) {
      const L = st.lift ?? 0, tumble = st.tumble ?? 0;
      cars.forEach((c, i) => {
        q.setFromEuler(e.set(c.rx * tumble, c.yaw + c.ry * tumble, c.rz * tumble, 'YXZ'));
        const base = v3.set(c.x, c.y + L * (c.liftK ?? 1), c.z);
        m4.compose(base.clone().add(new THREE.Vector3(0, 0.32, 0).applyQuaternion(q)), q, sc.set(c.W, c.H * 0.55, c.L)); bodyM.setMatrixAt(i, m4);
        m4.compose(base.clone().add(new THREE.Vector3(0, 0.32 + c.H * 0.55, -c.L * 0.06).applyQuaternion(q)), q, sc.set(c.W * 0.86, c.H * 0.45, c.L * 0.5)); cabM.setMatrixAt(i, m4);
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], k) => { m4.compose(base.clone().add(new THREE.Vector3(sx * c.W * 0.45, 0.34, sz * c.L * 0.33).applyQuaternion(q)), q, sc.set(1, 1, 1)); whM.setMatrixAt(i * 4 + k, m4); });
      });
      bodyM.instanceMatrix.needsUpdate = cabM.instanceMatrix.needsUpdate = whM.instanceMatrix.needsUpdate = true;
      props.forEach((p, i) => { q.setFromEuler(e.set(p.rx * tumble, p.yaw + p.ry * tumble, p.rz * tumble)); m4.compose(v3.set(p.x, p.y + L * (p.liftK ?? 1), p.z), q, sc.set(...p.dims)); propM.setMatrixAt(i, m4); });
      propM.instanceMatrix.needsUpdate = true;
      // fountain: before the flip a splashing jet; after, the whole pool lifts as a wobbling slab of water + droplets
      const wl = st.waterLift ?? L, jetOn = L <= 0.001;
      disc.position.y = 0.55 + wl; disc.scale.setScalar(1 + 0.04 * Math.sin(t * 3.1) * Math.min(1, wl));
      drops.forEach((d, i) => {
        let x = Math.cos(d.a) * d.r, z = Math.sin(d.a) * d.r, y;
        if (jetOn && d.jet) { const ph = (t * 0.45 + d.ph) % 1; const rr = 0.15 + ph * (1.2 + 2.4 * ((d.a * 7.1) % 1)); x = Math.cos(d.a) * rr; z = Math.sin(d.a) * rr; y = 0.6 + 7.5 * 4 * ph * (1 - ph); }
        else { y = 0.6 + wl + (d.jet ? (d.ph - 0.3) * 6 * Math.min(1, wl / 3) : Math.sin(t * 2 + d.ph * 6) * 0.15 * Math.min(1, wl)); }
        m4.compose(v3.set(x, y, z), q.identity(), sc.setScalar(jetOn && !d.jet ? 0.0001 : d.s)); dropM.setMatrixAt(i, m4);
      });
      dropM.instanceMatrix.needsUpdate = true;
    },
  };
  return api;
}
// The one law of the gravity flip (vacuum is right here: the air falls up with everything, so there is no drag):
//   0..T s: everything loose accelerates UP at g; then gravity returns: it coasts up to 2x the height, then falls back.
export const G = 9.81;
export function liftH(tau, T = 5) {
  if (tau <= 0) return 0;
  const v = G * T, h1 = 0.5 * G * T * T;                                   // 49.05 m/s, 122.6 m at the end of the flip
  if (tau <= T) return 0.5 * G * tau * tau;
  if (tau <= 2 * T) { const s = tau - T; return h1 + v * s - 0.5 * G * s * s; }   // apex 245.25 m at 2T
  const s = tau - 2 * T, h = 2 * h1 - 0.5 * G * s * s; return Math.max(0, h);   // lands at 2T + 7.07 s
}
export function liftV(tau, T = 5) { if (tau <= 0) return 0; if (tau <= T) return G * tau; if (tau <= 2 * T) return G * T - G * (tau - T); return -G * (tau - 2 * T); }
