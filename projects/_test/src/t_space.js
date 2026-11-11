import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
const S = createStudio({ samples: 1, near: 10, far: 5e6, post: { exposure: 1.0, bloom: 0.3, bloomThreshold: 1.2, vignette: 0.4 } });
const SP = createSpace(S, { sunDir: [1, 0.15, -0.35], ringIn: 1.2, ringOut: 2.5 });
SP.ring.rotation.set(-Math.PI / 2 + 0.38, 0, 0.25);
S.run((t) => {
  S.camera.position.set(-3000, 9000, 33000); S.camera.lookAt(0, -2500, 0); S.camera.fov = 2 * Math.atan(18 / 50) * 180 / Math.PI; S.camera.updateProjectionMatrix();
  SP.update(S, t);
});
