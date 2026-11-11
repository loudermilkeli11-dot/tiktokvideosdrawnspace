// s02_flip: τ 0→3. A camera bolted to a lamp post at the plaza's edge (6 m up) watches the flip: at 0 everything loose
// leaves the ground at once (people, benches, the fountain's whole pool, cars on the avenue, pigeons) and the camera tilts up
// to follow them. Nothing is hand-animated: heights come from the law. The camera itself is bolted, so it stays.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { heightAt } from './story.js';
import { cityWorld, D2R } from './citykit.js';
import { tauAt } from './story.js';
const S = createStudio({ samples: 4, shadows: true, post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.22, grain: 0.012, ca: 0.0008, sat: 1.12, contrast: 1.05 } });
const CAM = new THREE.Vector3(17, 4.5, 15);
const W = cityWorld(S, { shadows: true, keepOut: [[17, 15, 8]] });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s02_flip', tt), L = heightAt(tau, 5);
  // tilt: from the plaza (looking slightly down at the crowd and fountain) up to follow the rising crowd (look at ~0.6 L)
  const target = new THREE.Vector3(-8, Math.max(0, L * 0.72) + 1.2, -10);
  applyCam(S.camera, { pos: CAM, look: target, mm: 22, roll: 0 }, [shake(t, 0.03, 1.1, 3)[0], shake(t, 0.03, 1.1, 3)[1] + 0.8 * kick(tau, 0.0, 1.0), 0]);
  W.update(t, { tau, T: 5, focus: new THREE.Vector3(0, L * 0.5, 0) });
});
