// s09_orbit (film 27.5–29.5): the quiet image. The emptied Earth turning in sunlight: bare grey-brown sea floors, the last of
// the water shell gone. Slow drift, no counter. Hard cut on the 29.5 s hit to s09_loop (frame 1's bay).
import { createStudio, THREE, makeSpace, aimFor, dirLL, qn, SUN } from './spacekit.js';
import { applyCam, shake } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { SHOT } from './story.js';
const F0 = SHOT.s09_orbit.t0, DUR = SHOT.s09_orbit.dur;
const S = createStudio({ samples: 4, near: 50, far: 3e6,
  post: { exposure: 1.0, bloom: 0.2, bloomThreshold: 1.3, bloomRadius: 0.6, vignette: 0.42, grain: 0.024, ca: 0.0006, sat: 1.04, contrast: 1.06 } });
const { SP, SH, sun } = makeSpace(S, { clouds: 0.3, glare: 0.6 });
SP.EU.seabed.value = 1;
const CAMDIR = dirLL(qn('lon', -150), qn('lat', 14));
S.run((t) => {
  const tt = t - 4, u = ease.inOutSine(clamp(tt / DUR));
  SH.update(S, t, { h: 0, show: false });
  SP.earth.rotation.y = 0.035 + tt * 0.012;
  const mm = 40, pos = CAMDIR.clone().multiplyScalar(lerp(30000, 31500, u));
  applyCam(S.camera, { pos, look: aimFor(pos, 270, qn('sy', 460), mm), mm, roll: lerp(-10, -11, u) }, shake(t, 0.012, 0.4, 9));
  SP.update(S, t); sun.position.copy(S.camera.position).add(SUN); sun.target.position.copy(S.camera.position);
});
