// earth-stops GROUP C: the bay set for s05_bay / s06_town, and N4 "the sideways sea".
// The bay is the kit's bayWorld look (SUN, SKY, HAZE, styliseMat) rebuilt here so the ocean grid can be denser and the town
// re-painted in the kit's stylised daywear palette (bay.js paints a night town: near-black streets, grey walls).
//
// N4 (closed form in event time e; JS seaH() and GLSL seaB() are twins, keep them equal):
//   the lagoon's water keeps moving east at V while the bay floor stops. Its WEST edge is the lagoon's west shore carried
//   east by drift(e): x_d = -800 + V·e (x_d = 89 m at e 2.333, 327 m at 2.958, 549 m at 3.542). West of x_d: drained
//   seabed (water dropped under the floor), a few puddles, stranded boats. East of x_d: the same water squeezed into what is
//   left, heaped toward the east shore as a ramp^1.8 profile of height HM(e), its front SF(e) (metres of land past the
//   shoreline) climbing the east-facing shore only (shores whose land lies east of the water). DRAMATIZATION (story.js
//   liberty "how far the bay heaps"): the heap height and how fast its front climbs are illustrative; the drained edge is
//   the law (drift).
import { THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH, sField } from '@engine/bay.js';
import { createBoats, createSpray } from '@engine/splash.js';
import { rng, clamp } from '@engine/util.js';
import { NOISE } from '@engine/glsl.js';
import { V, drift, ev, SHUTTER_E, leafLeft, lean } from './story.js';
import { SUN, SUN_COL, SUN_I, SKY, HAZE, HEMI, styliseMat, createChips, D2R, qn } from './kit.js';

// THE TERRACE (s05 and s06 share it): a hillside house south of the town, a little east of centre so a 22 mm frame holds the
// drained west AND the east shore. Eye = groundH + up.
export const BAYC = { x: qn('cx', 140), z: qn('cz', 220), up: qn('cu', 110) };
export const E5 = ev('s05_bay', 0), E6 = ev('s06_town', 0), E7 = ev('s06_town', 7.0);   // 2.333, 2.958, 3.542
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const ZERO4 = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------------------------------------------------------------- the sea state at event time e (JS)
export function seaState(e) {
  const xd = -800 + drift(e);
  const u5 = sm(E5 - 0.05, E6, e);                                     // across s05
  const u6 = clamp((e - E6) / (E7 - E6));                               // across s06
  // front: metres of land past the east shoreline. s05: -40 -> +34 (reaches the promenade, s 31.5); s06: races inland at 0.8 V
  const sf = e < E6 ? lerp(-40, 34, u5) : 34 + 0.8 * V * (e - E6);
  const hm = lerp(90, 125, u5) - 20 * u6;                            // heap height at the east shore (m above sea level)
  return { e, D: drift(e), xd, sf, hm };
}
// east shore x of the lagoon/channel at z (for the heap ramp)
const shoreX = (z) => Math.max(Math.sqrt(Math.max(0, 640000 - (z + 800) * (z + 800))), 170 + 1.3 * Math.max(0, -z - 1650));
export function seaH(x, z, st) {                                        // water surface height above sea level; < ground = dry
  const s = sField(x, z), gx = (sField(x + 4, z) - sField(x - 4, z)) / 8;
  const east = sm(0.15, 0.7, gx) * sm(-200, -100, x - st.xd) ;
  const lag = sm(-1950, -1650, z);
  const dry = lerp(1, sm(st.xd - 40, st.xd + 90, x), lag);
  const xs = shoreX(z), ramp = clamp((x - st.xd) / Math.max(xs - st.xd, 60));
  const h = st.hm * Math.pow(ramp, 1.8) * lag * Math.max(east, sm(0, -160, s)) * (1 - 0.55 * east * clamp(s / Math.max(st.sf, 40)));   // over land: a sheet sloping down to the front
  const sfe = lerp(0, st.sf, east), cut = 1 - sm(sfe - 28, sfe + 2, s);
  return lerp(-60, h, dry * cut);
}
const f = (v) => (+v).toFixed(3);
const SEA_GLSL = `
uniform float uXd, uSf, uHm, uD, uE;
float shoreX_(float z){ return max(sqrt(max(0., 640000. - (z + 800.)*(z + 800.))), 170. + 1.3*max(0., -z - 1650.)); }
// returns the surface offset; w = (ramp, frontDist, dry)
float seaB(vec2 p, out vec3 w){ float s = sField(p), gx = (sField(p + vec2(4., 0.)) - sField(p - vec2(4., 0.)))/8.;
  float east = sstep_(0.15, 0.7, gx)*sstep_(-200., -100., p.x - uXd);
  float lag = sstep_(-1950., -1650., p.y);
  float dry = mix(1., sstep_(uXd - 40., uXd + 90., p.x), lag);
  float xs = shoreX_(p.y), ramp = clamp((p.x - uXd)/max(xs - uXd, 60.), 0., 1.);
  float h = uHm*pow(ramp, 1.8)*lag*max(east, sstep_(0., -160., s))*(1. - 0.55*east*clamp(s/max(uSf, 40.), 0., 1.));
  float sfe = mix(0., uSf, east), cut = 1. - sstep_(sfe - 28., sfe + 2., s);
  w = vec3(ramp*lag, (sfe - s)*east + (1. - east)*1e3, dry);
  return mix(-60., h, dry*cut); }
float seaB(vec2 p){ vec3 w; return seaB(p, w); }`;
const swap = (src, a, b) => { if (!src.includes(a)) throw new Error('shader patch missed: ' + a.slice(0, 60)); return src.replace(a, b); };

