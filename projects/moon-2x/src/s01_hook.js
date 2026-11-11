// s01_hook — FRAME 1 (sealed dossier channel/war-room/2026-11-11-first-video.md): flash-forward to rung 5.
// Low 85 mm down the pier at dusk; hero small at the pier's end, silhouetted against a giant Moon rising behind the far town.
import { createStudio, THREE } from '@engine/engine.js';
import { createMoon, sunForPhase } from '@engine/moon.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL } from '@engine/bay.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng } from '@engine/util.js';
const D2R = Math.PI / 180;
const S = createStudio({ samples: 4, shadows: true, post: { exposure: 1.1, bloom: 0.16, bloomThreshold: 1.6, bloomRadius: 0.6, vignette: 0.5, grain: 0.03, sat: 1.08, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri('hdri_dusk_1k.hdr', 0.08);
const PIER_YAW = 3 * D2R;
const sky = createSky(S, { lp: 0.2, beltI: 0.22, stars: 0.8, nightZen: 0x01040d, nightHor: 0x0c1630 }); scene.add(sky);
const moon = createMoon(S, { sunI: 1.35, normalScale: 2.0 }); scene.add(moon);
const ocean = createOcean(S, { amp: 1.0, level: 1.1, groundGLSL: GROUND_GLSL, deep: 0x041a24, shallow: 0x0d4a55 }); ocean.add(scene);
const bay = createBay(S, { shadows: true, pierYaw: PIER_YAW, pierLen: 152, pierLights: 6, pierLightI: 10, winI: 0.75, moonLightI: 1.1, hemiI: 0.12 });
const P = bay.pier, DECK = P.deckY;
// people on the pier: clusters at the rails, a clear lane down the middle to the hero
const R = rng(21); const people = [];
for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1; const lx = side * (1.25 + R() * 0.95), lz = -138 - R() * 11;
  const w = P.toWorld(lx, DECK, lz); const rail = Math.abs(lx) > 1.9 && R() < 0.5;
  people.push({ x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + (rail ? -side * Math.PI / 2 : (R() - 0.5) * 0.4), pose: rail ? 'rail' : undefined }); }
const crowd = createCrowd(S, people, { poses: ['phoneUp', 'filming', 'point', 'handsHead', 'stand', 'shade', 'phoneUp', 'pocket', 'rail', 'arms', 'filming', 'phoneUp'], rimI: 1.2 });
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.4 });
const heroW = P.toWorld(0.1, DECK, -145); hero.root.position.copy(heroW); hero.root.rotation.y = PIER_YAW;
const birds = createBirds(S, 22, { flap: 8 });
const camP = P.toWorld(0.45, DECK + 0.22, -93);
const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
// rung-5 Moon: angular radius asin(1737.4 / 19867) = 5.02 deg; centre 1.2 deg up, 0.4 deg right of the pier axis
const ANG = Math.asin(1737.4 / 19867), DIST = 15000;
const md = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.6 * D2R); md.y = Math.tan(1.0 * D2R); md.normalize();
const sun = sunForPhase(md.clone().negate(), 48, undefined, 160);
S.run((t) => {
  const tt = t - 4;
  // camera: locked-off long lens with a slow 1.5 cm/s creep and breathing shake
  const pos = camP.clone().addScaledVector(fwd, tt * 0.25);
  const look = pos.clone().addScaledVector(fwd, 1000); look.y += Math.tan(2.9 * D2R) * 1000;
  applyCam(camera, { pos, look, mm: 85, roll: 0 }, shake(t, 0.05, 0.4));
  moon.position.copy(camP).addScaledVector(md, DIST); moon.scale.setScalar(DIST * Math.sin(ANG));
  moon.faceNearSide(md.clone().negate(), [0.1, 0.05]);
  moon.U.sunDir.value.copy(sun); moon.U.earthDir.value.copy(md).negate();
  moon.U.haze.value = 1.0; moon.U.horizonY.value = 0; moon.U.hazeH.value = DIST * Math.sin(ANG) * 0.3; moon.U.hazeLift.value = 0.02;
  const skySun = sun.clone(); skySun.y = -0.17; skySun.normalize();
  sky.U.sunDir.value.copy(skySun); sky.U.moonDir.value.copy(md); sky.U.moonAng.value = ANG; sky.U.moonLight.value = 0.05; sky.update(S, t);
  ocean.U.moonDir.value.copy(md); ocean.U.moonI.value = 3.0; ocean.U.sunDir.value.copy(skySun); ocean.U.sunI.value = 0.0; ocean.mesh.update(S, t);
  bay.update(S, t, { waveAmp: 1.0, level: 1.1, moonDir: md, moonLightI: 1.1, shadowCenter: heroW });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.45 });
  birds.update(t, (x) => camP.clone().addScaledVector(fwd, 260).addScaledVector(right, -55 + x * 7).setY(DECK + 19 + Math.sin(x * 0.7) * 1.5), 7, 1.3);
});
