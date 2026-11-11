// s11_iss (film 48-53, storyT 45-50): "NEARING THE | [SPACE STATION'S] ORBIT". s10's sky rig from the beach, 35 mm:
// rivers of rubble skim the upper atmosphere overhead, each glowing orange along its path, the ring arc behind them,
// the crowd small on the sand below. Ends on a crane-up (rise + tilt up) into s12.
import { createStudio, THREE } from '@engine/engine.js';
import { createCrowd, createBirds, scatter } from '@engine/crowd.js';
import { applyCam, shake } from '@engine/camera.js';
import { sunForPhase } from '@engine/moon.js';
import { createBreakup } from '@engine/breakup.js';
import { createMeteors, meteorShower, createRingArc, createStreams, trimBreakup, hideFromReflection } from '@engine/debris.js';
import { clamp, ease, lerp } from '@engine/util.js';
import { bayWorld, D2R, dirThroughScreen, SHOT } from './kit.js';
import { angRadius } from './story.js';

const S = createStudio({ samples: 12, shadows: false, post: { exposure: 1.1, bloom: 0.22, bloomThreshold: 1.3, bloomRadius: 0.7, vignette: 0.45, grain: 0.03, sat: 1.08, contrast: 1.06 } });
const { scene, camera } = S;
const W = bayWorld(S, { pierYaw: 3 * D2R, pierLights: 0, sky: { beltI: 0, stars: 0.5 }, ocean: { amp: 1.3, level: 0.7 } });
const B = createBreakup(S, {});
trimBreakup(B); hideFromReflection(W.ocean.refl, [B.group]);
for (const ch of B.chunks) ch.mesh.material.fragmentShader = ch.mesh.material.fragmentShader.replace('float strata = 0.75 + 0.25*sin(', 'float strata = 0.93 + 0.07*sin(');   // softer interior rings overhead    // same picture, ~3x cheaper (see debris.js)
for (const ch of B.chunks) ch.mesh.material.fragmentShader = ch.mesh.material.fragmentShader.replace('rockA * strata * l * sunI * 0.55', 'rockA * strata * l * sunI * 0.16');
const airCol = new THREE.Color(0.02, 0.035, 0.07);
const fwd = new THREE.Vector3(0, 0, -1);
const EYE = new THREE.Vector3(8, W.bay.ground(8, 40) + 1.6, 40);   // at the seawall edge (no dark paving in frame)
// camera: steady look out and up, then the crane-up (rise 9 m, tilt to 62 deg) from 3.2 s into s12
const camRig = (tt) => { const c = ease.inCubic(clamp((tt - 3.0) / 2.0)), k = clamp(tt / 5);
  const pitch = lerp(10, 15, k) + 46 * c; const d = new THREE.Vector3(0.05, Math.tan(pitch * D2R), -1).normalize();
  const pos = EYE.clone().add(new THREE.Vector3(0, 9 * c, -1.2 * tt)); return { pos, look: pos.clone().addScaledVector(d, 1000), mm: 35, roll: -1.2 + 1.2 * c }; };
