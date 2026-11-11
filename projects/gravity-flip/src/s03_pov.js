// s03_pov: τ 3→5.5. The camera operator falls up too: we hang among the floating crowd while the plaza drops away below.
// At τ 5 (film 8.0) gravity returns; nobody stops: everything keeps coasting up (still 177 km/h, slowing).
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createHero } from '@engine/crowd.js';
import { heightAt } from './story.js';
import { cityWorld, D2R } from './citykit.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: 2, shadows: true, post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.24, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const W = cityWorld(S, { shadows: true, keepOut: [[-12, 30, 7]] });
const hero = createHero(S, { pose: 'arms', rimI: 0.25 });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s03_pov', tt), L = heightAt(tau, 5);
  const { spin } = W.update(t, { tau, T: 5, focus: new THREE.Vector3(-10, 0, 10) });
  // we drift and slowly turn toward the towers' tops as we rise (camera motion eased; the height is the law)
  const pos = new THREE.Vector3(-12 + 0.4 * tt, 1.7 + L, 30 - 0.6 * tt);
  const yaw = (10 + 10 * tt) * D2R, pitch = (-30 + 3.5 * tt) * D2R;
  const dir = new THREE.Vector3(Math.sin(yaw), Math.tan(pitch), -Math.cos(yaw)).normalize();
  applyCam(S.camera, { pos, look: pos.clone().add(dir), mm: 21, roll: 4 * Math.sin(tt * 0.9) }, shake(t, 0.18, 0.9, 4));
  // the hero floats just ahead of us, slowly tumbling, arms out
  hero.root.position.set(-9.6 + 0.3 * tt, L - 0.7 - 0.12 * tau, 23.5); hero.root.rotation.set(0.45 + 0.35 * spin, -1.15 + 0.25 * spin, 0.3 + 0.3 * spin);
});
