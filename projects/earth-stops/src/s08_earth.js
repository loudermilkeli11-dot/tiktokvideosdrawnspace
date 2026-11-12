// s08_earth (film 52.0–63.5, 345 fr, e 4.25 -> 5.0, then SPIN RESTORED at 61.0 = shot 9.0). Page t = shot time + 4. HIT 3 in.
// The whole planet: the same Sun and coast band as s07 (groupB_orbit), a slow pull-back from the American Pacific coast
// (70 mm, 14,000 km from Earth's centre) to the whole disc (35 mm, 25,000 km), centred over the eastern Pacific so the long
// west coast of the Americas (the coast the moving ocean runs into, from Alaska to Chile) crosses the disc, the bared shelves
// of the Atlantic coasts near the right limb, every ocean streaked east, dust veils over the land, clouds dragged east.
// At 1 film px ≈ 15 km the 1.9 km surge is sub-pixel: the band is floored at minPx (DRAMATIZATION of width).
// Earth's turn: SP.earth.rotation.y = earthYaw(film) (kit): frozen until T_RESTORE (61.0), turning again after. The camera
// stops moving at shot 8.5 so the restart reads against a still frame. The score owns the braaam/silence; see _sound.js.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace } from '@engine/space.js';
import { applyCam } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { dirLL, earthYaw, POST_ORBIT, SAMPLES, qn, D2R } from './kit.js';
import { ev, evAt, SHOT, T_RESTORE } from './story.js';
import { createCoastBand, cloudShiftAt } from './groupB_orbit.js';

const SHOTN = 's08_earth', DUR = SHOT[SHOTN].dur, T0 = SHOT[SHOTN].t0, T_HOLD = 8.5;
const SUN_ORBIT = dirLL(-152, 14);                                          // = s07 (same moment)
const S = createStudio({ samples: SAMPLES.s08_earth, near: 50, far: 3e6, post: POST_ORBIT });
const SEG = [384, 192];
const SP = createSpace(S, { sunDir: SUN_ORBIT.toArray(), ring: false, stars: 0.3, sunI: 1.6, cityI: 0.8, coast: true, coastW: 4096, sunGlare: 0, seg: SEG });
SP.EU.cloudsI.value = 0.6; SP.EU.detail.value = 0.6;
const BAND = createCoastBand(S, SP, { seg: SEG, minPx: 2.2, seaK: 8, streakI: 1.4, dustI: 1.2 });
const Y = new THREE.Vector3(0, 1, 0);
S.run((t) => {
  const tt = Math.max(t - 4, 0), film = T0 + tt, e = ev(SHOTN, tt), u = ease.inOutSine(clamp(tt / T_HOLD));
  const yaw = earthYaw(film); SP.earth.rotation.y = yaw;
  // camera fixed in space (the planet turns under it after the restore); aim at a lat/lon of the frozen planet
  const c = dirLL(qn('clon', lerp(-116, -108, u)), qn('clat', lerp(26, 12, u))).applyAxisAngle(Y, earthYaw(T0));
  const pos = c.clone().multiplyScalar(qn('d', lerp(14000, 25000, u))), mm = qn('mm', lerp(70, 35, u));
  applyCam(S.camera, { pos, look: new THREE.Vector3(0, 0, 0), mm, roll: 0 });
  S.camera.up.set(0, 1, 0); S.camera.lookAt(0, 0, 0);
  // compose: Earth's centre a little below frame centre (the type sits on ocean, top-left)
  S.camera.rotateX(qn('tilt', lerp(-2.0, 2.2, u)) * D2R);
  SP.update(S, t);
  const cs = cloudShiftAt(evAt(Math.min(film, T_RESTORE))); SP.EU.cloudShift.value = cs; BAND.update(e, cs);
});
