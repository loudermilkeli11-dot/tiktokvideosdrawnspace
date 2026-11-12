// tsunami-524 lead kit: the FJORD BAY set (noon). The studio's horseshoe bay (bay.js: town, promenade, pier, lighthouse) opened
// through its mouth into an outer fjord closed by Alaska-style mountains (forest, rock, snow) that ring the whole bay.
// Pieces: mountains (one JS height function + a shaded mesh, with a TRIMLINE: forest stripped below the water's highest
// reach, the real Lituya signature), the carved outer fjord (bay terrain + ocean ground), the rockfall (slab, scar, dust),
// the mega-wave (engine/src/megawave.js) on one front law, the run-up sheet (s02), boats, gulls, the pier crowd + hero.
// World: metres, +Y up. Lagoon centre (0,-800) r 800; mouth at z ~ -1650; outer fjord box centre (0,-2950), half (1400,1250);
// the head wall rises from z ~ -4200. Camera home for frame 1: FRAME1_CAM (behind the hero at the pier rail, looking out).
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean, waveHeight, waveSlope } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH as bayGround, sField } from '@engine/bay.js';
import { createBoats, createSpray } from '@engine/splash.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { createMegaWave } from '@engine/megawave.js';
import { NOISE } from '@engine/glsl.js';
import { rng, clamp, sstep, hash2, lerp, fbm } from '@engine/util.js';
import { SHOT, T, waveH, runupAt, RUNUP } from './story.js';

export { createStudio, THREE, sField };
export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(location.search);
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
export const dirB = (b) => new THREE.Vector3(Math.sin(b * D2R), 0, -Math.cos(b * D2R));
// noon sun from the right and a little behind the frame-1 camera (bearing 118), 38 deg up: the head wall and the wave face are
// lit, and the side light carves the mountains' relief
export const SUN = dirB(qn('sunB', 118)).multiplyScalar(Math.cos(38 * D2R)).setY(Math.sin(38 * D2R)).normalize();
// daywear palette (as gravity-flip)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a);

// ---------------- geography ----------------
const FJ = { cx: 0, cz: -2950, hx: 1400, hz: 1250, r: 650 };
const vn2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(i, j), hash2(i + 1, j), u), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), u), v); };
const fbm2 = (x, z, o = 5) => { let s = 0, a = 0.5, n = 0; for (let k = 0; k < o; k++) { s += a * vn2(x, z); n += a; x = x * 2.03 + 1.7; z = z * 2.03 + 9.2; a *= 0.5; } return s / n; };
const ridged = (x, z) => { let s = 0, a = 0.5, n = 0; for (let k = 0; k < 5; k++) { const r = 1 - Math.abs(2 * vn2(x, z) - 1); s += a * r * r; n += a; x = x * 2.1 + 3.3; z = z * 2.1 + 7.7; a *= 0.5; } return s / n; };
// signed distance to the outer fjord water (rounded box, a wobbly shore); + = outside
export function fjF(x, z) {
  const dx = Math.abs(x - FJ.cx) - (FJ.hx - FJ.r), dz = Math.abs(z - FJ.cz) - (FJ.hz - FJ.r);
  const d = Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0) - FJ.r;
  return d + 140 * (fbm2(x / 900, z / 900) - 0.5);
}
// the water body for the mountains: lagoon (bay sField) OR outer fjord, whichever is nearer
// (the bay's own field opens to an endless sea past the mouth: clip it at z = -1700, where the outer fjord takes over)
const waterF = (x, z) => Math.min(Math.max(sField(x, z), -(z + 1700)), fjF(x, z));
// mountain height (m): rise from the shore of the outer fjord, and from behind the town around the lagoon
export function mountH(x, z) {
  const off = 330 * sstep(-2050, -1450, z);                 // around the lagoon the range starts behind the town
  const d = waterF(x, z) - off; if (d <= 0) return -120;
  const A = 2150 * (0.75 + 0.5 * fbm2(x / 5200 + 7.3, z / 5200 + 2.1));
  const base = A * (1 - Math.exp(-d / (700 + 500 * fbm2(x / 2600, z / 2600 + 4.4))));
  const r = ridged(x / 1700 + 3.1, z / 1700 + 1.7);
  return base * (0.3 + 0.95 * Math.pow(r, 1.25)) + 70 * (fbm2(x / 240, z / 240) - 0.5) * sstep(0, 300, d) - 20;
}
// carved ground: the bay's ground, with the outer fjord dug out to a deep basin (the bay alone has open sea there)
const carveK = (x, z) => sstep(30, -260, fjF(x, z)) * sstep(-1640, -1760, z);
export const groundT = (x, z) => { const g = bayGround(x, z), k = carveK(x, z); return k > 0 ? lerp(g, Math.min(g, -60), k) : g; };
export const groundAll = (x, z) => Math.max(groundT(x, z), mountH(x, z));
const f3 = (v) => v.toFixed(3);
export const GROUND_FJ = GROUND_GLSL.replace('float groundH(vec2 p){', 'float groundH0(vec2 p){') + `
float fjF_(vec2 p){ vec2 d = abs(p - vec2(${f3(FJ.cx)}, ${f3(FJ.cz)})) - vec2(${f3(FJ.hx - FJ.r)}, ${f3(FJ.hz - FJ.r)});
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - ${f3(FJ.r)}; }
float groundH(vec2 p){ float g = groundH0(p); float k = sstep_(60., -260., fjF_(p))*sstep_(-1640., -1760., p.y); return mix(g, min(g, -60.), k); }`;

