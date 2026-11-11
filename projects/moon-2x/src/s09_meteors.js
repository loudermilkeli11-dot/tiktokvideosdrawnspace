// s09_meteors (film 38-43, storyT 35-40): "AND THE SKY | STARTS [FALLING]". 50 mm tracking behind the hero sprinting
// out along the pier; the broken Moon sinks into the sea horizon ahead, fragments streak down in one consistent direction
// and four impacts bloom orange on the far horizon (score impacts at film 38.0, 39.2, 40.1, 41.5). The crowd flees past.
import { createStudio, THREE } from '@engine/engine.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { figureGeometry, figureMaterial } from '@engine/figure.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { sunForPhase } from '@engine/moon.js';
import { createBreakup } from '@engine/breakup.js';
import { createMeteors, meteorShower, createImpacts } from '@engine/debris.js';
import { clamp, rng, fbm } from '@engine/util.js';
import { bayWorld, D2R, dirThroughScreen, SHOT } from './kit.js';
import { angRadius } from './story.js';

const S = createStudio({ samples: 12, shadows: false, post: { exposure: 1.12, bloom: 0.2, bloomThreshold: 1.3, bloomRadius: 0.65, vignette: 0.5, grain: 0.03, sat: 1.1, contrast: 1.06 } });
const { scene, camera } = S;
const PIER_YAW = 3 * D2R;
const W = bayWorld(S, { pierYaw: PIER_YAW, pierLights: 2, sky: { beltI: 0, stars: 0.5 }, ocean: { amp: 1.4, level: 1.8 } });
const P = W.bay.pier, DECK = P.deckY;
const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
const B = createBreakup(S, {});
const airCol = new THREE.Color(0.02, 0.035, 0.07);
// shot-local tweak: darker, rockier chunk interiors (the lit grey bowls read as hollow shells at 50 mm)
for (const ch of B.chunks) ch.mesh.material.fragmentShader = ch.mesh.material.fragmentShader.replace('rockA * strata * l * sunI * 0.55', 'rockA * strata * l * sunI * 0.16');

// ---- run cycle: 8 poses (legs [pitch, abduction, knee], hands swing opposite), cached up front
const NP = 8;
function runPose(ph) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const leg = (s, c) => [0.05 + 0.62 * s, 0.05, 0.28 + 1.2 * Math.pow(Math.max(0, c), 1.3)];
  const arm = (a, side) => ({ t: [side * 0.18, 1.03 + 0.2 * Math.max(0, a), -0.05 - 0.3 * a], pole: [side * 0.35, -0.5, 0.8] });
  return { legR: leg(s, c), legL: leg(-s, -c), R: arm(-s, 1), L: arm(s, -1), lean: -0.2, head: [0, 0.06], hip: 0 };
}
const RUN = Array.from({ length: NP }, (_, k) => runPose((k / NP) * Math.PI * 2));
const hero = createHero(S, { pose: RUN[0], rimI: 1.6, phoneI: 0 }); hero.phone.visible = false;
RUN.forEach((p) => hero.setPose(p));                        // precompute (cached)
const poseAt = (ph) => RUN[((Math.floor((ph / (Math.PI * 2)) * NP) % NP) + NP) % NP];

