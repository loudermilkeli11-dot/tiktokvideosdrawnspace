// COPIED from projects/tsunami/src/tsukit.js (Studio's wave-test kit) on 2026-11-12, per PRODUCTION.md: tsunami-524 builds
// from here only. Unchanged until Gate 0 (the wave test) has a verdict; shot-specific changes go behind options.
// tsunami wave test kit: the day bay + a travelling mega-wave patched into the ocean shader (JS and GLSL twins), crest spray, boats.
// The wave is a radial front from a far source south of the mouth, so it enters the bay through the channel, passes the lighthouse
// (245,-1690) at tw ~ 2.2 s, and reaches the town shore (z ~ 0) at tw ~ 13 s. ?wh = crest height (m), ?wv = speed (m/s).
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean, waveHeight, waveSlope } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH, sField, sGrad, onContour } from '@engine/bay.js';
import { createBoats, createSpray } from '@engine/splash.js';
import { rng, clamp, sstep } from '@engine/util.js';

export const D2R = Math.PI / 180;
export const Q = new URLSearchParams(location.search);
export const qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
export const dirB = (b) => new THREE.Vector3(Math.sin(b * D2R), 0, -Math.cos(b * D2R));

export const WAVE = { cx: 0, cz: -3200, r0: 1200, v: qn('wv', 150), fw: 30, lb: 220, H: qn('wh', 100) };
export const rf = (tw) => WAVE.r0 + WAVE.v * tw;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
// water-surface height above sea level of the wave at (x,z), tw seconds into the event. MUST match tsuB() below.
export function bump(x, z, tw) {
  const u = rf(tw) - Math.hypot(x - WAVE.cx, z - WAVE.cz);
  const hump = u < 0 ? Math.exp(-(u * u) / (WAVE.fw * WAVE.fw)) : Math.exp(-Math.pow(u / WAVE.lb, 1.5)) + 0.35 * Math.exp(-(((u - 380) / 90) ** 2));
  return WAVE.H * hump * (1 - 0.92 * sm(30, 450, sField(x, z))) * (0.9 + 0.1 * Math.sin(x * 0.006 + 1.0));
}
const f1 = (v) => v.toFixed(3);
const BUMP_GLSL = `
uniform float wRf, wH;
float tsuB(vec2 p){ float u = wRf - length(p - vec2(${f1(WAVE.cx)}, ${f1(WAVE.cz)}));
  float q = (u - 380.)/90.;
  float hump = u < 0. ? exp(-(u*u)/${f1(WAVE.fw * WAVE.fw)}) : exp(-pow(u/${f1(WAVE.lb)}, 1.5)) + 0.35*exp(-q*q);
  return wH*hump*(1. - 0.92*sstep_(30., 450., sField(p)))*(0.9 + 0.1*sin(p.x*0.006 + 1.0)); }`;

const swap = (src, a, b) => { if (!src.includes(a)) throw new Error('shader patch missed: ' + a.slice(0, 50)); return src.replace(a, b); };

