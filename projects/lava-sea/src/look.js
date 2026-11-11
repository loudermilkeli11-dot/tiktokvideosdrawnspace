// lava-sea look test: the bay at sunset, the sea turned to molten basalt (?lava=0..1). Silhouettes against the glow.
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, wedge, groundH } from '@engine/bay.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng } from '@engine/util.js';
import { createFire } from '@engine/fire.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search), LAVA = +(Q.get('lava') ?? 1);
const S = createStudio({ samples: 2, shadows: false, post: { exposure: +(Q.get('ex') ?? 1.0), bloom: 0.3, bloomThreshold: 1.3, bloomRadius: 0.7, vignette: 0.35, grain: 0.02, sat: 1.1, contrast: 1.06 } });
const { scene, camera } = S;
S.hdri('hdri_dusk_1k.hdr', 0.25);
const SUN = new THREE.Vector3(-0.12, Math.sin(2.5 * D2R), -1).normalize();          // low, ahead-left: backlit
const sky = createSky(S, { lp: 0.1, stars: 0.3, beltI: 0.2, duskCol: 0xff6a2a }); scene.add(sky);
const ocean = createOcean(S, { amp: 0.6, level: 0, groundGLSL: GROUND_GLSL, deep: 0x062a38, shallow: 0x1a6070, amb: 0x1a2a3a, reflScale: 0.35 }); ocean.add(scene);
const bay = createBay(S, { shadows: false, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0.9, moonLightI: 1.2, hemiI: 0.4 });
bay.moonLight.color.set(0xffa860); bay.hemi.color.set(0x8a6a70);
const lavaLight = new THREE.DirectionalLight(0xff6a20, 0); scene.add(lavaLight); scene.add(lavaLight.target);
const P = bay.pier, DECK = P.deckY, PIER_YAW = 3 * D2R;
const CAM = new THREE.Vector3(+(Q.get('cx') ?? -74), 0, +(Q.get('cz') ?? 22)); CAM.y = groundH(CAM.x, CAM.z) + +(Q.get('cy') ?? 1.5);
const dirB = (b) => new THREE.Vector3(Math.sin(b * D2R), 0, -Math.cos(b * D2R));
const onPier = (x, z) => { const dx = x - P.base.x, dz = z - (P.base.z + 4); const lx = dx * Math.cos(PIER_YAW) - dz * Math.sin(PIER_YAW), lz = dx * Math.sin(PIER_YAW) + dz * Math.cos(PIER_YAW); return Math.abs(lx) < 2.05 && lz < -40 && lz > -150; };
const pm = P.toWorld(0, DECK, -100), pierB = Math.atan2(pm.x - CAM.x, -(pm.z - CAM.z));
const R = rng(12);
const people = wedge(30, [CAM.x, CAM.z], pierB, 60, 160, 3, onPier, 12).map(([x, z]) => ({ x, z, y: DECK, yaw: (R() - 0.5) * 2.5 }));
for (let i = 0, n = 0; i < 9000 && n < 30; i++) { const b = (R() - 0.5) * 70, d = 5 + R() * 20, p = CAM.clone().addScaledVector(dirB(b), d), h = groundH(p.x, p.z);
  if (h > 0.35 && h < 3.5) { people.push({ x: p.x, z: p.z, y: h, yaw: Math.PI + (R() - 0.5) * 1.2, pose: R() < 0.5 ? 'handsHead' : undefined }); n++; } }
const crowd = createCrowd(S, people, { poses: ['handsHead', 'arms', 'phoneUp', 'point', 'filming', 'shade', 'stand', 'handsHead'], rimI: 1.4, rimCol: 0xff7a30, seed: 5 });
const heroP = CAM.clone().addScaledVector(dirB(5), 13); heroP.y = groundH(heroP.x, heroP.z);
const hero = createHero(S, { pose: 'handsHead', rimI: 1.8, rimCol: 0xff7a30 }); hero.root.position.copy(heroP); hero.root.rotation.y = -0.1;
const birds = createBirds(S, 14, { flap: 12, seed: 4 });
// fire: the wooden pier ignites from radiant heat alone (lava ~1,150 C radiates ~150x sunlight); boats burn on the melt
const FR = rng(77), fpts = [];
for (let d = 8; d <= 150; d += 2.2) for (const side of [-1, 0, 1]) { if (FR() < (side === 0 ? 0.35 : 0.8)) fpts.push({ p: P.toWorld(side * (1.9 + FR() * 0.3), DECK - 0.2, -d - FR() * 1.5), s: 2.5 + FR() * 4.5 + (side === 0 ? 2 : 0), seed: FR() }); }
for (let d = 10; d <= 150; d += 3.5) fpts.push({ p: P.toWorld((FR() - 0.5) * 3.5, 0.6, -d), s: 3 + FR() * 3, seed: FR() });   // piles burning at the lava line
const fire = createFire(S, fpts, { I: 2.6 });
const boatFires = createFire(S, bay.boats.map((b, i) => ({ p: new THREE.Vector3(b.x, 0.8, b.z), s: 4 + (i % 3) * 2, seed: i * 0.37 })), { I: 2.6 });
S.run((t) => {
  const tt = Math.max(t - 4, 0);
  const mm = +(Q.get('mm') ?? 35), pitch = +(Q.get('pd') ?? -3) * D2R;
  const dir = dirB(2 + 0.25 * tt); dir.y = Math.tan(pitch); dir.normalize();
  const pos = CAM.clone().addScaledVector(dirB(0), tt * 0.4);
  applyCam(camera, { pos, look: pos.clone().add(dir), mm, roll: 0 }, shake(t, 0.03 + 0.12 * LAVA, 0.9, 2));
  sky.U.sunDir.value.copy(SUN); sky.U.tintAll.value.setRGB(1 + 0.25 * LAVA, 1 - 0.1 * LAVA, 1 - 0.3 * LAVA); sky.update(S, t);
  ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 0.8 * (1 - LAVA); ocean.U.moonI.value = 0; ocean.U.moonDir.value.copy(SUN);
  ocean.U.lava.value = LAVA; ocean.U.amp.value = 0.6 * (1 - 0.55 * LAVA); ocean.mesh.update(S, 4 + tt * (1 - 0.8 * LAVA));      // lava is ~10^4x more viscous: swells slow and flatten
  bay.update(S, t, { waveAmp: 0.6 * (1 - 0.55 * LAVA), level: 0, moonDir: SUN, moonLightI: 1.2, shadowCenter: heroP });
  bay.hemi.groundColor.setRGB(0.05 + 0.9 * LAVA, 0.04 + 0.3 * LAVA, 0.03); bay.hemi.intensity = 0.4 + 1.2 * LAVA;
  lavaLight.intensity = 4.0 * LAVA; lavaLight.position.copy(heroP).add(new THREE.Vector3(0, -40, -200)); lavaLight.target.position.copy(heroP);
  crowd.update(t, { agitation: 0.2 + 0.8 * LAVA });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.set(0, -0.15, -1).normalize();
  fire.U.amt.value = LAVA; fire.update(t); boatFires.U.amt.value = LAVA; boatFires.update(t);
  bay.boats.forEach((b, i) => { const a = boatFires.mesh.geometry.attributes.aP; a.setXYZ(i, b.x, 1.2 + LAVA * 0.8, b.z); }); boatFires.mesh.geometry.attributes.aP.needsUpdate = true;
  birds.update(t, (x) => CAM.clone().addScaledVector(dirB(-20 + x * 6), 110).setY(CAM.y + 14 + Math.sin(x) * 3), 7, 1.6);
});