const ref = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 2e5); applyCam(ref, camRig(0));
const elevDir = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), -Math.cos(az * D2R) * Math.cos(el * D2R));
const md0 = elevDir(16, 58);                                   // the last chunks hang high: revealed by the crane-up
const sun = sunForPhase(md0.clone().negate(), 48, undefined, 160);
const face = new THREE.Vector3(-Math.sin(14 * D2R), 0, -Math.cos(14 * D2R)).normalize();
const ring = createRingArc(S, { face, lat: 13, r0: 1.32, r1: 2.05, dist: 40000, rocks: 6000, I: 0.75, spin: 0.003, rockI: 4.0 });
// rubble streams skimming the upper atmosphere, right to left across the view (closed form, wrapping far beyond the horizon)
const e0 = EYE.clone();
const R3 = (x, y, z) => new THREE.Vector3(x, y, z);
const streams = createStreams(S, [
  { o: e0.clone().add(R3(0, 950, -6000)), d: R3(-1, -0.1, 0.12).normalize(), n: 520, speed: 3000, spread: 260, len: 32000, size: [14, 120], glowW: 240, glowI: 0.75, tail: 0.22 },
  { o: e0.clone().add(R3(0, 5200, -4800)), d: R3(-1, -0.12, -0.1).normalize(), n: 480, speed: 3400, spread: 380, len: 32000, size: [16, 150], glowW: 340, glowI: 0.6, tail: 0.2 },
  { o: e0.clone().add(R3(0, 1750, -6600)), d: R3(-1, -0.16, 0.05).normalize(), n: 420, speed: 2600, spread: 220, len: 32000, size: [12, 90], glowW: 190, glowI: 0.8, tail: 0.25 },
], { hot: 0.9, sunI: 1.4, fade: 0, trailGain: 1.0 });
streams.rockU.hotDir.value.set(-1, 0.1, 0).normalize();         // leading faces glow (they travel toward -X)
// streaks keep falling lower down
const DIR = dirThroughScreen(ref, -220, 820); DIR.y = Math.min(DIR.y, -0.25); DIR.normalize();
const M = createMeteors(S, meteorShower({ eye: e0, look: dirThroughScreen(ref, 270, 360), dir: DIR, t0: -1.2, t1: 5.6, rate: 10, d0: 3000, d1: 13000, fanX: 24, fanY: 30, biasY: 8, speed: 19000, l0: 0.4, l1: 1.0, w: 34, I: 1.4, seed: 11, minElev: 2 }));
// the crowd on the sand below, facing the sea, small
const ppl = scatter(46, { x0: -60, x1: 66, z0: 4, z1: 19 }, (x, z) => W.bay.ground(x, z), [10, -1500], 6);
const crowd = createCrowd(S, ppl, { poses: ['point', 'handsHead', 'phoneUp', 'filming', 'shade', 'phoneUp', 'stand', 'arms'], rimI: 1.3 });
const birds = createBirds(S, 24, { flap: 12 });
const fire = new THREE.DirectionalLight(0xff7a30, 0.35); scene.add(fire, fire.target);

const STORY0 = SHOT.s11_iss - 3;                               // 45
S.run((t) => {
  const tt = t - 4, storyT = STORY0 + tt, u = clamp(tt / 5);
  const rig = camRig(tt); applyCam(ref, rig);
  applyCam(camera, rig, shake(t, 0.22 + 0.25 * u, 1.6, 9));
  const ang = angRadius(storyT), md = md0;
  B.update(t, { centre: camera.position.clone().addScaledVector(md, 15000), radius: 15000 * Math.sin(ang), md, sunDir: sun, crack: 1,
    sep: 1.5 + 0.7 * u, stretch: 0.8 + 0.3 * u, tail: 1.2 + 0.4 * u, airCol, hot: 0.6 + 0.3 * u });
  ring.update(tt, camera); streams.update(tt, camera); M.update(tt);
  W.update(S, t, { storyT, moonDir: md, moonVisible: false, level: 0.7, amp: 1.3 + 0.3 * u, flicker: 0.4, power: 0.3, wet: 1, grade: { skyMoonWash: 0.05, stars: 0.35, moonLightI: 1.0, winI: 0.7 } });
  W.ocean.U.moonI.value = 1.0;
  const sky = W.sky.U; sky.lpCol.value.setRGB(1.0, 0.4, 0.13); sky.lpDir.value.copy(fwd); sky.lp.value = 1.6 + 0.6 * u;
  // the streams light the whole frame orange from above
  fire.position.copy(camera.position).add(new THREE.Vector3(60, 200, -120)); fire.target.position.copy(camera.position); fire.intensity = 0.35 + 0.35 * u;
  W.bay.hemi.color.setRGB(0.32, 0.2, 0.18);
  crowd.material.U.rimDir.value.set(0.2, 0.9, -0.4).normalize(); crowd.material.U.rimCol.value.setRGB(1.0, 0.6, 0.35); crowd.update(t, { agitation: 0.85 });
  birds.update(t, (x) => e0.clone().add(new THREE.Vector3(80 - x * 26, 30 + x * 3, -150 - x * 5)), 10, 1.3);
});
