// s04_seaup (film 8.5-10.5 s, story tau 9 -> 11, the 5 s flip's apex: 245 m). A harbour webcam bolted to the pier (it stayed put)
// looks up: the whole sea of the bay hangs overhead like a glittering ceiling. We see its underside, the seabed's shape lifted
// 245 m, lit through by the sun (turquoise where thin, deep blue where thick), boats on top as dark hulls; its edge runs along
// the shoreline with the beach crowd floating beside it. Below: the bare wet seabed (ripples, weed, puddles that mirror the
// ceiling, rocks), the pier's legs standing in air, the empty beach. The slab's shadow puts the bed in turquoise light.
// Heights from story.js only (heightAt). ?cx ?cy ?cz ?b (bearing deg) ?pd (pitch deg) ?mm ?sb (sun bearing rel.) ?se (sun elev)
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH, sField } from '@engine/bay.js';
import { createCrowd, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng, clamp } from '@engine/util.js';
import { patchSlab, createRocks } from '@engine/splash.js';
import { heightAt, tauAt, SHOT } from './story.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), qn = (k, d) => (Q.has(k) ? +Q.get(k) : d);
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48);
const S = createStudio({ samples: 2, shadows: false, near: 0.5,
  post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 2.5, bloomRadius: 0.55, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.55);
// camera: on a lamp post near the pier's root, looking out along the pier and up at the ceiling
const PIER_YAW = 3 * D2R;
const CAM = new THREE.Vector3(qn('cx', -20), 0, qn('cz', -24)); CAM.y = Math.max(groundH(CAM.x, CAM.z), 0) + qn('cy', 7.5);
const BEAR = qn('b', -35), PITCH = qn('pd', 24), MM = qn('mm', 14);
const dirB = (b) => new THREE.Vector3(Math.sin(b * D2R), 0, -Math.cos(b * D2R));
const sunB = BEAR + qn('sb', 38), sunE = qn('se', 58);
const SUN = dirB(sunB).multiplyScalar(Math.cos(sunE * D2R)).setY(Math.sin(sunE * D2R)).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
scene.fog = new THREE.Fog(0xa6cdee, 2500, 40000);
const ocean = createOcean(S, { slab: true, amp: 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: 0.2, foam: 0.9, rings: 200, segs: 320 });
ocean.add(scene); ocean.refl.visible = false;                 // the top surface is never seen from down here
const OU = ocean.U; OU.sunCol.value.set(0xfff4e2);
const bay = createBay(S, { shadows: false, pierYaw: PIER_YAW, pierLen: 152, pierLights: 0, winI: 0.0, moonLightI: 3.0, hemiI: 1.3, beamI: 0.0, boats: 0 });
bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
// light under the lifted sea: on the bed, the town, the pier
patchSlab(bay.terrain.material, OU, GROUND_GLSL, { seabed: true, noLamps: true });
patchSlab(bay.buildings.material, OU, GROUND_GLSL);
bay.pier.group.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial && !o.material.userData.slab) { o.material.userData.slab = 1; patchSlab(o.material, OU, GROUND_GLSL); } });
// the open-sea floor beyond the terrain (so the gap under the ceiling reaches the horizon)
{ const sh = new THREE.Shape(); sh.moveTo(-40000, -40000); sh.lineTo(40000, -40000); sh.lineTo(40000, 40000); sh.lineTo(-40000, 40000); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(-2590, 290); hole.lineTo(2590, 290); hole.lineTo(2590, -3390); hole.lineTo(-2590, -3390); hole.closePath(); sh.holes.push(hole);
  const fg = new THREE.ShapeGeometry(sh); fg.rotateX(Math.PI / 2); fg.translate(0, -28.6, 0);
  const fm = patchSlab(new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.4, side: THREE.DoubleSide }), OU, GROUND_GLSL);
  const floor = new THREE.Mesh(fg, fm); floor.frustumCulled = false; scene.add(floor); }
// rocks on the bed: a scatter in view + clusters at the pier's legs
const RR = rng(21), rocks = [];
for (let i = 0; i < 4000 && rocks.length < 260; i++) {
  const b = BEAR + (RR() - 0.5) * 90, d = 8 + Math.pow(RR(), 1.6) * 260, p = CAM.clone().addScaledVector(dirB(b), d); const s = sField(p.x, p.z);
  if (s > -4) continue; const sz = 0.25 + Math.pow(RR(), 3) * 2.2;
  rocks.push({ x: p.x, y: groundH(p.x, p.z) - sz * 0.15, z: p.z, s: sz, sy: 0.45 + RR() * 0.3, sx: 0.8 + RR() * 0.5, ry: RR() * 6.28, rx: (RR() - 0.5) * 0.3 });
}
for (let d = 20; d < 152; d += 6) for (const sx of [-2.2, 2.2]) if (RR() < 0.5) { const w = bay.pier.toWorld(sx + (RR() - 0.5) * 1.2, 0, -d); const sz = 0.3 + RR() * 0.6; rocks.push({ x: w.x, y: groundH(w.x, w.z) - 0.1, z: w.z, s: sz, sy: 0.5, ry: RR() * 6 }); }
const rockM = createRocks(S, rocks); patchSlab(rockM.material, OU, GROUND_GLSL);
// boats on the lifted sea (seen from below as dark hulls through the water)
const BR = rng(8), boatL = [];
while (boatL.length < 24) { const x = (BR() * 2 - 1) * 650, z = -70 - BR() * 1100; if (sField(x, z) > -30) continue; boatL.push(new THREE.Vector4(x, z, BR() * 6.28, 7 + BR() * 12)); }
boatL.forEach((b, i) => OU.boats.value[i].copy(b));
// the beach crowd, floating beside the ceiling's edge (they stood on the sand: s 4..28 m inland of the waterline)
const PR = rng(31), people = [];
for (let i = 0; i < 20000 && people.length < 170; i++) {
  const b = BEAR + (PR() - 0.5) * 120, d = 60 + PR() * 900, p = CAM.clone().addScaledVector(dirB(b), d); const s = sField(p.x, p.z);
  if (s < 3 || s > 28) continue; people.push({ x: p.x, z: p.z, y: groundH(p.x, p.z), yaw: PR() * 6.28 });
}
const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'point', 'handsHead', 'filming'], rimI: 0.35, seed: 5 });
const birds = createBirds(S, 14, { flap: 11, seed: 4 });
const T = SHOT.s04_seaup.T;
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s04_seaup', tt), H = heightAt(tau, T);
  // the webcam's slow automatic tilt up the ceiling (PTZ), a little wind shake on the post
  const pitch = (PITCH + 2.2 * tt) * D2R, bear = BEAR + 0.8 * tt;
  const dir = dirB(bear); dir.y = Math.tan(pitch); dir.normalize();
  applyCam(camera, { pos: CAM, look: CAM.clone().add(dir), mm: MM, roll: 0 }, shake(t, 0.03, 0.7, 4));
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  OU.sunDir.value.copy(SUN); OU.sunI.value = 1.0; OU.moonI.value = 0; OU.moonDir.value.copy(SUN); OU.lift.value = H; ocean.mesh.update(S, t);
  bay.update(S, t, { waveAmp: 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: CAM.clone() });
  const spin = clamp(tau / 4) * (1 + 0.15 * tau);
  crowd.update(t, { agitation: 0.6, lift: H, tumble: spin * 1.2 });
  crowd.material.U.rimDir.value.copy(SUN);
  birds.update(t, (x) => CAM.clone().addScaledVector(dirB(bear - 20 + x * 4), 140).setY(CAM.y + 70 + Math.sin(x * 0.7) * 6), 14, 1.3);
});
