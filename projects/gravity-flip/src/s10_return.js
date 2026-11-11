// s10_return (film 30.5–35.0; T = 600 s; τ 3240 -> 3285 at 10x, from story.js). It all comes back at 7 km/s: Earth's
// night side from orbit, a thin sunlit crescent on the limb. Everything that fell up (the oceans, the clouds, the air,
// the planes) falls back as one shell: heightAt(τ) goes 308 km -> 0 and lands at τ 3284.6 (the shot's last frames).
// Thousands of returning objects light up as orange entry streaks all over the dark hemisphere, more and brighter as the
// shell drops into thicker air; their glow washes the night side orange. No white flashes.
import { createStudio, THREE } from '@engine/engine.js';
import { createSpace, RE } from '@engine/space.js';
import { createShell } from '@engine/shell.js';
import { createStorm } from '@engine/storm.js';
import { applyCam, shake, lensFov } from '@engine/camera.js';
import { ease, clamp, lerp, sstep, rng } from '@engine/util.js';
import { tauAt, heightAt } from './story.js';

const Q = new URLSearchParams(location.search);
const D2R = Math.PI / 180;
const S = createStudio({ samples: 2, near: 50, far: 3e6,
  post: { exposure: 1.05, bloom: 0.3, bloomThreshold: 0.9, bloomRadius: 0.65, vignette: 0.42, grain: 0.03, ca: 0.0008, sat: 1.1, contrast: 1.05 } });
const { camera } = S;
const dirLL = (lon, lat) => { const ph = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(th), Math.sin(th), Math.sin(ph) * Math.cos(th)); };
const C = dirLL(+(Q.get('lon') ?? 20), +(Q.get('lat') ?? 28));                 // the night hemisphere: Europe, Africa, the Middle East
const EAST = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), C).normalize();
const SUN = C.clone().multiplyScalar(-Math.cos(38 * D2R)).addScaledVector(EAST, Math.sin(38 * D2R)).normalize();   // 142 deg away: a thin crescent
const SP = createSpace(S, { sunDir: SUN.toArray(), ring: false, stars: 0.4, sunI: 1.6, cityI: 1.1, sunGlare: 0.5 });
SP.EU.seabed.value = 1; SP.EU.cloudsI.value = 0; SP.EU.atmI.value = 0.25;
const SH = createShell(S, SP, { cloudH: 4, airH: 70, waterI: 0.55, cloudI: 0.7, airI: 1 });
// ---- the storm: returning objects all over the facing hemisphere (deterministic) ----
const R = rng(1010), list = [], N = +(Q.get('n') ?? 9000);
const T1 = new THREE.Vector3().crossVectors(C, new THREE.Vector3(0.3, 0.9, 0.2)).normalize(), T2 = new THREE.Vector3().crossVectors(C, T1);
while (list.length < N) {
  const z = 1 - R() * 1.15, r = Math.sqrt(Math.max(0, 1 - z * z)), a = R() * Math.PI * 2;     // a cap around C (a bit past the limb)
  const n = C.clone().multiplyScalar(z).addScaledVector(T1, r * Math.cos(a)).addScaledVector(T2, r * Math.sin(a)).normalize();
  if (n.dot(SUN) > 0.25 && R() < 0.8) continue;                                                // fewer on the day side
  const u = R(), big = R();
  list.push({ n, a0: -3 + 15 * R(), zi: 30 + 290 * u * u, Lmax: 70 + 200 * R(), w: 1.2 + 3.5 * big * big, I: 0.45 + 1.3 * big * big, heat: R() });
}
const ST = createStorm(S, list, { gain: +(Q.get('gain') ?? 1.0), minPx: 1.25, zFull: 60 });
function aimFor(pos, sx, sy, mm) {
  const toE = pos.clone().negate().normalize(); const vf = lensFov(mm) * D2R;
  const ay = ((sy - 480) / 960) * vf, ax = ((sx - 270) / 540) * vf * (540 / 960);
  const right = new THREE.Vector3().crossVectors(toE, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, toE);
  const fwd = toE.clone().applyAxisAngle(right, ay).applyAxisAngle(up, ax); return pos.clone().add(fwd.multiplyScalar(1e5));
}
const DUR = 4.5;
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = tauAt('s10_return', tt), h = heightAt(tau, 600) / 1000;
  const k = 1 - h / 308;                                                     // 0 -> 1 as the shell comes down
  SH.update(S, t, { h }); SH.U.time.value = tau * 0.02;
  ST.update(S, h);
  // the storm's light on the night side and in the falling air
  SP.EU.glowI.value = 0.015 + 0.22 * k * k; SP.EU.cityI.value = 1.1 * (1 - 0.35 * k);
  SH.U.airI.value = 0.6 + 0.6 * k;
  // camera: a slow push toward the limb, building shake as the storm grows
  const u = ease.inOutSine(clamp(tt / DUR)), mm = 35;
  const pos = C.clone().applyAxisAngle(T1, lerp(0.0, 0.04, u)).multiplyScalar(lerp(11800, 10300, u));
  applyCam(camera, { pos, look: aimFor(pos, +(Q.get('sx') ?? 300), +(Q.get('sy') ?? 820), mm), mm, roll: lerp(-10, -7, u) }, shake(t, 0.03 + 0.1 * k * k, 0.9, 5));
  SP.update(S, t);
});