// ---- fleeing crowd: 2 body types x 8 run poses (shared geometry), per-runner colours
const looks = [{ hair: 'short', coat: 0.3, height: 1.76 }, { hair: 'long', fem: 0.9, height: 1.64, bag: 'tote' }, { hair: 'cap', puffer: true, height: 1.72 }];
const RG = looks.map((lk) => RUN.map((p) => figureGeometry({ ...lk, pose: p }, 0.02)));
const R = rng(38); const runners = [];
const tops = [0x3d4f66, 0x5c3d52, 0x2c3a2e, 0x6a5038, 0x3a3f4a, 0x4b2a2a, 0x55504a, 0x7a6a55];
for (let i = 0; i < 14; i++) {
  const mat = figureMaterial({ top: tops[i % tops.length], bot: 0x1d1f24, hair: [0x1c140e, 0x4a3a2a, 0x0f0b08][i % 3], rimI: 1.3 });
  const mesh = new THREE.Mesh(RG[0][0], mat); scene.add(mesh);
  runners.push({ mesh, mat, look: i % looks.length, lx: (i % 2 ? 1 : -1) * (0.5 + R() * 1.6), z0: -100 - R() * 52, v: 3.6 + R() * 1.6, ph: R() * 6.28, cad: 1.3 + R() * 0.3 });
}
// a few who stay at the far rail, filming (static crowd), plus the flock fleeing the sky
const stay = []; for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1; const w = P.toWorld(side * (1.7 + R() * 0.5), DECK, -142 - R() * 9); stay.push({ x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + (R() - 0.5) * 0.6 }); }
const crowd = createCrowd(S, stay, { poses: ['phoneUp', 'filming', 'point', 'handsHead', 'phoneUp', 'shade'], rimI: 1.3 });
const birds = createBirds(S, 26, { flap: 11 });

// ---- camera rig (un-shaken reference camera fixes the sky directions in the world)
const ref = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 2e5);
const HERO_V = 5.4;                                          // m/s down the pier
const heroZ = (tt) => -36 - HERO_V * tt;                     // pier-local z of the hero
const camRig = (tt) => {
  const dz = 31.5 - 0.5 * tt;                                // the camera gains a little on the hero
  const pos = P.toWorld(0.35, DECK + 0.95 + 0.03 * Math.sin(tt * 2 * Math.PI * 2.8), heroZ(tt) + dz);
  const look = pos.clone().addScaledVector(fwd, 1000); look.y += Math.tan(5.2 * D2R) * 1000;
  return { pos, look, mm: 50, roll: -0.6 };
};
applyCam(ref, camRig(0));
const MOON = [300, 612];                                      // design px of the (broken) disc centre at the cut
const md0 = dirThroughScreen(ref, MOON[0], MOON[1]);
const sun = sunForPhase(md0.clone().negate(), 48, undefined, 160);
const eye0 = ref.position.clone();

// ---- meteors: one consistent direction, converging on a point just below the horizon left of the Moon
const vp = dirThroughScreen(ref, -260, 720); const DIR = vp.clone(); DIR.y = Math.min(DIR.y, -0.2); DIR.normalize();
const look0 = dirThroughScreen(ref, 270, 330);
let list = meteorShower({ eye: eye0, look: look0, dir: DIR, t0: -1.2, t1: 5.4, rate: 26, d0: 2500, d1: 12500, fanX: 19, fanY: 16, biasY: 2, speed: 21000, l0: 0.35, l1: 0.95, w: 40, I: 1.8, seed: 9, minElev: 2 });
// bolides: the four big ones that end in the impacts
const IMP = [{ t: 0.0, x: 420, d: 10500, r: 700 }, { t: 1.2, x: 70, d: 12500, r: 820 }, { t: 2.1, x: 360, d: 9000, r: 600 }, { t: 3.5, x: 150, d: 11500, r: 900 }];
const impacts = IMP.map((m) => { const dd = dirThroughScreen(ref, m.x, 600); dd.y = 0; dd.normalize(); const p = eye0.clone().addScaledVector(dd, m.d); p.y = 0; return { p, t: m.t, r: m.r, dur: 2.4, I: 1 }; });
impacts.forEach((im, k) => { const life = 0.95, sp = 26000 * (IMP[k].d / 15000) * 0.75; const v = DIR.clone().multiplyScalar(sp);
  list.push({ c: im.p.clone().addScaledVector(v, -life / 2), v, t0: im.t - life, life, tail: 0.42, w: 60, I: 2.4, heat: 1, end: 1 }); });
