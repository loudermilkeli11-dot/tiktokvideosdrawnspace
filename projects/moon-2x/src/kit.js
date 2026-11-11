// moon-2x shot kit: one consistent world for every bay shot. The story clock drives Moon size, brightness, sky and light.
//   import { bayWorld, filmToStory, SHOT } from './kit.js';
//   const W = bayWorld(S, { pierYaw, shadows, ... });      // sky + moon + ocean + bay (+ hdri)
//   S.run((t) => { const tt = t - 4; ... applyCam(...);  W.update(S, t, { storyT, moonScreen: [x, y] (design px), ... }); });
import { THREE } from '@engine/engine.js';
import { createMoon, sunForPhase } from '@engine/moon.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL } from '@engine/bay.js';
import { clamp, lerp } from '@engine/util.js';
import { angRadius, gapKm } from './story.js';
export const D2R = Math.PI / 180;
// film start of each shot (seconds); storyT = filmT - 3 except the hook (25 + t)
export const SHOT = { s01_hook: 0, s02_today: 3, s03_tide: 8, s04_flood: 13, s05_blackout: 18, s06_pier: 23, s07_roche: 28, s08_split: 33, s09_meteors: 38, s10_ring: 43, s11_iss: 48, s12_rise: 53, s13_space: 58 };
export const filmToStory = (filmT) => filmT - 3;
// direction from the camera through a design-pixel position (540x960 frame). Call AFTER applyCam (camera matrices current).
export function dirThroughScreen(camera, x, y) {
  camera.updateMatrixWorld(); const v = new THREE.Vector3((x / 540) * 2 - 1, -((y / 960) * 2 - 1), 0.5).unproject(camera);
  return v.sub(camera.position).normalize();
}
// world grade by story time: how the light of the whole frame changes rung by rung
export function grade(storyT) {
  const r = angRadius(storyT) / D2R;                   // Moon angular radius (deg)
  const k = clamp(Math.log2(r / 0.26) / Math.log2(12 / 0.26));   // 0 today .. 1 when the Moon is huge
  return {
    sunElev: lerp(-4.5, -16, clamp(storyT / 15)),      // dusk -> full night over rungs 0..3
    moonLightI: lerp(0.18, 2.4, Math.pow(k, 1.2)),      // directional moonlight on the scene
    skyMoonWash: lerp(0.0, 0.42, Math.pow(k, 1.6)),     // blue "moon-day" wash in the sky
    hemiI: lerp(0.1, 0.45, k), winI: lerp(1.0, 0.75, k), stars: lerp(0.9, 0.15, k), beltI: lerp(0.32, 0.0, clamp(storyT / 12)),
    moonSunI: lerp(1.6, 1.25, k),                      // keep the disc from blowing out as it grows
  };
}
export function bayWorld(S, o = {}) {
  const { scene } = S;
  S.hdri(o.hdri ?? 'hdri_dusk_1k.hdr', o.envI ?? 0.08);
  const sky = createSky(S, { lp: 0.2, beltI: 0.32, stars: 0.8, nightZen: 0x01040d, nightHor: 0x0c1630, ...(o.sky || {}) }); scene.add(sky);
  const moon = createMoon(S, { sunI: 1.4, normalScale: 2.0, ...(o.moon || {}) }); scene.add(moon);
  const ocean = createOcean(S, { amp: 0.6, level: 0, groundGLSL: GROUND_GLSL, deep: 0x041a24, shallow: 0x0d4a55, ...(o.ocean || {}) }); ocean.add(scene);
  const bay = createBay(S, { shadows: !!o.shadows, pierYaw: o.pierYaw ?? 3 * D2R, pierLen: 152, pierLights: o.pierLights ?? 0, pierLightI: 10, moonLightI: 0.5, hemiI: 0.15, ...(o.bay || {}) });
  const DIST = 15000;
  const W = { sky, moon, ocean, bay, DIST, md: new THREE.Vector3(0, 0.05, -1).normalize(),
    // st: { storyT, moonDir?: Vector3 | moonScreen?: [x,y] design px of the Moon CENTRE, level, amp, flicker, blackX, phase?, grade overrides }
    update(S, t, st) {
      const g = { ...grade(st.storyT), ...(st.grade || {}) };
      const ang = st.angR ?? angRadius(st.storyT);
      const md = st.moonDir ? st.moonDir.clone().normalize() : st.moonScreen ? dirThroughScreen(S.camera, st.moonScreen[0], st.moonScreen[1]) : W.md;
      W.md.copy(md);
      const cam = S.camera.position;
      moon.position.copy(cam).addScaledVector(md, DIST); moon.scale.setScalar(DIST * Math.sin(ang)); moon.visible = st.moonVisible ?? true;
      moon.faceNearSide(md.clone().negate(), [0.1, 0.05]);
      const sun = sunForPhase(md.clone().negate(), st.phase ?? 48, undefined, 160);
      moon.U.sunDir.value.copy(sun); moon.U.earthDir.value.copy(md).negate(); moon.U.sunI.value = g.moonSunI;
      moon.U.haze.value = 1.0; moon.U.horizonY.value = 0; moon.U.hazeH.value = DIST * Math.sin(ang) * 0.3; moon.U.hazeLift.value = 0.02;
      const skySun = sun.clone(); skySun.y = Math.sin(g.sunElev * D2R); skySun.normalize();
      sky.U.sunDir.value.copy(skySun); sky.U.moonDir.value.copy(md); sky.U.moonAng.value = ang; sky.U.moonLight.value = g.skyMoonWash; sky.U.stars.value = g.stars; sky.U.beltI.value = g.beltI; sky.update(S, t);
      const level = st.level ?? 0, amp = st.amp ?? 0.6;
      ocean.U.moonDir.value.copy(md); ocean.U.moonI.value = 1.5 + 2.0 * g.moonLightI; ocean.U.level.value = level; ocean.U.amp.value = amp; ocean.U.sunDir.value.copy(skySun); ocean.U.sunI.value = 0; ocean.mesh.update(S, t);
      bay.update(S, t, { waveAmp: amp, level, moonDir: md, moonLightI: g.moonLightI, shadowCenter: st.shadowCenter });
      bay.hemi.intensity = g.hemiI; bay.U.winI.value = g.winI; bay.U.flicker.value = st.flicker ?? 0; bay.U.blackX.value = st.blackX ?? -1e5; bay.U.power.value = st.power ?? 1; bay.U.wet.value = st.wet ?? 0;
      return { md, g, gap: gapKm(st.storyT) };
    } };
  return W;
}