export function makeWorld(S, o = {}) {
  const { scene } = S;
  S.hdri('hdri_day_1k.hdr', 0.55);
  const SUN = dirB(o.sunB ?? 40).multiplyScalar(Math.cos(40 * D2R)).setY(Math.sin(40 * D2R)).normalize();
  const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
  scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
  const ocean = createOcean(S, { amp: 0.8, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: 0.25, foam: 0.9, rings: 400, segs: 360 });
  ocean.add(scene);
  const OU = ocean.U; OU.sunCol.value.set(0xfff4e2); OU.sunDir.value.copy(SUN); OU.sunI.value = 1; OU.moonI.value = 0;
  // ---- patch the wave into the ocean shader ----
  const m = ocean.mesh.material; m.uniforms.wRf = { value: -1e5 }; m.uniforms.wH = { value: WAVE.H };
  m.vertexShader = swap(m.vertexShader, 'uniform float time, amp, level; uniform mat4 texM, reflInv;', 'uniform float time, amp, level; uniform mat4 texM, reflInv;\n' + BUMP_GLSL);
  m.vertexShader = swap(m.vertexShader, 'varying vec3 vWP; varying vec3 vN; varying float vJac;', 'varying vec3 vWP; varying vec3 vN; varying float vJac; varying vec2 vBU;');
  m.vertexShader = swap(m.vertexShader, 'float gh = groundH(xz); float depth = level - gh;', 'float gh = groundH(xz); float bump = tsuB(xz); float depth = level + bump - gh;');
  m.vertexShader = swap(m.vertexShader, 'p.y += level;', `p.y += level + bump; vBU = vec2(wRf - length(xz - vec2(${f1(WAVE.cx)}, ${f1(WAVE.cz)})), bump);
        { vec2 e = vec2(7., 0.); float bx = (tsuB(xz + e) - tsuB(xz - e))/14., bz = (tsuB(xz + e.yx) - tsuB(xz - e.yx))/14.; n = normalize(n + vec3(-bx, 0., -bz)); }`);
  m.fragmentShader = swap(m.fragmentShader, 'varying vec3 vWP; varying vec3 vN; varying float vJac;', 'uniform float wH; varying vec2 vBU; varying vec3 vWP; varying vec3 vN; varying float vJac;');
  m.fragmentShader = swap(m.fragmentShader, 'col = mix(col, foamLit, foam*0.85);', `col = mix(col, foamLit, foam*0.85);
        { float u = vBU.x, b = vBU.y; float hh = clamp(b/max(wH*0.5, 1.), 0., 1.);
          col = mix(col, col*vec3(0.5, 0.85, 0.9) + deep*0.25, hh*0.7);                                 // thick water: deeper, greener
          float n1 = fbm2(vWP.xz*vec2(0.3, 0.3) + time*0.6), n2 = fbm2(vWP.xz*vec2(0.9, 0.12) + vec2(0., time*0.5));
          float lip = exp(-((u + 4.)*(u + 4.))/260.) * smoothstep(0.3, 0.65, n1 + 0.25);                 // breaking lip at the crest
          float face = exp(-((u + 14.)*(u + 14.))/900.) * smoothstep(0.55, 0.78, n2) * 0.85;             // foam streaks down the face
          float back = step(0., u) * exp(-u/110.) * smoothstep(0.48, 0.72, fbm2(vWP.xz*0.12 - time*0.4)) * 0.8;   // churned white water behind
          float fw = clamp(lip + face + back, 0., 1.) * step(1., b);
          col = mix(col, foamLit*1.1 + R*0.1, fw);
          float land = smoothstep(0.6, -1.2, vDepth - b);                                                // flooding the town: brown, churned
          col = mix(col, vec3(0.30, 0.27, 0.19)*(amb*1.8 + sunCol*sunI*0.4) + foamLit*0.25*fw, land*0.7); }`);
  // ---- the bay (day) ----
  const bay = createBay(S, { shadows: false, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0.0, moonLightI: 3.0, hemiI: 1.3, beamI: 0.0, boats: 0 });
  bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
  bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0; bay.beam.visible = false;
  // ---- boats riding the wave ----
  const BR = rng(14), boats = [], nb = o.boats ?? 14;
  for (let i = 0; i < 4000 && boats.length < nb; i++) { const x = (BR() * 2 - 1) * 260, z = -1500 + BR() * 1300; if (sField(x, z) > -40 || boats.some((b) => Math.hypot(b.x - x, b.z - z) < 40)) continue;
    boats.push({ x, z, yaw: BR() * 6.28, L: 7 + BR() * 9, ph: BR() * 6, spin: (BR() - 0.5) * 1.6 }); }
  const BT = createBoats(S, Math.max(boats.length, 1), { seed: 9 });
  const bq = new THREE.Quaternion(), be = new THREE.Euler(), bp = new THREE.Vector3();
  // ---- crest spray: born where the crest is, thrown forward and up ----
  function makeSpray(twOff, twLen, pageOff = 4) {
    const SR = rng(77), parts = [], ZR = -1700;
    for (let tw = Math.max(twOff - 0.5, 0); tw < twOff + twLen; tw += 0.15) for (let x0 = -900; x0 <= 900; x0 += 22) {
      const dx = x0 - WAVE.cx, dz = ZR - WAVE.cz, dl = Math.hypot(dx, dz), nx = dx / dl, nz = dz / dl, R = rf(tw);
      const px = WAVE.cx + nx * R, pz = WAVE.cz + nz * R, hc = bump(px, pz, tw); if (hc < 20 || groundH(px, pz) > hc - 4) continue;
      for (let k = 0; k < 4; k++) { const kind = SR() < 0.4 ? 1 : SR() < 0.5 ? 0 : 2, up = 8 + SR() * 40, fwd = WAVE.v * (0.5 + 0.5 * SR());
        parts.push({ p: [px + (SR() - 0.5) * 30, hc * (0.55 + 0.4 * SR()), pz + (SR() - 0.5) * 30], v: [nx * fwd, up, nz * fwd], t0: tw - twOff + pageOff + SR() * 0.15,
          size: kind === 1 ? 6 + SR() * 10 : kind === 2 ? 20 + SR() * 25 : 1 + SR() * 2.5, drag: kind === 0 ? 0.12 : 0.35, life: 4, kind }); } }
    const spray = createSpray(S, parts.length ? parts : [{ p: [0, -500, 0], v: [0, 0, 0], t0: 1e5, size: 1 }]);
    spray.U.sunDir.value.copy(SUN); spray.U.hazeD.value = 4000; spray.U.streak.value = 1 / 15;
    const ob = ocean.refl.onBeforeRender; ocean.refl.onBeforeRender = (r, sc, cam) => { spray.mesh.visible = false; ob(r, sc, cam); spray.mesh.visible = true; };
    spray.count = parts.length; return spray;
  }
  function update(t, tw, cam) {
    sky.U.sunDir.value.copy(SUN); sky.update(S, t);
    m.uniforms.wRf.value = rf(tw);
    ocean.mesh.update(S, t);
    bay.update(S, t, { waveAmp: 0.8, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: cam.clone() });
    boats.forEach((b, i) => { const y = bump(b.x, b.z, tw) + waveHeight(b.x, b.z, t, 0.8, 0) + 0.1, e = 6;
      const gx = (bump(b.x + e, b.z, tw) - bump(b.x - e, b.z, tw)) / (2 * e), gz = (bump(b.x, b.z + e, tw) - bump(b.x, b.z - e, tw)) / (2 * e);
      const u = rf(tw) - Math.hypot(b.x - WAVE.cx, b.z - WAVE.cz), sw = u > 0 ? Math.min(u / 60, 1) : 0;   // once the crest is past, they tumble
      bq.setFromEuler(be.set(Math.atan(gz) + 0.5 * sw * Math.sin(tw * 2 + b.ph), b.yaw + b.spin * sw * tw, -Math.atan(gx) + 0.7 * sw * Math.sin(tw * 1.7 + b.ph), 'YXZ'));
      BT.setBoat(i, bp.set(b.x, y, b.z), bq, b.L); });
    BT.commit();
  }
  return { ocean, OU, bay, sky, SUN, makeSpray, update, boats, BT };
}
export { createStudio, THREE, groundH, sField, onContour, sGrad };