const M = createMeteors(S, list, { gain: 1.0 });
const G = createImpacts(S, impacts, { domeI: 5.5, glowI: 0.55 });
const fire = new THREE.DirectionalLight(0xff7a30, 0); scene.add(fire, fire.target);

const STORY0 = SHOT.s09_meteors - 3;                          // 35
S.run((t) => {
  const tt = t - 4, storyT = STORY0 + tt, u = clamp(tt / 5);
  const rig = camRig(tt); applyCam(ref, rig);
  const hit = kick(tt, 0.0, 0.9) + kick(tt, 1.2 + 0.35, 1.0) * 0.8 + kick(tt, 2.1 + 0.3, 0.9) * 0.7 + kick(tt, 3.5 + 0.45, 1.2);
  const sh = shake(t, 0.35 + 0.6 * hit, 2.2, 5);
  applyCam(camera, rig, sh);
  // the broken Moon: direction fixed in the world, size from the story clock, separation at a constant rate
  const ang = angRadius(storyT), md = md0;
  const sep = 0.35 + 0.55 * u, stretch = 0.15 + 0.35 * u, tail = 0.35 + 0.45 * u;
  const centre = camera.position.clone().addScaledVector(md, 15000);
  B.update(t, { centre, radius: 15000 * Math.sin(ang), md, sunDir: sun, crack: 1, sep, stretch, tail, airCol, hot: 0.35 + 0.3 * u });
  const glow = G.update(tt); M.update(tt);
  W.update(S, t, { storyT, moonDir: md, moonVisible: false, level: 1.8 + 0.4 * u, amp: 1.4 + 0.3 * u, flicker: 0.25, grade: { skyMoonWash: 0.1, stars: 0.35, moonLightI: 1.7 } });
  // orange light from the impacts and the entry streaks takes over the frame
  const sky = W.sky.U; sky.lpCol.value.setRGB(1.0, 0.45, 0.16); sky.lpDir.value.copy(fwd); sky.lp.value = 0.9 + 2.2 * glow;
  fire.position.copy(camera.position).addScaledVector(fwd, 100).add(new THREE.Vector3(0, 60, 0)); fire.target.position.copy(camera.position);
  fire.intensity = 0.04 + 0.6 * glow;
  W.bay.hemi.color.setRGB(0.16 + 0.25 * glow, 0.2 + 0.08 * glow, 0.32);
  // hero: sprinting away from us, seen from behind
  const hz = heroZ(tt), hph = tt * 2 * Math.PI * 1.45;
  const hw = P.toWorld(0.05 + 0.08 * Math.sin(hph * 0.5), DECK + 0.03 * Math.cos(2 * hph), hz);
  hero.root.position.copy(hw); hero.root.rotation.set(0, PIER_YAW + 0.04 * Math.sin(hph), 0.03 * Math.sin(hph)); hero.setPose(poseAt(hph));
  // the crowd scatters back toward the shore (toward camera), passing the hero on both sides
  for (const r of runners) { const z = r.z0 + r.v * tt; const ph = tt * 2 * Math.PI * r.cad + r.ph;
    const w = P.toWorld(r.lx, DECK + 0.03 * Math.cos(2 * ph), z); r.mesh.position.copy(w); r.mesh.rotation.set(0, PIER_YAW + Math.PI + 0.05 * Math.sin(ph), 0);
    r.mesh.geometry = RG[r.look][((Math.floor((ph / (Math.PI * 2)) * NP) % NP) + NP) % NP]; r.mat.U.rimDir.value.copy(md); }
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  hero.material.U.rimCol.value.setRGB(0.8 + 0.6 * glow, 0.75 + 0.2 * glow, 0.9);
  crowd.update(t, { agitation: 0.9 });
  birds.update(t, (x) => eye0.clone().addScaledVector(fwd, 240 - x * 4).addScaledVector(right, 70 - x * 22).setY(DECK + 26 + x * 2.5), 9, 1.4);
});
