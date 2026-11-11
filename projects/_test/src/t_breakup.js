// test: cracks (left col) and breakup (right) at a few states, black sky
import { createStudio, THREE } from '@engine/engine.js';
import { createBreakup } from '@engine/breakup.js';
const S = createStudio({ samples: 1, post: { exposure: 1.1, bloom: 0.15, bloomThreshold: 1.5 } });
const B = createBreakup(S, {});
const Q = new URLSearchParams(location.search); const st = +(Q.get('st') || 0.5);
S.run((t) => {
  S.camera.position.set(0, 0, 0); S.camera.lookAt(0, 0, -1); S.camera.fov = 30; S.camera.updateProjectionMatrix();
  const sun = new THREE.Vector3(0.6, 0.2, 0.75).normalize();
  B.update(t, { centre: new THREE.Vector3(0, 0, -3000), radius: 600, md: new THREE.Vector3(0, 0, -1), sunDir: sun, crack: Math.min(1, st * 2), sep: Math.max(0, st - 0.5) * 0.8, stretch: Math.max(0, st - 0.6) * 0.6, tail: Math.max(0, st - 0.6) * 1.2, airCol: new THREE.Color(0.01, 0.015, 0.03) });
});