function patchOcean(ocean) {
  const m = ocean.mesh.material;
  Object.assign(m.uniforms, { uXd: { value: -1e4 }, uSf: { value: -100 }, uHm: { value: 0 }, uD: { value: 0 }, uE: { value: 0 } });
  m.vertexShader = swap(m.vertexShader, 'uniform float time, amp, level; uniform mat4 texM, reflInv;', 'uniform float time, amp, level; uniform mat4 texM, reflInv;\n' + NOISE + SEA_GLSL + '\nvarying vec4 vSea;');
  m.vertexShader = swap(m.vertexShader, 'float gh = groundH(xz); float depth = level - gh;', `float gh = groundH(xz); vec3 sw; float bump = seaB(xz, sw);
        float pud = (1. - sw.z)*smoothstep(0.52, 0.64, fbm2(xz*0.006 + 3.7))*step(gh, -2.);   // puddles left on the drained floor
        bump = mix(bump, gh + 0.35 - level, pud);
        float depth = level + bump - gh;`);
  m.vertexShader = swap(m.vertexShader, 'p.y += level;', `p.y += level + bump; vSea = vec4(sw.x, sw.y, bump, pud);
        { vec2 e2 = vec2(6., 0.); float bx = (seaB(xz + e2) - seaB(xz - e2))/12., bz = (seaB(xz + e2.yx) - seaB(xz - e2.yx))/12.; n = normalize(n + vec3(-bx, 0., -bz)*(1. - pud)); }`);
  m.fragmentShader = swap(m.fragmentShader, 'varying vec3 vWP; varying vec3 vN; varying float vJac;', 'uniform float uD, uHm, uE; varying vec4 vSea; varying vec3 vWP; varying vec3 vN; varying float vJac;');
  m.fragmentShader = swap(m.fragmentShader, 'col = mix(col, foamLit, foam*0.85);', `col = mix(col, foamLit, foam*0.85);
        { float ramp = vSea.x, fd = vSea.y, b = vSea.z, pud = vSea.w;
          vec2 q = vec2((vWP.x - uD)*0.012, vWP.z*0.05);                                     // the pattern rides east with the water
          float n1 = fbm2(q), n2 = fbm2(vec2((vWP.x - uD)*0.04, vWP.z*0.16) + 5.), n3 = fbm2(vWP.xz*0.08 + 11.);
          float hh = clamp(b/max(uHm, 1.), 0., 1.);
          col = mix(col, mix(deep, shallow, 0.55)*lightAmb*2.2, hh*0.6);                    // thick heaped water: lit turquoise body
          float streak = smoothstep(0.46, 0.66, n2*0.7 + n1*0.5)*smoothstep(0.03, 0.3, hh);   // foam streaks dragged east
          float top = smoothstep(0.45, 0.85, hh + 0.3*(n1 - 0.5));                            // white-topped crest
          float face = smoothstep(90., 0., fd);                                              // the wall face / front: white water
          float fw = clamp(streak*0.75 + top*0.9 + face*(0.7 + 0.3*n3), 0., 1.);
          col = mix(col, foamLit*1.08, fw);
          float land = smoothstep(1.5, -2.5, vDepth - b);                                    // over land: churned, silty
          col = mix(col, vec3(0.42, 0.36, 0.26)*(amb*1.6 + sunCol*sunI*0.45) + foamLit*0.35*fw, land*0.55*(1. - pud));
          col = mix(col, mix(vec3(0.16, 0.22, 0.24), R*0.55, 0.35), pud*0.75); }`);
  m.needsUpdate = true;
  return m;
}

