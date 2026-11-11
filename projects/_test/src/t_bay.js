// Studio proof shot (3 s): Moon rising over the lit bay; hero + crowd on the beach; slow push-in; motion blur.
import { createStudio, THREE } from '@engine/engine.js';
import { createMoon, sunForPhase } from '@engine/moon.js';
import { createSky } from '@engine/sky.js';
import { createOcean } from '@engine/ocean.js';
import { createBay, GROUND_GLSL, groundH } from '@engine/bay.js';
import { createCrowd, scatter, createHero, createBirds } from '@engine/crowd.js';
import { Path, applyCam, shake } from '@engine/camera.js';
import { keyed } from '@engine/util.js';
const S = createStudio({ samples: 8, shadows: true, post: { exposure: 1.25, bloom: 0.45, vignette: 0.4, grain: 0.03 } });
const { scene, camera } = S;
S.hdri('hdri_night_1k.hdr', 0.25);
const sky = createSky(S, { lp: 0.5 }); scene.add(sky);
const moon = createMoon(S); scene.add(moon);
const ocean = createOcean(S, { amp: 0.55, groundGLSL: GROUND_GLSL }); ocean.add(scene);
const bay = createBay(S, { shadows: true });
const beach = (x, z) => { const h = groundH(x, z); return h > 0.2 && h < 1.6; };
const crowd = createCrowd(S, [
  ...scatter(70, { x0: -60, x1: 60, z0: -6, z1: 14, keep: beach }, groundH, [0, -2000], 4),
  ...scatter(140, { x0: -300, x1: 300, z0: 18, z1: 30, keep: (x, z) => groundH(x, z) > 3.5 }, groundH, [0, -2000], 5),
]);
const hero = createHero(S, { phone: true });
const birds = createBirds(S, 26);
const path = new Path([
  { t: 4.0, pos: [1.2, 1.55, 9.5], look: [0, 6, -400], mm: 32 },
  { t: 7.0, pos: [0.7, 1.45, 7.6], look: [0, 9, -400], mm: 35, ease: 'inOutSine' },
]);
S.run((t) => {
  const st = path.at(t); applyCam(camera, st, shake(t, 0.12, 0.5));
  // Moon: low over the sea, rising; ~6x apparent size (drama)
  const rise = keyed([[4, 0.012], [7, 0.03, 'linear']], t);
  const md = new THREE.Vector3(0.06, rise, -1).normalize();
  const dist = 15000, ang = THREE.MathUtils.degToRad(0.26 * 6);
  moon.position.copy(md).multiplyScalar(dist); moon.scale.setScalar(dist * Math.tan(ang));
  moon.faceNearSide(md.clone().negate());
  moon.U.sunDir.value.copy(sunForPhase(md.clone().negate(), 25, undefined, 20)); moon.U.earthDir.value.copy(md).negate();
  moon.U.haze.value = 1.2; moon.U.horizonY.value = 0; moon.U.hazeH.value = dist * Math.tan(ang) * 0.9;
  sky.U.moonDir.value.copy(md); sky.U.moonAng.value = ang; sky.U.moonLight.value = 0.06; sky.update(S, t);
  ocean.U.moonDir.value.copy(md); ocean.U.moonI.value = 1.6; ocean.U.amp.value = 0.55; ocean.mesh.update(S, t);
  bay.update(S, t, { waveAmp: 0.55, moonDir: md, shadowCenter: new THREE.Vector3(0, 0, 0) });
  crowd.update(t, { agitation: 0.35 });
  hero.root.position.set(0, groundH(0, 4.5), 4.5); hero.root.rotation.y = 0.1;
  hero.pose({ armR: [-2.0, 0.2], armL: [-0.1, 0.1], head: [0, 0.15] });
  birds.update(t, (tt) => new THREE.Vector3(-80 + tt * 9, 38, -120), 9, 1.4);
});