// ---------------- mountains ----------------
export function createMountains(S, o = {}) {
  const NU = o.nu ?? 440, NV = o.nv ?? 440, X = 12000, Z0 = -13000, Z1 = 9000, ZC = -1500;
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3); let k = 0;
  const mapc = (u, half) => Math.sign(u) * Math.pow(Math.abs(u), 1.55) * half;
  for (let j = 0; j <= NV; j++) { const v = j / NV * 2 - 1; const z = ZC + (v < 0 ? mapc(v, ZC - Z0) : mapc(v, Z1 - ZC));
    for (let i = 0; i <= NU; i++) { const x = mapc(i / NU * 2 - 1, X); pos[k++] = x; pos[k++] = mountH(x, z); pos[k++] = z; } }
  const idx = []; for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  { const n = g.attributes.normal; for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
  const rockD = S.tex('rock_diff_1k.jpg', { repeat: true }), rockN = S.tex('rock_nor_gl_1k.jpg', { repeat: true, srgb: false });
  const U = { stripG: { value: -1e4 }, stripA: { value: new THREE.Vector4(0, 0, 1, -1e4) }, waterY: { value: 0 }, time: { value: 0 }, wetY: { value: -1e4 },
    rockD: { value: rockD }, rockN: { value: rockN }, snowY: { value: o.snowY ?? 1250 }, treeY: { value: o.treeY ?? 820 } };
  const mat = mountainMaterial(U);
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; S.scene.add(mesh);
  return { mesh, U };
}
// the mountain surface. rest: shade from a fixed 'rest' placement (restM) so a moving piece (the slab) keeps the look of the
// patch of mountain it came from instead of swimming through the world-space pattern
export function mountainMaterial(U, rest = null) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  if (rest) mat.customProgramCacheKey = () => 'mtn-rest';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); if (rest) sh.uniforms.restM = { value: rest };
    const M = rest ? 'restM' : 'modelMatrix';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vWp; varying vec3 vWn; ${rest ? 'uniform mat4 restM;' : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWp = (${M}*vec4(transformed,1.)).xyz; vWn = normalize(mat3(${M})*objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      ${NOISE}
      uniform sampler2D rockD, rockN; uniform float stripG, waterY, time, snowY, treeY, wetY; uniform vec4 stripA; varying vec3 vWp; varying vec3 vWn;
      float mRough;`)
      .replace('#include <map_fragment>', `
        { vec3 p = vWp; float slope = 1. - vWn.y; float dist = length(p - cameraPosition);
          vec3 tw = pow(abs(vWn), vec3(4.)); tw /= tw.x + tw.y + tw.z;
          vec3 rk = texture2D(rockD, p.zy/70.).rgb*tw.x + texture2D(rockD, p.xz/70.).rgb*tw.y + texture2D(rockD, p.xy/70.).rgb*tw.z;
          vec3 rk2 = texture2D(rockD, p.xz/530. + p.y/700.).rgb;
          vec3 rock = mix(vec3(0.30,0.29,0.28), vec3(0.42,0.39,0.35), fbm2(p.xz*0.004)) * (rk*0.7 + 0.45) * (rk2*0.6 + 0.6);
          float n1 = fbm2(p.xz*0.012), n2 = fbm2(p.xz*0.09 + 3.), n3 = vn2(p.xz*0.55);
          // conifer forest: dark green canopy with crowns (speckle), thinning toward the tree line and on steep rock
          vec3 forest = mix(vec3(0.04,0.07,0.045), vec3(0.085,0.125,0.07), n2) * (0.6 + 0.65*n3*(1. - smoothstep(800., 3500., dist)));
          float chute = smoothstep(0.62, 0.75, fbm2(vec2(p.x/70. + p.z/90., p.y/520.) + 2.));      // avalanche chutes: paler alder strips downhill
          forest = mix(forest, vec3(0.13,0.17,0.08)*(0.8 + 0.3*n3), chute*0.8);
          float treeLine = treeY + 160.*(n1 - 0.5);
          float outc = smoothstep(0.66, 0.74, fbm2(p.xz*0.0045 + 9.) + 0.25*(n2 - 0.5));             // rock outcrops in the forest
          float fM = (1. - smoothstep(treeLine - 90., treeLine + 60., p.y)) * (1. - smoothstep(0.5, 0.72, slope + 0.2*(n2 - 0.5))) * (1. - outc);
          vec3 c = mix(rock, forest, fM);
          // alpine meadow / scree between forest and snow
          c = mix(c, mix(c, vec3(0.25,0.27,0.17), 0.5), (1. - fM)*(1. - smoothstep(treeLine + 100., treeLine + 380., p.y))*(1. - smoothstep(0.35, 0.6, slope)));
          // snow: above the snow line, on the gentler faces, wind-scoured edges
          float sl = snowY + 220.*(n1 - 0.5);
          float sM = smoothstep(sl - 60., sl + 120., p.y) * (1. - smoothstep(0.55, 0.78, slope + 0.25*(n2 - 0.5)));
          c = mix(c, vec3(0.86,0.89,0.94)*(0.9 + 0.15*n2), sM);
          // the TRIMLINE: everything the water reached is stripped to bare, wet soil and rock (the real Lituya signature)
          float lim = max(stripG, stripA.w*(1. - smoothstep(stripA.z*0.75, stripA.z, length(p.xz - stripA.xy))));
          float tr = (1. - smoothstep(lim - 6., lim + 6. + 18.*(n2 - 0.5), p.y)) * step(-50., lim);
          vec3 bare = mix(vec3(0.24,0.20,0.15), vec3(0.36,0.31,0.24), n2) * (0.75 + 0.4*n3);
          bare = mix(bare, rock*0.8, smoothstep(0.5, 0.75, slope));
          float wet = 1. - smoothstep(wetY - 30., wetY + 10., p.y);
          c = mix(c, bare*mix(1., 0.62, wet), tr*(1. - sM*0.6));
          // a line of foam where the water stands on the slopes
          float fl = smoothstep(waterY - 2., waterY + 3., p.y)*(1. - smoothstep(waterY + 3., waterY + 14. + 10.*n2, p.y))*step(1., waterY);
          c = mix(c, vec3(0.9,0.93,0.95), fl*smoothstep(0.35, 0.6, n3 + 0.2));
          mRough = mix(0.95, 0.5, sM*0.4 + wet*tr*0.6);
          diffuseColor.rgb *= c; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 tw = pow(abs(vWn), vec3(4.)); tw /= tw.x + tw.y + tw.z; vec3 p = vWp;
          vec3 a = texture2D(rockN, p.zy/45.).xyz*2.-1., b = texture2D(rockN, p.xz/45.).xyz*2.-1., c2 = texture2D(rockN, p.xy/45.).xyz*2.-1.;
          vec3 wn = vec3(0., a.y, a.x)*tw.x + vec3(b.x, 0., b.y)*tw.y + vec3(c2.x, c2.y, 0.)*tw.z;
          float fade = 1. - smoothstep(600., 6000., length(p - cameraPosition));
          normal = normalize(normal + (viewMatrix*vec4(wn, 0.)).xyz*(0.35 + 0.4*fade)); }`);
  };
  return mat;
}

// ---------------- the wave's one front law (film time -> local z of the crest line) ----------------
// impact at the head (z -4120) at T.impact; the lighthouse (z -1690) at T.lighthouse; the town front (z ~ +10) at T.roofs.
// (the face runs ~0.22 H ahead of the crest line, so the crest is that far short of the tower when the face swallows it)
const FK = [[T.impact, -4180], [T.lighthouse, -1640 - 0.22 * RUNUP], [T.roofs, 10], [T.roofs + 2.0, 900]];
export function frontZ(t) {
  if (t <= FK[0][0]) return FK[0][1] + (t - FK[0][0]) * 480;
  for (let i = 1; i < FK.length; i++) if (t <= FK[i][0]) { const [t0, z0] = FK[i - 1], [t1, z1] = FK[i]; return lerp(z0, z1, (t - t0) / (t1 - t0)); }
  const [t0, z0] = FK[FK.length - 2], [t1, z1] = FK[FK.length - 1]; return z1 + (t - t1) * (z1 - z0) / (t1 - t0);
}
// the lighthouse stands on the right headland's crest (searched near bay.js's spot, so the hill never hides it from the bay)
export const LIGHTHOUSE = (() => { let best = null;
  for (let x = 170; x <= 420; x += 10) for (let z = -1760; z <= -1440; z += 10) { const s = sField(x, z); if (s < 15 || s > 90) continue;
    const sc = groundT(x, z) - 0.1 * Math.hypot(x - 245, z + 1690); if (!best || sc > best.sc) best = { x, z, sc }; }
  return { x: best.x, z: best.z }; })();

// ---------------- the lighthouse: a 38 m red-and-white tower alone on the right headland (replaces bay.js's small white one) ----
export const LH_H = 38;
function makeLighthouse(S, bay) {
  bay.group.children.forEach((c) => { if (c.geometry?.parameters?.height === 22 && c.geometry.type === 'CylinderGeometry') c.visible = false; });
  { const m4 = new THREE.Matrix4().makeScale(0, 0, 0); bay.glow.setMatrixAt(bay.glow.count - 1, m4); bay.glow.instanceMatrix.needsUpdate = true; }
  const g = new THREE.Group(), y0 = groundT(LIGHTHOUSE.x, LIGHTHOUSE.z) - 1.5; g.position.set(LIGHTHOUSE.x, y0, LIGHTHOUSE.z);
  const red = new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.55 }), white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.4, metalness: 0.6 });
  const NB = 6, hb = 32 / NB;
  for (let i = 0; i < NB; i++) { const r0 = 4.2 - i * hb * 0.045, r1 = 4.2 - (i + 1) * hb * 0.045;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, hb, 24), i % 2 ? red : white); m.position.y = (i + 0.5) * hb; g.add(m); }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 3.4, 0.8, 24), dark); gal.position.y = 32.4; g.add(gal);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.4, 16), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1, metalness: 0.2, emissive: 0xfff2c0, emissiveIntensity: 0.6 })); lan.position.y = 34.5; g.add(lan);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.position.y = 36.2; g.add(dome);
  const house = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 8), white); house.position.set(-9, 3, 4); g.add(house);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.2, 3.2, 4, 1).rotateY(Math.PI / 4).scale(1.2, 1, 0.85), red); roof.position.set(-9, 7.6, 4); g.add(roof);
  S.scene.add(g); return g;
}

// ---------------- the world ----------------
export function makeWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', o.envI ?? 0.6);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
  sky.U.dayZen.value.set(0x2a68cc); sky.U.dayHor.value.set(0xaccfee);
  scene.fog = new THREE.Fog(0xa9c8e6, o.fogNear ?? 1800, o.fogFar ?? 52000);
  const ocean = createOcean(S, { amp: o.amp ?? 0.7, level: 0, groundGLSL: GROUND_FJ, deep: 0x0a4a5e, shallow: 0x2a9fa6, amb: 0x5f93b8, reflScale: o.reflScale ?? 0.25,
    foam: 0.9, rings: 400, segs: 360, slab: !!o.slab });
  ocean.add(scene);
  const OU = ocean.U; OU.sunCol.value.set(0xfff4e2); OU.sunDir.value.copy(SUN); OU.sunI.value = 1; OU.moonI.value = 0;
  const bay = createBay(S, { shadows: !!o.shadows, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0.0, moonLightI: 3.1, hemiI: 1.25, beamI: 0.0, boats: 0 });
  bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xb4d2f2); bay.hemi.groundColor.set(0x7c7058);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0; bay.beam.visible = false;
  if (o.shadows) { const sc = bay.moonLight.shadow.camera; Object.assign(sc, { left: -60, right: 60, top: 60, bottom: -60, far: 900 }); sc.updateProjectionMatrix(); bay.moonLight.shadow.mapSize.set(2048, 2048); }
  // carve the outer fjord into the bay terrain (its ground says open sea + low land there)
  { const p = bay.terrain.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (z < -1600) p.setY(i, groundT(x, z)); }
    p.needsUpdate = true; bay.terrain.geometry.computeVertexNormals(); }
  // drop the bay's buildings that would stand in the outer fjord water or inside the mountains
  { const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), M = bay.buildings;
    for (let i = 0; i < M.count; i++) { M.getMatrixAt(i, m4); m4.decompose(v, q, s);
      if (groundT(v.x, v.z) < 1 || mountH(v.x, v.z) > v.y + 2 || Math.hypot(v.x - LIGHTHOUSE.x, v.z - LIGHTHOUSE.z) < 150) { m4.makeScale(0, 0, 0); M.setMatrixAt(i, m4); } }
    M.instanceMatrix.needsUpdate = true;
    // their rooftop clutter (tanks, AC boxes, antennas) goes with them
    const RT = bay.group.children.find((c) => c.isInstancedMesh && c !== M && c.material?.color?.getHex?.() === 0x2a2a2c);
    if (RT) { for (let i = 0; i < RT.count; i++) { RT.getMatrixAt(i, m4); m4.decompose(v, q, s); const g = groundT(v.x, v.z);
      if (g < 1 || mountH(v.x, v.z) > g + 1 || Math.hypot(v.x - LIGHTHOUSE.x, v.z - LIGHTHOUSE.z) < 150) { m4.makeScale(0, 0, 0); RT.setMatrixAt(i, m4); } }
      RT.instanceMatrix.needsUpdate = true; } }
  const MT = createMountains(S, o.mountains);
  const LH = makeLighthouse(S, bay);
  // ---- moored boats on the lagoon (coloured; bob on the swell) ----
  const BR = rng(o.boatSeed ?? 14), boats = [], nb = o.boats ?? 14;
  for (let i = 0; i < 5000 && boats.length < nb; i++) { const x = (BR() * 2 - 1) * 420, z = -1450 + BR() * 1330;
    if (sField(x, z) > -40 || boats.some((b) => Math.hypot(b.x - x, b.z - z) < 45) || (Math.abs(x + 60) < 25 && z > -190)) continue;
    boats.push({ x, z, yaw: BR() * 6.28, L: 7 + BR() * 9, ph: BR() * 6, spin: (BR() - 0.5) * 1.6 }); }
  const BT = createBoats(S, Math.max(boats.length, 1), { seed: 9 });
  const bq = new THREE.Quaternion(), be = new THREE.Euler(), bp = new THREE.Vector3();
  function placeBoats(t, f = () => null) {
    boats.forEach((b, i) => { const r = f(b, i, t); if (r === false) { BT.hide(i); return; }
      if (r) { BT.setBoat(i, r.p, r.q, b.L); return; }
      const y = waveHeight(b.x, b.z, t, OU.amp.value, OU.level.value) + 0.1; const [gx, gz] = waveSlope(b.x, b.z, t, OU.amp.value);
      bq.setFromEuler(be.set(Math.atan(gz) * 0.8, b.yaw, -Math.atan(gx) * 0.8, 'YXZ')); BT.setBoat(i, bp.set(b.x, y, b.z), bq, b.L); });
    BT.commit();
  }
  function update(t, st = {}) {
    sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    ocean.mesh.update(S, t);
    bay.update(S, t, { waveAmp: OU.amp.value, level: OU.level.value, moonDir: SUN, moonLightI: 3.1, shadowCenter: st.shadowCenter || S.camera.position.clone() });
    MT.U.time.value = t;
  }
  return { sky, ocean, OU, bay, MT, LH, boats, BT, placeBoats, update };
}

// ---------------- the mega-wave on the front law ----------------
export function makeWave(S, o = {}) {
  const MW = createMegaWave(S, { len: o.len ?? 9000, cols: o.cols ?? 300, seed: o.seed ?? 5, flow: o.flow ?? 45 });
  MW.U.sunI.value = 1.0;
  // the wave's state at film time t (H from the law; the shape develops as it travels)
  const stAt = (t, ov = {}) => ({ H: ov.H ?? Math.max(waveH(t), 1), front: ov.front ?? frontZ(t), curl: ov.curl ?? clamp(0.35 + 0.18 * (t - T.impact), 0.3, 0.85),
    lean: ov.lean ?? 0, bend: ov.bend ?? 1 / (2 * 9000), time: t, sunDir: SUN });
  return { MW, stAt, set: (t, ov) => { const s = stAt(t, ov); MW.set(s); return s; } };
}
// spray thrown off the lip and boiling up at the toe, born along the wave's own lip (precomputed for a film-time window)
export function makeWaveSpray(S, W, MW, stAt, t0, t1, o = {}) {
  const R = rng(o.seed ?? 77), parts = [], xs = o.xs ?? [-1600, 1600], dx = o.dx ?? 40, dt = o.dt ?? 0.12, page = (ft) => ft - (o.film0 ?? 0) + 4;
  for (let ft = t0; ft < t1; ft += dt) { const st = stAt(ft);
    for (let x = xs[0]; x <= xs[1]; x += dx) { const xj = x + (R() - 0.5) * dx;
      const lip = MW.lipAt(xj, st, 8), crest = MW.lipAt(xj, st, 5), toe = MW.lipAt(xj, st, 15), H = st.H;
      const fw = (o.fwdV ?? 0.55) * H;
      for (let k = 0; k < (o.nLip ?? 3); k++) { const kind = R() < 0.6 ? 1 : R() < 0.5 ? 0 : 2;
        parts.push({ p: [lip.x + (R() - 0.5) * 20, lip.y, lip.z + R() * 10], v: [(R() - 0.5) * 30, -H * 0.05 + R() * 0.25 * H * 0.3, fw * (0.4 + 0.6 * R())],
          t0: page(ft + R() * dt), size: (kind === 1 ? 0.07 : kind === 0 ? 0.012 : 0.13) * H * (0.6 + 0.8 * R()), drag: kind === 2 ? 1.1 : 0.6, life: 2.6, kind, shade: 0.95 }); }
      if (R() < (o.crestP ?? 0.6)) parts.push({ p: [crest.x, crest.y + 0.02 * H, crest.z], v: [(R() - 0.5) * 20, 0.08 * H * R(), -0.1 * H * R()],   // spindrift off the crest
        t0: page(ft + R() * dt), size: 0.09 * H * (0.6 + 0.8 * R()), drag: 1.4, life: 2.2, kind: 2, shade: 1.0 });
      for (let k = 0; k < (o.nToe ?? 2); k++) parts.push({ p: [toe.x + (R() - 0.5) * 30, Math.max(toe.y, 0) + R() * 0.05 * H, toe.z + 0.06 * H], v: [(R() - 0.5) * 40, 0.18 * H * (0.4 + R()), fw * 0.8 * R()],
        t0: page(ft + R() * dt), size: 0.07 * H * (0.6 + 0.8 * R()), drag: 0.9, life: 2.4, kind: R() < 0.5 ? 1 : 2, shade: 0.9 }); } }
  const sp = createSpray(S, parts.length ? parts : [{ p: [0, -500, 0], v: [0, 0, 0], t0: 1e5, size: 1 }], { hazeD: o.hazeD ?? 9000 });
  sp.U.sunDir.value.copy(SUN); sp.U.streak.value = 1 / 20; sp.U.amb.value.set(0x7f9fc0);
  const ob = W.ocean.refl.onBeforeRender; W.ocean.refl.onBeforeRender = (r, sc, cam) => { sp.mesh.visible = false; ob(r, sc, cam); sp.mesh.visible = true; };
  sp.count = parts.length; return sp;
}

// ---------------- the rockfall: a slab on the head wall right of centre, the scar behind it, dust ----------------
export function makeRockfall(S, W, o = {}) {
  const X = o.x ?? 430, YC = o.y ?? 430;
  let z = -4200; for (let lo = -4200, hi = -7000, k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (mountH(X, m) < YC) lo = m; else hi = m; z = m; }
  const e = 12, gx = (mountH(X + e, z) - mountH(X - e, z)) / (2 * e), gz = (mountH(X, z + e) - mountH(X, z - e)) / (2 * e);
  const N = new THREE.Vector3(-gx, 1, -gz).normalize(), down = new THREE.Vector3(gx, gx * gx + gz * gz, gz).negate().normalize();
  const base = new THREE.Vector3(X, YC, z);
  const across = new THREE.Vector3().crossVectors(N, down).normalize();
  const basis = new THREE.Matrix4().makeBasis(across, down.clone().negate(), N);
  // an irregular chunk of the forested mountainside: forest on its face, pale fresh rock on its broken edges
  const outline = (sx, sy, seed) => { const sh = new THREE.Shape(); for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2;
    const r = 1 + 0.16 * fbm(a * 1.7 + seed, seed) + 0.07 * Math.sin(a * 7 + seed); const x = Math.cos(a) * sx * r, y = Math.sin(a) * sy * r * (a > Math.PI ? 0.85 : 1);
    k ? sh.lineTo(x, y) : sh.moveTo(x, y); } return sh; };
  const W2 = (o.w ?? 560) / 2, H2 = (o.h ?? 330) / 2;
  const geo = new THREE.ExtrudeGeometry(outline(W2, H2, 3), { depth: 70, bevelEnabled: false, curveSegments: 1 }); geo.translate(0, 0, -70);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 14 * fbm(x * 0.02 + y * 0.013, 3)); } geo.computeVertexNormals(); }
  const rockD = S.tex('rock_diff_1k.jpg', { repeat: true });
  const restM = new THREE.Matrix4().compose(base.clone().addScaledVector(N, 40), new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3(1, 1, 1));
  const slab = new THREE.Mesh(geo, mountainMaterial(W.MT.U, restM)); slab.frustumCulled = false; S.scene.add(slab);
  const scar = new THREE.Mesh(new THREE.ShapeGeometry(outline(W2 * 1.02, H2 * 1.04, 3)), new THREE.MeshStandardMaterial({ color: 0x9a9182, roughness: 0.95, map: rockD }));
  scar.quaternion.setFromRotationMatrix(basis); scar.position.copy(base).addScaledVector(N, 26); S.scene.add(scar);
  const crack = new THREE.Mesh(new THREE.ShapeGeometry(outline(W2 * 1.075, H2 * 1.1, 3)), new THREE.MeshBasicMaterial({ color: 0x0d0b0a }));
  crack.quaternion.copy(scar.quaternion); crack.position.copy(base).addScaledVector(N, 19); S.scene.add(crack);
  // dust + rock spray: sparse grey-brown clumps shed from the slab's foot and edges as it slides (not smoke: they fall)
  const R = rng(o.seed ?? 21), parts = [];
  const slideAt = (ft) => { const u = Math.max(ft - (o.tStart ?? -0.12), 0); return 0.5 * (o.acc ?? 330) * u * u; };
  const posAt = (ft) => base.clone().addScaledVector(down, slideAt(ft));
  for (let ft = -0.1; ft < T.impact + 0.25; ft += 0.05) { const P = posAt(ft); const sv = (o.acc ?? 330) * Math.max(ft + 0.12, 0);
    for (let k = 0; k < 6; k++) { const a = (R() - 0.5) * (o.w ?? 560) * 0.9, foot = R() < 0.65, rock = R() < 0.45;
      const p = P.clone().addScaledVector(across, a).addScaledVector(down, foot ? H2 * 0.9 : (R() - 0.5) * H2 * 2).addScaledVector(N, 20 + R() * 30);
      const v = down.clone().multiplyScalar(sv * (rock ? 0.6 + 0.4 * R() : 0.15 + 0.3 * R())).addScaledVector(N, rock ? 30 * R() : 15 + 35 * R()).add(new THREE.Vector3(0, rock ? 0 : 25 * R(), 0));
      parts.push({ p: p.toArray(), v: v.toArray(), t0: ft + 4 + R() * 0.05, size: rock ? 5 + 7 * R() : 14 + 30 * R(), drag: rock ? 0.15 : 1.1, life: rock ? 2 : 2.6, kind: rock ? 0 : (R() < 0.7 ? 1 : 2), shade: rock ? 0.22 : 0.42 + 0.15 * R() }); } }
  const dust = createSpray(S, parts, { hazeD: 14000 }); dust.U.sunDir.value.copy(SUN); dust.U.amb.value.set(0x8a7e6e); dust.U.sunCol.value.setRGB(0.95, 0.85, 0.72);
  const q0 = new THREE.Quaternion().setFromRotationMatrix(basis), qt = new THREE.Quaternion(), ax = across.clone();
  return { base, down, N, across, posAt, slab, scar, dust,
    update(ft) {       // film time
      const P = posAt(ft); slab.position.copy(P).addScaledVector(N, 40); slab.quaternion.copy(q0).premultiply(qt.setFromAxisAngle(ax, -0.25 * sstep(0.3, T.impact, ft)));
      slab.visible = ft < T.impact + 0.15; dust.update(ft + 4);
      // the crack: a dark seam opens round the slab (it heaves out a little) just before it slides
      const op = sstep(-0.35, 0.05, ft); crack.visible = op > 0.01; crack.scale.setScalar(0.93 + 0.07 * op);
      slab.position.addScaledVector(N, 8 * op);
    } };
}

// ---------------- frame 1: the pier crowd + the hero, gulls ----------------
export const HERO_D = 132, CAM_D = 113;
export function makePierPeople(S, W, o = {}) {
  const P = W.bay.pier, DECK = P.deckY;
  const R = rng(o.seed ?? 41), people = [];
  // along both rails ahead of the camera, a knot at the pier end, a few on the deck behind the hero (out of shot)
  for (let i = 0; i < 600 && people.length < (o.n ?? 30); i++) { const d = HERO_D + 3.5 + R() * 16, side = R() < 0.5 ? -1 : 1, rail = R() < 0.7;
    const lx = rail ? side * (1.8 + R() * 0.35) : (R() - 0.5) * 3.2;
    if (people.some((p) => Math.hypot(p.lx - lx, p.d - d) < 0.75)) continue;
    const w = P.toWorld(lx, DECK, -d); people.push({ x: w.x, y: DECK, z: w.z, lx, d, yaw: P.yaw + (R() - 0.5) * 0.9 + (rail ? side * 0.25 : 0) }); }
  const crowd = createCrowd(S, people, { poses: ['point', 'phoneUp', 'filming', 'point', 'handsHead', 'phoneUp', 'stand', 'filming', 'arms', 'shade'], rimI: 0.25, seed: 9 });
  const calm = createCrowd(S, people.map((p) => ({ ...p })), { poses: ['stand', 'pocket', 'arms', 'stand', 'phoneUp', 'shade'], rimI: 0.25, seed: 9 });
  const hero = createHero(S, { pose: 'point', top: 0xf2c418, bot: 0x2c3442, hair: 'hood', coat: 0.4, bag: 'none', rimI: 0.25 });
  const heroCalm = 'rail';
  const hw = P.toWorld(1.55, DECK, -HERO_D); hero.root.position.copy(hw); hero.root.rotation.y = P.yaw - 0.12;
  const gulls = createBirds(S, 26, { color: 0xeeeeea, flap: 7, seed: 5 });
  const G0 = P.toWorld(-8, DECK + 6, -150);
  return { crowd, calm, hero, gulls, people,
    update(ft, t) {   // ft = film time (s01: 0..1.5; negative = before the crack), t = page time
      const alarmed = ft > -0.05;
      for (const m of crowd.meshes) m.visible = alarmed; for (const m of crowd.phones) m.visible = alarmed;
      for (const m of calm.meshes) m.visible = !alarmed; for (const m of calm.phones) m.visible = !alarmed;
      (alarmed ? crowd : calm).update(t, { agitation: alarmed ? 0.7 : 0.15 });
      hero.setPose(alarmed ? 'point' : heroCalm);
      // gulls: idling over the pier end, then a burst up and away at the crack
      const u = Math.max(ft + 0.15, 0);
      gulls.update(t, (x) => { const v = Math.max(x - 4 + 0.15 - (ft - (t - 4)), 0); const w = ft < -0.15 ? 0 : u;
        return G0.clone().add(new THREE.Vector3(Math.sin(x * 0.4) * 6 - 14 * w * w, 2 * Math.sin(x * 0.7) + 9 * w + 6 * w * w, -6 * w)); }, 9, 1.0);
    } };
}
// frame-1 camera: behind the hero, 28 mm, locked
export function frame1Cam(W) {
  const P = W.bay.pier, DECK = P.deckY;
  const pos = P.toWorld(qn('cx', 0.35), DECK + qn('ch', 1.62), -CAM_D);
  const look = new THREE.Vector3(qn('lx', 160), qn('ly', 330), qn('lz', -4000));
  return { pos, look, mm: 28, roll: 0 };
}