// ---------------------------------------------------------------- the stylised daytime town (repaint bay.js's night town)
function repaint(bay) {
  const tm = bay.terrain.material, p1 = tm.onBeforeCompile;
  tm.onBeforeCompile = (sh, r) => { p1(sh, r);
    sh.fragmentShader = swap(sh.fragmentShader, 'diffuseColor.rgb *= c;', `
        { vec3 bed = mix(vec3(0.40, 0.35, 0.27), vec3(0.30, 0.28, 0.22), fbm2(vWp.xz*0.01));      // the drained floor: wet ochre silt
          bed = mix(bed, vec3(0.22, 0.30, 0.20), smoothstep(0.55, 0.75, fbm2(vWp.xz*0.025 + 4.))*0.8);   // weed beds
          bed *= 0.84 + 0.16*smoothstep(0.35, 0.65, fbm2(vWp.xz*vec2(0.004, 0.02) + 2.));          // wet bands (no fine ripple: moire)
          vec3 beach = vec3(0.60, 0.52, 0.38);
          vec3 promC = mix(vec3(0.50, 0.46, 0.40), vec3(0.58, 0.53, 0.46), vn2(vWp.xz*0.5));
          vec3 townC = mix(vec3(0.30, 0.29, 0.27), vec3(0.38, 0.35, 0.31), fbm2(vWp.xz*0.02));
          townC = mix(townC, vec3(0.30, 0.38, 0.19), smoothstep(0.5, 0.62, fbm2(vWp.xz*0.012 + 7.))*0.85);   // gardens and lawns
          vec3 hill = mix(vec3(0.36, 0.44, 0.22), vec3(0.50, 0.50, 0.28), fbm2(vWp.xz*0.006));
          hill = mix(hill, vec3(0.22, 0.34, 0.16), smoothstep(0.55, 0.7, fbm2(vWp.xz*0.03 + 9.))*0.8);   // scrub
          vec3 cc = mix(bed, beach, smoothstep(-3., 1., s));
          cc = mix(cc, promC, smoothstep(30., 31.5, s));
          cc = mix(cc, townC, smoothstep(45., 70., s));
          cc = mix(cc, hill, smoothstep(160., 300., s + 60.*fbm2(vWp.xz*0.01)));
          cc = mix(cc, vec3(0.55, 0.50, 0.42), smoothstep(0.3, 0.6, slope + 0.15*fbm2(vWp.xz*0.05))*0.7);
          diffuseColor.rgb *= cc; }`); };
  tm.customProgramCacheKey = () => 'esC-terrain'; tm.needsUpdate = true;
  const bm = bay.buildings.material, p2 = bm.onBeforeCompile;
  bm.onBeforeCompile = (sh, r) => { p2(sh, r);
    sh.fragmentShader = swap(sh.fragmentShader, 'float sd = vSeed; vec3 base = mix(vec3(0.20,0.19,0.18), vec3(0.42,0.36,0.30), hh(sd)); if (hh(sd+3.) < 0.25) base = vec3(0.32,0.34,0.38);',
      `float sd = vSeed; float pk = hh(sd + 9.); vec3 base = pk < 0.3 ? vec3(0.93, 0.90, 0.84) : pk < 0.5 ? vec3(0.95, 0.82, 0.62) : pk < 0.65 ? vec3(0.86, 0.62, 0.48)
        : pk < 0.78 ? vec3(0.70, 0.80, 0.86) : pk < 0.9 ? vec3(0.96, 0.88, 0.70) : vec3(0.80, 0.84, 0.70);`);
    sh.fragmentShader = swap(sh.fragmentShader, 'diffuseColor.rgb *= mix(base, vec3(0.03,0.035,0.045), win) * (roof > 0.5 ? 0.6 : 1.);',
      'diffuseColor.rgb *= roof > 0.5 ? mix(vec3(0.72, 0.36, 0.24), vec3(0.62, 0.30, 0.22), hh(sd + 5.)) : mix(base, vec3(0.22, 0.28, 0.34), win*0.85);'); };
  bm.customProgramCacheKey = () => 'esC-buildings'; bm.needsUpdate = true;
}

