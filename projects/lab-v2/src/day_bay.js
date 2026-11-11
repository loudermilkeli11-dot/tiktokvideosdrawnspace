// Studio v2 look test: the bay at bright midday (front-lit, saturated, cheap shading). Compare render cost and phone-size
// readability against the photoreal dusk of moon-2x. ?mb=N sets samples; ?scale=0.5 for quick looks.
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, wedge, groundH } from '@engine/bay.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng } from '@engine/util.js';
const D2R = Math.PI / 180;
// daywear: saturated tops, light and denim bottoms (PALETTE is read when the crowd is built)
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48);
const Q = new URLSearchParams(location.search), SH = Q.get('sh') !== '0';
const S = createStudio({ samples: 2, shadows: SH,
  post: { exposure: 1.0, bloom: 0.05, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.16, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri(Q.get('dusk') ? 'hdri_dusk_1k.hdr' : 'hdri_day_1k.hdr', 0.55);
const SUN = new THREE.Vector3(0.42, 0.62, 0.66).normalize();       // high, behind-right of camera: front light, shadows fall away-left
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky);
sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa6cdee);
const ocean = createOcean(S, { amp: 0.45, level: 0, groundGLSL: GROUND_GLSL, deep: 0x0a4e66, shallow: 0x2aa5ab, amb: 0x5f93b8, reflScale: 0.35, foam: 0.9 }); ocean.add(scene);
const bay = createBay(S, { shadows: SH, pierYaw: 3 * D2R, pierLen: 152, pierLights: 0, winI: 0.0, moonLightI: 3.0, hemiI: 1.4, beamI: 0.0 });
bay.moonLight.color.set(0xfff1df); bay.hemi.color.set(0xaccbec); bay.hemi.groundColor.set(0x8c7c5c);
bay.U.power.value = 0; bay.U.lampI.value = 0; bay.U.winI.value = 0;
const P = bay.pier, DECK = P.deckY, PIER_YAW = 3 * D2R;
const CAM = new THREE.Vector3(+(Q.get('cx') ?? -74), 0, +(Q.get('cz') ?? 22)); CAM.y = groundH(CAM.x, CAM.z) + +(Q.get('cy') ?? 1.6);
const dirB = (bDeg) => new THREE.Vector3(Math.sin(bDeg * D2R), 0, -Math.cos(bDeg * D2R));
// people: along the pier (as in moon-2x s03) + a scatter on the dry sand in front of the camera
const onPier = (x, z) => { const dx = x - P.base.x, dz = z - (P.base.z + 4); const lx = dx * Math.cos(PIER_YAW) - dz * Math.sin(PIER_YAW), lz = dx * Math.sin(PIER_YAW) + dz * Math.cos(PIER_YAW); return Math.abs(lx) < 2.05 && lz < -40 && lz > -150; };
const pm = P.toWorld(0, DECK, -100), pierB = Math.atan2(pm.x - CAM.x, -(pm.z - CAM.z));
const R = rng(12);
const people = wedge(30, [CAM.x, CAM.z], pierB, 60, 160, 3, onPier, 12).map(([x, z]) => ({ x, z, y: DECK, yaw: (R() - 0.5) * 2.5 }));
for (let i = 0, n = 0; i < 6000 && n < 30; i++) {
  const b = (R() - 0.5) * 50, d = 16 + R() * 26, p = CAM.clone().addScaledVector(dirB(b), d), h = groundH(p.x, p.z);
  if (h > 0.35 && h < 3.5) { people.push({ x: p.x, z: p.z, y: h, yaw: (R() - 0.5) * 6.28 }); n++; }
}
const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'filming'], rimI: 0.25, seed: 5 });
const heroP = CAM.clone().addScaledVector(dirB(+(Q.get('hb') ?? 5)), +(Q.get('hd') ?? 9)); heroP.y = groundH(heroP.x, heroP.z);
const hero = createHero(S, { pose: 'shade', rimI: 0.3 }); hero.root.position.copy(heroP); hero.root.rotation.y = -0.1;
const birds = createBirds(S, 10, { flap: 9, seed: 4 });
S.run((t) => {
  const tt = Math.max(t - 4, 0);
  const mm = +(Q.get('mm') ?? 50), yH = +(Q.get('yh') ?? 400), pitch = Q.get('pd') ? +Q.get('pd') * D2R : Math.atan(((yH - 480) / 480) * (18 / mm));
  const dir = dirB(2 + 0.25 * tt); dir.y = Math.tan(pitch); dir.normalize();
  const pos = CAM.clone().addScaledVector(dirB(0), tt * 0.6);
  applyCam(camera, { pos, look: pos.clone().add(dir), mm, roll: 0 }, shake(t, 0.015, 0.5, 2));
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
  ocean.U.sunDir.value.copy(SUN); ocean.U.sunI.value = 1.0; ocean.U.moonI.value = 0.0; ocean.U.moonDir.value.copy(SUN); ocean.mesh.update(S, t);
  bay.update(S, t, { waveAmp: 0.45, level: 0, moonDir: SUN, moonLightI: 3.0, shadowCenter: heroP.clone().addScaledVector(dirB(0), 30) });
  crowd.update(t, { agitation: 0.15 });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(SUN);
  birds.update(t, (x) => CAM.clone().addScaledVector(dirB(-10 + x * 3), 120).setY(CAM.y + 18 + Math.sin(x) * 2), 6, 1.0);
});
