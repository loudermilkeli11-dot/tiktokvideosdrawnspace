// s09_earth (film 50.0-56.0, 180 fr). 50.0-51.5: the crane up out of s08 (same set, groupC_mole.js): rising off the promenade,
// widening from the seller to the town and the empty sky where the mountain stood, in the settling gale. HARD CUT at 51.5
// (T_ORBIT, on the score's hit) to orbit: 70 mm on the whole sunlit Earth (space.js shader, never a close crop), the Earth's
// centre at design (300, 300) clear of the counter block and the caption band, a slow pull-back. 52.0-55.0 the Earth squeeze
// (groupC_earth.js): the crust breaks into plates that fall inward, the oceans tear into spray streaks, the clouds are pulled in
// last, a white-gold point remains (s10 opens on it at the same screen spot). Two worlds in one page: the town (metres) and
// space (km) both sit at the origin; exactly one is visible per FRAME (chosen by frame index, so motion-blur sub-samples never
// mix them). Page t = shot time + 4.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { createSpace } from '@engine/space.js';
import { sstep, lerp, ease, clamp } from '@engine/util.js';
import { POST_DAY, POST_ORBIT, SAMPLES, dirLL, aimFor, D2R, QUAY_Y } from './kit.js';
import { SHOT, T_ORBIT, SQZ } from './story.js';
import { moleWorld, moleCam, MCAM, C0 } from './groupC_mole.js';
import { createEarthSqueeze, radiusAt, RE } from './groupC_earth.js';

const SH = SHOT.s09_earth, F_CUT = Math.round((T_ORBIT - SH.t0) * 30);          // frame 45
const S = createStudio({ samples: SAMPLES.s09_earth, shadows: true, near: 0.1, far: 2e4, post: { ...POST_DAY } });
const M = moleWorld(S);
const town = [...S.scene.children], townFog = S.scene.fog;
// ---- orbit: the camera over the Mediterranean (our town's sea), the Sun up and to the right so the terminator falls lower-left
const CAMDIR = dirLL(14, 30).normalize();
const toE = CAMDIR.clone().negate(), RIGHT = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), UP = new THREE.Vector3().crossVectors(RIGHT, toE);
export const SUN_PHASE = 46;                                                   // deg between the camera and the Sun, seen from Earth
const SUNDIR = CAMDIR.clone().multiplyScalar(Math.cos(SUN_PHASE * D2R)).add(RIGHT.clone().multiplyScalar(0.72).add(UP.clone().multiplyScalar(0.7)).normalize().multiplyScalar(Math.sin(SUN_PHASE * D2R))).normalize();
const SP = createSpace(S, { sunDir: SUNDIR.toArray(), ring: false, stars: 0.32, sunI: 1.65, cityI: 1.3, sunGlare: 0, seg: [64, 32] });
const EQ = createEarthSqueeze(S, SP);
const space = S.scene.children.filter((c) => !town.includes(c));
const MM = 70, EX = 300, EY = 300;
S.run((t) => {
  const tt = Math.max(t - 4, 0), film = SH.t0 + tt, orbit = Math.round(tt * 30) >= F_CUT;
  town.forEach((o) => { o.visible = !orbit; }); space.forEach((o) => { o.visible = orbit; }); SP.earth.visible = false;   // the plates draw the planet
  if (!orbit) {
    S.scene.fog = townFog; S.camera.near = 0.1; S.camera.far = 2e4; Object.assign(S.post.p, POST_DAY);
    // the crane: rise 0 -> 70 m and pull back, the lens widens 150 -> 32 mm, the aim lifts from the seller to the empty sky
    const u = clamp(tt / 1.5), e = u * u * (1.6 - 0.6 * u), c0 = moleCam(SH.t0);
    const pos = c0.pos.clone().add(new THREE.Vector3(0, 70 * e, 0)).addScaledVector(new THREE.Vector3(Math.sin(MCAM.yaw * D2R), 0, -Math.cos(MCAM.yaw * D2R)), -25 * e);
    const skyAim = pos.clone().add(new THREE.Vector3(C0.x - pos.x, 0, C0.z - pos.z).normalize().add(new THREE.Vector3(0, Math.tan(16 * D2R), 0)));
    const d0 = c0.look.clone().sub(c0.pos).normalize(), d1 = skyAim.sub(pos).normalize();
    applyCam(S.camera, { pos, look: pos.clone().add(d0.lerp(d1, ease.inOutCubic(u)).normalize()), mm: lerp(150, 32, ease.outCubic(u)), roll: 0 }, shake(t, 0.03, 1.4, 9));
    M.update(film, S.camera);
  } else {
    S.scene.fog = null; S.camera.near = 50; S.camera.far = 3e6; Object.assign(S.post.p, POST_ORBIT);
    // FIX PASS (review item 8): the lens HOLDS the cracking planet at ~70% of the frame width: it eases in with the shrinking
    // crust (the plates' mean radius, lagged 0.5 s) down to 45% of the Earth's radius, then stops and pulls back as the rest
    // collapses into the point (a smooth max, so there is no jolt at the hand-over)
    const u = ease.inOutSine(clamp((film - T_ORBIT) / (SH.t0 + SH.dur - T_ORBIT)));
    const rf = radiusAt(film, 0.5) / RE, sm = 0.45 + 0.06 * Math.log(1 + Math.exp((rf - 0.45) / 0.06));     // softplus max(rf, 0.45)
    const back = 1 + 0.35 * sstep(54.4, 56.0, film);
    const pos = CAMDIR.clone().multiplyScalar(lerp(58000, 61000, u) * (0.78 / 0.70) * sm * back);
    const amp = 0.012 + 0.05 * sstep(SQZ.earth.T, SQZ.earth.T + 1.0, film) * (1 - sstep(54.6, 55.6, film));
    applyCam(S.camera, { pos, look: aimFor(pos, EX, EY, MM), mm: MM, roll: 0 }, shake(t, amp, 1.1, 4));
    SP.update(S, t); EQ.update(film, S.camera);
  }
});