// ---------------------------------------------------------------- the world
// o: { rings, segs (ocean grid), boats 26, spray true, chips true }
export function bayWorldC(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', 0.5);
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(SKY.zen); sky.U.dayHor.value.set(SKY.hor);
  scene.fog = new THREE.Fog(HAZE.col, o.fog0 ?? 900, o.fog1 ?? 16000);    // = the kit's bayWorld haze
  const ocean = createOcean(S, { amp: 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0d5a72, shallow: 0x35b0b0, amb: 0x6a98b8, reflScale: o.reflScale ?? 0.25, rings: o.rings ?? 360, segs: o.segs ?? 480 });
  ocean.add(scene); ocean.U.sunCol.value.set(SUN_COL);
  const om = patchOcean(ocean);
  const bay = createBay(S, { buildings: o.buildings ?? 1700, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0, moonLightI: SUN_I, hemiI: 1.25, beamI: 0, boats: 0, shadows: false });
  bay.moonLight.color.set(SUN_COL); bay.hemi.color.set(HEMI.sky); bay.hemi.groundColor.set(HEMI.ground);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0; if (bay.beam) bay.beam.visible = false;
  bay.group.traverse((m) => { if (m.isMesh && m.material && !Array.isArray(m.material)) styliseMat(m.material, { rough: 0.7 }); });
  repaint(bay);
  if (bay.glow) bay.glow.visible = false;                                   // aircraft-warning sprites are always on (night set)
  const rt = bay.group.children.find((m) => m.isInstancedMesh && m !== bay.buildings && m.material.color && m.material.color.getHex() === 0x2a2a2c);
  if (rt) rt.material.color.set(0xb4aca0);                                  // rooftop clutter: light, matte (was near-black)

  // ---- houses: read the instances back so s06 can carry the east waterfront away (closed form in e)
  const bm = bay.buildings, H = [], m4 = new THREE.Matrix4(), pv = new THREE.Vector3(), qv = new THREE.Quaternion(), sv = new THREE.Vector3();
  const cap = o.capTall;   // [x, z, r, hMax]: towers inside r of (x, z) capped so they don't wall off the view
  for (let i = 0; i < bm.count; i++) { bm.getMatrixAt(i, m4); m4.decompose(pv, qv, sv); const top0 = pv.y + sv.y;
    if (cap && sv.y > cap[3] && Math.hypot(pv.x - cap[0], pv.z - cap[1]) < cap[2]) { sv.y = cap[3]; bm.setMatrixAt(i, m4.compose(pv, qv, sv)); bm.geometry.attributes.aSize.setY(i, sv.y); bm.geometry.attributes.aSize.needsUpdate = true; bm.instanceMatrix.needsUpdate = true; }
    const s = sField(pv.x, pv.z), gx = (sField(pv.x + 4, pv.z) - sField(pv.x - 4, pv.z)) / 8;
    H.push({ i, top0, p: pv.clone(), q: qv.clone(), s: sv.clone(), sh: s, east: sm(0.15, 0.7, gx) * (pv.x > 0 ? 1 : 0), seed: (i * 0.618034) % 1 }); }
  // e at which the front reaches land distance s (inverse of seaState().sf)
  const frontAt = (s) => { if (s <= 34) { let lo = E5 - 0.05, hi = E6; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (seaState(mid).sf < s) lo = mid; else hi = mid; } return (lo + hi) / 2; } return E6 + (s - 34) / (0.8 * V); };
  // the front on a shore of 'east' factor k sits at sf·k (seaB's sfe), so it reaches land distance s when sf = s / k
  H.forEach((h) => { h.eHit = h.east > 0.3 ? frontAt((h.sh + 4) / h.east) : 1e9; });
  // rooftop clutter -> its building (so capped towers take their clutter down and carried houses take it away)
  const RTI = [];
  if (rt) { const grid = new Map(), key = (x, z) => `${Math.floor(x / 40)},${Math.floor(z / 40)}`;
    H.forEach((h) => { const k = key(h.p.x, h.p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(h); });
    for (let j = 0; j < rt.count; j++) { rt.getMatrixAt(j, m4); m4.decompose(pv, qv, sv); let best = null, bd = 1e9;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) (grid.get(`${Math.floor(pv.x / 40) + a},${Math.floor(pv.z / 40) + b}`) ?? []).forEach((h) => {
        const d = Math.hypot(pv.x - h.p.x, pv.z - h.p.z); if (d < Math.max(h.s.x, h.s.z) * 0.75 && Math.abs(pv.y - h.top0) < 0.6 && d < bd) { bd = d; best = h; } });
      if (!best) continue;
      if (Math.abs(best.p.y + best.s.y - best.top0) > 0.01) { pv.y = best.p.y + best.s.y; rt.setMatrixAt(j, m4.compose(pv, qv, sv)); rt.instanceMatrix.needsUpdate = true; }
      if (best.eHit < 50) RTI.push({ j, h: best, m: m4.clone() }); } }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function poseHouses(e) {
    let dirty = false;
    H.forEach((h) => { if (h.eHit > 50) return; const a = e - h.eHit;   // event s since the water reached it
      if (a <= 0) { if (h.moved) { bm.setMatrixAt(h.i, m4.compose(h.p, h.q, h.s)); h.moved = false; dirty = true; } return; }
      const k = clamp(a / 0.25);                                          // knocked over and carried east, sinking into the flood
      _p.copy(h.p); _p.x += 0.12 * V * a * (0.4 + 0.6 * h.seed); _p.y -= h.s.y * 0.9 * k;
      _q.setFromEuler(_e.set(0.3 * (h.seed - 0.5) * k, 0.6 * (h.seed - 0.5) * k, -1.2 * k * (0.6 + 0.4 * h.seed))).multiply(h.q);
      bm.setMatrixAt(h.i, m4.compose(_p, _q, _s.copy(h.s).multiplyScalar(a > 0.3 ? 0 : 1))); h.moved = true; dirty = true; });
    if (dirty) bm.instanceMatrix.needsUpdate = true;
    if (RTI.length) { RTI.forEach((r) => rt.setMatrixAt(r.j, e > r.h.eHit ? ZERO4 : r.m)); rt.instanceMatrix.needsUpdate = true; }
  }
  // ---- trees in the gardens and on the hills: already stripped to bare wood and leaning east (story leafLeft / lean)
  const TR = [], TRR = rng(201);
  { const grid = new Map(); H.forEach((h) => { const k = `${Math.floor(h.p.x / 40)},${Math.floor(h.p.z / 40)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(h); });
    const clear = (x, z) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const h of grid.get(`${Math.floor(x / 40) + a},${Math.floor(z / 40) + b}`) ?? []) if (Math.hypot(x - h.p.x, z - h.p.z) < Math.max(h.s.x, h.s.z) * 0.72 + 2.5) return false; return true; };
    for (let i = 0; i < 60000 && TR.length < (o.trees ?? 2600); i++) { const x = -900 + TRR() * 2300, z = 260 - TRR() * 1950, s = sField(x, z);
      if (s < 36 || s > 520 || Math.hypot(x - BAYC.x, z - BAYC.z) < 60 || !clear(x, z)) continue;
      const gx = (sField(x + 4, z) - sField(x - 4, z)) / 8, k = sm(0.15, 0.7, gx) * (x > 0 ? 1 : 0);
      TR.push({ x, z, y: groundH(x, z) - 0.3, sc: 0.8 + TRR() * 0.7, sd: TRR(), eHit: k > 0.3 ? frontAt((s + 2) / k) : 1e9 }); } }
  const trunkG = new THREE.CylinderGeometry(0.22, 0.42, 6, 5).translate(0, 3, 0), crownG = new THREE.IcosahedronGeometry(2.4, 0).translate(0, 6.2, 0);
  const trunkM = new THREE.InstancedMesh(trunkG, styliseMat(new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 })), TR.length);
  const crownM = new THREE.InstancedMesh(crownG, styliseMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })), TR.length);
  TR.forEach((tq, i) => crownM.setColorAt(i, new THREE.Color().setHSL(0.16 + 0.06 * tq.sd, 0.35, 0.24 + 0.06 * tq.sd)));
  trunkM.frustumCulled = crownM.frustumCulled = false; bay.group.add(trunkM, crownM);
  const ZAXC = new THREE.Vector3(0, 0, 1), YAXC = new THREE.Vector3(0, 1, 0);
  function poseTrees(e) {
    const lf = leafLeft(e), ln = lean(e) * D2R;
    TR.forEach((tq, i) => { const a = e - tq.eHit; if (a > 0.12) { trunkM.setMatrixAt(i, ZERO4); crownM.setMatrixAt(i, ZERO4); return; }
      const fl = a > 0 ? clamp(a / 0.12) * 1.3 : 0;                         // the flood knocks it flat
      _q.setFromAxisAngle(ZAXC, -(ln * (0.7 + 0.6 * tq.sd) + fl)).multiply(new THREE.Quaternion().setFromAxisAngle(YAXC, tq.sd * 6.28));
      _p.set(tq.x, tq.y, tq.z); trunkM.setMatrixAt(i, m4.compose(_p, _q, _s.setScalar(tq.sc)));
      crownM.setMatrixAt(i, m4.compose(_p, _q, _s.set(tq.sc * (0.35 + 0.65 * lf), tq.sc * (0.45 + 0.55 * lf), tq.sc * (0.35 + 0.65 * lf)))); });
    trunkM.instanceMatrix.needsUpdate = crownM.instanceMatrix.needsUpdate = true;
  }
  // roof shingles / panels torn off the waterfront houses as the front hits them (chips released at eHit)
  let roofChips = null;
  { const R = rng(55), list = [];
    H.filter((h) => h.eHit < 50).forEach((h) => { for (let k = 0; k < 10; k++) list.push({ p: [h.p.x + (R() - 0.5) * h.s.x, h.p.y + h.s.y + 0.5, h.p.z + (R() - 0.5) * h.s.z], t0: h.eHit + 0.01 + 0.08 * R(),
      size: 1.2 + R() * 2.2, shape: R() < 0.7 ? 1 : 0, kind: 2, col: R() < 0.6 ? 0xb85a3a : R() < 0.5 ? 0xece4d4 : 0x6a7a88 }); });
    if (list.length) roofChips = createChips(S, list, { gravity: 9.81 }); }

  // ---- boats: some stranded on the drained floor (tilted on their sides), the rest carried in the heap
  const R = rng(14), boats = [], nb = o.boats ?? 30;
  for (let i = 0; i < 6000 && boats.length < (o.stranded ?? 16); i++) { const x = -430 + R() * 480, z = -140 - R() * 560; if (sField(x, z) > -30 || boats.some((b) => Math.hypot(b.x - x, b.z - z) < 40)) continue;
    boats.push({ x, z, yaw: R() * 6.28, L: 12 + R() * 12, ph: R() * 6, sd: R(), stranded: true }); }       // the moored fleet, left on the floor
  for (let i = 0; i < 6000 && boats.length < nb; i++) { const x = (R() * 2 - 1) * 650, z = -120 - Math.pow(R(), 1.4) * 1300; if (sField(x, z) > -40 || boats.some((b) => Math.hypot(b.x - x, b.z - z) < 45)) continue;
    boats.push({ x, z, yaw: R() * 6.28, L: 11 + R() * 14, ph: R() * 6, sd: R(), stranded: x < 120 && R() < 0.5 }); }
  const BT = createBoats(S, boats.length, { seed: 9 });
  BT.materials.forEach((mm) => styliseMat(mm, { rough: 0.6 }));
  const bq = new THREE.Quaternion(), be = new THREE.Euler(), bp = new THREE.Vector3();
  function poseBoats(e, st) {
    boats.forEach((b, i) => {
      if (b.stranded && b.x < st.xd + 30) {                                  // left behind: lying on the floor, heeled over
        const tilt = (0.35 + 0.35 * b.sd) * (b.sd < 0.5 ? 1 : -1);
        bq.setFromEuler(be.set(0.08 * (b.sd - 0.5), b.yaw, tilt, 'YXZ')); BT.setBoat(i, bp.set(b.x, groundH(b.x, b.z) + 0.25 * b.L * 0.22, b.z), bq, b.L); return; }
      // carried: each parcel keeps its place between the drained edge and the east shore (the water is squeezed east)
      const xs = shoreX(b.z), u = clamp((b.x + 800) / (xs + 800)), x = lerp(st.xd + 60, xs - 25, Math.pow(u, 0.6)), z = b.z;
      const y = Math.max(seaH(x, z, st), groundH(x, z)) + 0.3, d = 8, gx = (seaH(x + d, z, st) - seaH(x - d, z, st)) / (2 * d);
      const a = e - E5 + b.ph;
      bq.setFromEuler(be.set(0.25 * Math.sin(a * 3 + b.ph), b.yaw + 0.8 * (b.sd - 0.5) * (e - E5), -Math.atan(gx) + 0.5 * Math.sin(a * 2.3 + b.sd * 6), 'YXZ'));
      BT.setBoat(i, bp.set(x, y, z), bq, b.L); });
    BT.commit();
  }

  // ---- crest spray: crisp droplets blown east off the heap's top and its front (born in event time; update(e))
  let spray = null;
  if (o.spray !== false) { const SR = rng(77), parts = [];
    for (let e = E5 - 0.25; e < E7; e += 0.008) { const st = seaState(e);
      for (let k = 0; k < 24; k++) { const z = -1750 + Math.pow(SR(), 0.7) * 1700, xs = shoreX(z);
        if (xs < st.xd + 60) continue;
        const front = SR() < 0.5, x = front ? xs + Math.max(st.sf, 0) * 0.9 - SR() * 30 : lerp(st.xd, xs, 0.55 + 0.45 * Math.sqrt(SR()));
        const y = Math.max(seaH(x, z, st), groundH(x, z)), kind = 0;   // crisp droplets only (sheets and veils read as grey smoke here)
        if (y < 6) continue;
        parts.push({ p: [x, y + 1 + 8 * SR(), z], v: [V * (0.45 + 0.5 * SR()), 6 + SR() * 30, (SR() - 0.5) * 12], t0: e, life: 0.9,
          size: 2.5 + SR() * 5, drag: 0.25, kind, shade: 1.3 + 0.3 * SR() }); } }
    spray = createSpray(S, parts, { hazeD: 7000 });
    spray.U.sunDir.value.copy(SUN); spray.U.sunCol.value.set(SUN_COL); spray.U.hazeCol.value.set(HAZE.col); spray.U.streak.value = SHUTTER_E; spray.U.amb.value.set(0xd0dcea); spray.U.sunI.value = 2.2;
    const ob = ocean.refl.onBeforeRender; ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob(r, sc, cam); spray.mesh.visible = true; }; }

  // ---- the upwind river over the foreground town: leaves, paper, shingles, panels streaming east (wrap)
  let river = null;
  if (o.chips !== false) { const CR = rng(91), list = [], [z0, z1] = o.riverZ ?? [-60, 320];
    for (let i = 0; i < (o.riverN ?? 2600); i++) { const x = -1400 + CR() * 2800, z = z0 + CR() * (z1 - z0), g = Math.max(groundH(x, z), 0), r = CR();
      const kind = r < 0.45 ? 0 : r < 0.6 ? 1 : 2;
      list.push({ p: [x, g + 3 + Math.pow(CR(), 1.5) * 45, z], t0: E5 - 0.02 - 0.03 * CR(), size: kind === 2 ? 1.0 + CR() * 2.4 : 0.5 + CR() * 0.9, shape: CR() < 0.7 ? 1 : 0, kind,
        col: kind === 0 ? new THREE.Color().setHSL(0.18 + 0.1 * CR(), 0.55, 0.32 + 0.15 * CR()).getHex() : kind === 1 ? 0xbfd6e0 : [0xb85a3a, 0xece4d4, 0xd9b44a, 0x6a7a88, 0x8a5a3a, 0x3a78d0][Math.floor(CR() * 6)] }); }
    river = createChips(S, list, { wrap: [-1400, 1400], gravity: 0.6 }); }

  const W = { sky, ocean, om, bay, boats, BT, spray, river, roofChips, H,
    update(S, t, e, focus) {
      const st = seaState(e);
      sky.U.sunDir.value.copy(SUN); sky.update(S, t);
      Object.assign(om.uniforms.uXd, { value: st.xd }); om.uniforms.uSf.value = st.sf; om.uniforms.uHm.value = st.hm; om.uniforms.uD.value = st.D; om.uniforms.uE.value = e;
      ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
      bay.update(S, t, { waveAmp: 0.45, level: 0, moonDir: SUN, moonLightI: SUN_I, shadowCenter: focus ?? S.camera.position.clone() });
      poseBoats(e, st); poseHouses(e); poseTrees(e);
      if (spray) spray.update(e); if (river) river.update(e); if (roofChips) roofChips.update(e);
      return st;
    } };
  return W;
}
export { groundH, sField };
