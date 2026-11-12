// s07_coast (film 43.5–52.0, 255 fr, e 3.542 -> 4.25). Page t = shot time + 4. HIT 2 in. Board: "Every … coast gets hit."
// Earth from ~900 km (API R4, km units; the board said 400 km, but the 4k Earth map is mush that close), afternoon over the
// California coast (35°N, our city's latitude), looking NNW along it: the Pacific on the LEFT (west), the land on the RIGHT
// (east), the limb and the blue air rim at the top.
// The law: the ocean keeps moving east at V, so it runs INTO this coast (land east of the water): groupB_orbit's surge line
// + white water pushed inland by drift(e) (1.35 -> 1.62 km; floored at 2.5 px: DRAMATIZATION of width), torn white water offshore,
// whitecap streaks over the whole moving sea, a tan dust veil streaked east over the land, clouds dragged east.
// Sun from the west-south-west (subsolar 152°W, 14°N: mid-afternoon here), so the land is lit and the shadows point east.
// Earth frozen (kit earthYaw: e inside the event). Camera: a slow drift north + 52 -> 48 mm, calm (no shake: orbit).
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace } from '@engine/space.js';
import { applyCam, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { dirLL, earthYaw, POST_ORBIT, SAMPLES, qn, D2R } from './kit.js';
import { ev, SHOT } from './story.js';
import { createCoastBand, cloudShiftAt } from './groupB_orbit.js';

const SHOTN = 's07_coast', DUR = SHOT[SHOTN].dur;
export const SUN_ORBIT = dirLL(-152, 14);
const S = createStudio({ samples: SAMPLES.s07_coast, near: 5, far: 3e6, post: POST_ORBIT });
const SEG = [768, 384];
const SP = createSpace(S, { sunDir: SUN_ORBIT.toArray(), ring: false, stars: 0.25, sunI: 1.6, cityI: 0.8, coast: true, coastW: 4096, sunGlare: 0, seg: SEG });
SP.EU.cloudsI.value = 0.6; SP.EU.detail.value = 0.9;
const BAND = createCoastBand(S, SP, { seg: SEG, minPx: 2.5, seaK: 8 });
const Y = new THREE.Vector3(0, 1, 0);
const yaw0 = earthYaw(SHOT[SHOTN].t0);
const ll = (lon, lat, r) => dirLL(lon, lat).applyAxisAngle(Y, yaw0).multiplyScalar(r);
S.run((t) => {
  const tt = Math.max(t - 4, 0), e = ev(SHOTN, tt), u = ease.inOutSine(clamp(tt / DUR));
  SP.earth.rotation.y = earthYaw(SHOT[SHOTN].t0 + tt);
  // camera 900 km up off the Baja/San Diego coast, looking NNW along the coast toward the limb (ocean left, land right)
  const pos = ll(qn('clon', lerp(-118.5, -119.0, u)), qn('clat', lerp(30.4, 31.2, u)), 6371 + qn('alt', lerp(900, 860, u)));
  const tgt = ll(qn('tlon', lerp(-122.5, -122.8, u)), qn('tlat', lerp(37.5, 38.0, u)), 6371);
  const mm = qn('mm', lerp(40, 44, u));
  applyCam(S.camera, { pos, look: tgt, mm, roll: 0 });
  S.camera.up.copy(pos).normalize(); S.camera.lookAt(tgt); S.camera.rotateZ(qn('roll', 0) * D2R);
  SP.update(S, t);
  const cs = cloudShiftAt(e); SP.EU.cloudShift.value = cs; BAND.update(e, cs);
});
