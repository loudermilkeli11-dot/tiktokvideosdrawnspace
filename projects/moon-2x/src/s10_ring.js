// s10_ring (film 43-48, storyT 40-45): "A RING OF MOON ROCK | WRAPS [EARTH]". 24 mm from the hill above the town,
// slow tilt up: a banded arch of debris rises from the sea horizon and climbs over the sky, the last Moon chunks drift
// apart beside it (rigid Roche limit at film 43.4), streaks keep falling, the flooded town below keeps a few lights.
import { createStudio, THREE } from '@engine/engine.js';
import { createCrowd, createBirds } from '@engine/crowd.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { sunForPhase } from '@engine/moon.js';
import { createBreakup } from '@engine/breakup.js';
import { createMeteors, meteorShower, createImpacts, createRingArc } from '@engine/debris.js';
import { clamp, ease, rng } from '@engine/util.js';
import { scatter } from '@engine/crowd.js';
import { bayWorld, D2R, dirThroughScreen, SHOT } from './kit.js';
import { angRadius } from './story.js';

const S = createStudio({ samples: 8, shadows: false, post: { exposure: 1.1, bloom: 0.2, bloomThreshold: 1.3, bloomRadius: 0.7, vignette: 0.45, grain: 0.03, sat: 1.08, contrast: 1.06 } });
const { scene, camera } = S;
const W = bayWorld(S, { pierYaw: 3 * D2R, pierLights: 0, sky: { beltI: 0, stars: 0.5 }, ocean: { amp: 1.6, level: 5.2 } });
const B = createBreakup(S, {});
for (const ch of B.chunks) ch.mesh.material.fragmentShader = ch.mesh.material.fragmentShader.replace('rockA * strata * l * sunI * 0.55', 'rockA * strata * l * sunI * 0.16');
const airCol = new THREE.Color(0.02, 0.035, 0.07);
const fwd = new THREE.Vector3(0, 0, -1);
// camera: high on the hill inland, looking out over the flooded town to the sea; slow eased tilt up
const EYE = new THREE.Vector3(-100, W.bay.ground(-100, 240) + 34, 240);
const camRig = (tt) => { const k = ease.inOutSine(clamp((tt + 0.3) / 5.3)); const pitch = -7 + 23 * k, yaw = 4 * D2R * (1 - k);
  const d = new THREE.Vector3(Math.sin(-yaw), Math.tan(pitch * D2R), -Math.cos(yaw)).normalize();
  const pos = EYE.clone().add(new THREE.Vector3(0, 1.2 * k, -2 * k)); return { pos, look: pos.clone().addScaledVector(d, 1000), mm: 24, roll: 0 }; };
const ref = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 2e5); applyCam(ref, camRig(0));
const md0 = dirThroughScreen(ref, 430, 230);                 // the chunks hang to the right, inside the arch's sweep
const sun = sunForPhase(md0.clone().negate(), 48, undefined, 160);
// the ring: rises from the sea horizon left of centre, leans right as it climbs over the top of the frame
const face = new THREE.Vector3(-Math.sin(-20 * D2R), 0, -Math.cos(20 * D2R)).normalize();
const ring = createRingArc(S, { face, lat: 13, r0: 1.32, r1: 2.05, dist: 40000, rocks: 6000, I: 0.85, spin: 0.003, rockI: 4.0 });
// streaks keep falling (same consistent direction family as s09), two late impacts far out at sea
const DIR = dirThroughScreen(ref, -200, 760); DIR.y = Math.min(DIR.y, -0.25); DIR.normalize();
const eye0 = ref.position.clone();
const list = meteorShower({ eye: eye0, look: dirThroughScreen(ref, 270, 300), dir: DIR, t0: -1.2, t1: 5.6, rate: 13, d0: 3000, d1: 13000, fanX: 26, fanY: 30, biasY: 10, speed: 19000, l0: 0.4, l1: 1.1, w: 34, I: 1.5, seed: 10, minElev: 2 });
const imps = [{ t: 1.0, x: 120, d: 12000, r: 700 }, { t: 3.1, x: 400, d: 13500, r: 800 }].map((m) => { const dd = dirThroughScreen(ref, m.x, 500); dd.y = 0; dd.normalize(); const p = eye0.clone().addScaledVector(dd, m.d); p.y = 0; return { p, t: m.t, r: m.r, dur: 2.2, I: 0.8 }; });
const M = createMeteors(S, list), G = createImpacts(S, imps, { domeI: 5, glowI: 0.5 });
// a few people on the hill road below the camera, looking up
const ppl = scatter(18, { x0: -150, x1: -40, z0: 150, z1: 200 }, (x, z) => W.bay.ground(x, z), [-60, -2000], 4);
const crowd = createCrowd(S, ppl, { poses: ['point', 'handsHead', 'phoneUp', 'filming', 'shade', 'stand'], rimI: 1.2 });
const birds = createBirds(S, 30, { flap: 11 });
const fire = new THREE.DirectionalLight(0xff7a30, 0); scene.add(fire, fire.target);

const STORY0 = SHOT.s10_ring - 3;                             // 40
S.run((t) => {
  const tt = t - 4, storyT = STORY0 + tt, u = clamp(tt / 5);
  const rig = camRig(tt); applyCam(ref, rig);
  const roche = kick(tt, 0.4, 1.4);                            // rigid Roche limit (film 43.4): the chunks flare
  applyCam(camera, rig, shake(t, 0.12 + 0.25 * roche, 0.9, 7));
  const ang = angRadius(storyT), md = md0;
  B.update(t, { centre: camera.position.clone().addScaledVector(md, 15000), radius: 15000 * Math.sin(ang), md, sunDir: sun, crack: 1,
    sep: 0.9 + 0.6 * u, stretch: 0.5 + 0.3 * u, tail: 0.8 + 0.4 * u, airCol, hot: 0.45 + 0.9 * roche });
  ring.update(tt, camera); M.update(tt); const glow = G.update(tt);
  W.update(S, t, { storyT, moonDir: md, moonVisible: false, level: 5.2 + 0.3 * u, amp: 1.6, flicker: 0.4, power: 0.32, wet: 1, grade: { skyMoonWash: 0.06, stars: 0.4, moonLightI: 1.2, winI: 0.7 } });
  const sky = W.sky.U; sky.lpCol.value.setRGB(1.0, 0.42, 0.14); sky.lpDir.value.copy(fwd); sky.lp.value = 1.1 + 2.0 * glow;
  fire.position.copy(camera.position).add(new THREE.Vector3(0, 80, -100)); fire.target.position.copy(camera.position); fire.intensity = 0.05 + 0.5 * glow;
  crowd.material.U.rimDir.value.copy(md); crowd.update(t, { agitation: 0.7 });
  birds.update(t, (x) => EYE.clone().add(new THREE.Vector3(-140 + x * 30, -12 + x * 1.5, -260 - x * 6)), 10, 1.3);
});
