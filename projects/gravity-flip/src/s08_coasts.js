// s08_coasts (film 20.0–24.0; the 1-minute flip, τ 204.75 -> 208.75 from story.js). Earth from orbit over the maritime
// continent (Indonesia, the Philippines, Indochina, north Australia). The oceans that fell up 35 km come back down at
// ~3,000 km/h and land together at landsAt(60) = 205.76 s (tt 1.01). At that instant every coastline in view erupts in
// white surf at once: a bright foam line tracing the continents, flaring, then spreading out to sea (the shock reaching
// the surface first where the water is shallow) and pushing inland. The coast is found from a distance field built from
// the land/sea mask (space.js coastSDF); the surf is space.js's default-off `surf` uniform.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { applyCam, shake, kick, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp } from '@engine/util.js';
import { tauAt, landsAt } from './story.js';

const Q = new URLSearchParams(location.search);
const D2R = Math.PI / 180;
const S = createStudio({ samples: 2, near: 50, far: 3e6,
  post: { exposure: 1.0, bloom: 0.22, bloomThreshold: 1.1, bloomRadius: 0.55, vignette: 0.4, grain: 0.025, ca: 0.0006, sat: 1.1, contrast: 1.05 } });
const { camera } = S;
const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
const C = dirLL(+(Q.get('lon') ?? 116), +(Q.get('lat') ?? -6));
const SUN = dirLL(+(Q.get('slon') ?? 96), +(Q.get('slat') ?? 6));
const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: 0.3, sunI: 1.5, coast: true, coastW: 4096, sunGlare: 0 });
SP.EU.surf.value = 1; SP.EU.cloudsI.value = 0.55;
const LAND = landsAt(60);
function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
const DUR = 4.0;
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s08_coasts', tt), s = tau - LAND;     // story seconds since the oceans landed
  SP.EU.surfT.value = s;
  const u = ease.inOutSine(clamp(tt / DUR)), mm = 30;
  const pos = C.clone().multiplyScalar(lerp(+(Q.get('d0') ?? 9000), +(Q.get('d1') ?? 8300), u));
  // the landing shakes the camera a little (a jolt, not a flash)
  applyCam(camera, { pos, look: aimFor(pos, +(Q.get('sx') ?? 270), +(Q.get('sy') ?? 960), mm), mm, roll: lerp(8, 6, u) },
    shake(t, 0.03 + 0.25 * kick(s, 0, 1.4), 1.3, 4));
  SP.update(S, t);
});
