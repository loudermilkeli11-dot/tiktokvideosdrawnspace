// gravity-flip look test: the city plaza at midday. ?tau=story seconds since the flip (<0 before), ?cam=f1|up|wide
import { createStudio, THREE } from '@engine/engine.js';
import { createSky } from '@engine/sky.js';
import { createCity, liftH, PERIOD } from '@engine/city.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { PALETTE } from '@engine/figure.js';
import { applyCam, shake } from '@engine/camera.js';
import { rng } from '@engine/util.js';
const D2R = Math.PI / 180, Q = new URLSearchParams(location.search);
const TAU0 = +(Q.get('tau') ?? -2), CAMK = Q.get('cam') ?? 'f1';
PALETTE.top.splice(0, PALETTE.top.length, 0xd94a3d, 0xf0b23a, 0x3a78d0, 0x2f9e68, 0xf2eee6, 0xe0709f, 0x7a5fd0, 0x26a0b3, 0xff8a3d, 0xfafafa, 0x1f2a44, 0x8a2b3a);
PALETTE.bot.splice(0, PALETTE.bot.length, 0x2d3d5c, 0xd9cfb6, 0x3e3e3e, 0x5b7fa8, 0xebe6da, 0x6d5539, 0x1c1c22);
PALETTE.hair.splice(0, PALETTE.hair.length, 0x2a1d14, 0x4a3524, 0x6e5238, 0xb08a5a, 0x1a1410, 0x8a6a48, 0xd8c08a);
const S = createStudio({ samples: 2, shadows: true, post: { exposure: 1.0, bloom: 0.06, bloomThreshold: 3.0, bloomRadius: 0.5, vignette: 0.2, grain: 0.012, ca: 0.0008, sat: 1.1, contrast: 1.05 } });
const { scene, camera } = S;
S.hdri('hdri_day_1k.hdr', 0.7);
const SUN = new THREE.Vector3(0.55, 0.72, 0.42).normalize();
const sky = createSky(S, { lp: 0, stars: 0, beltI: 0 }); scene.add(sky); sky.U.dayZen.value.set(0x2f6fd0); sky.U.dayHor.value.set(0xa9cff0);
const sun = new THREE.DirectionalLight(0xfff1df, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 900 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xb8d4f0, 0x8a8070, 1.0); scene.add(hemi);
const C = createCity(S, { blocks: 3, seed: 11 });
// the crowd: a busy lunchtime plaza around the fountain, plus pavements
const R = rng(31), people = [];
for (let i = 0; i < 400 && people.length < 150; i++) { const a = R() * Math.PI * 2, r = 8 + Math.pow(R(), 0.6) * 38; const x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (Math.abs(x) > PERIOD / 2 - 13 || Math.abs(z) > PERIOD / 2 - 13) continue; people.push({ x, z, y: 0, yaw: R() * 6.28 }); }
const crowd = createCrowd(S, people, { poses: ['stand', 'pocket', 'phoneUp', 'arms', 'shade', 'stand', 'point', 'filming', 'handsHead', 'stand'], rimI: 0.2, seed: 9 });
const hero = createHero(S, { pose: Q.get('hp') ?? 'stand', rimI: 0.2 });
const heroP = new THREE.Vector3(-11, 0, 27);
const birds = createBirds(S, 24, { flap: 10, seed: 5 });
// motion for loose things: everyone gets a deterministic tumble axis; cars drive until the flip, then keep their momentum
C.cars.forEach((c, i) => { const r = rng(100 + i); c.rx = (r() - 0.5) * 1.4; c.rz = (r() - 0.5) * 1.4; c.ry = (r() - 0.5) * 1.0; c.x0 = c.x; c.z0 = c.z; });
C.props.forEach((p, i) => { const r = rng(500 + i); p.rx = (r() - 0.5) * 3; p.rz = (r() - 0.5) * 3; p.ry = (r() - 0.5) * 2; });
S.run((t) => {
  const tt = Math.max(t - 4, 0), tau = TAU0 + tt;          // story: seconds since gravity flipped
  const L = liftH(tau), spin = tau > 0 ? Math.min(1, tau / 4) * (1 + 0.15 * tau) : 0;
  // traffic: cars move along their lanes until the flip, then keep that horizontal speed while they rise
  C.cars.forEach((c) => { const s = c.v * (Math.min(tau, 0) + 20) * c.lane.dir + (tau > 0 ? c.v * tau * c.lane.dir : 0);
    if (c.lane.axis === 'x') c.x = c.x0 + s * 0.0 + (s - c.v * 20 * c.lane.dir); else c.z = c.z0 + (s - c.v * 20 * c.lane.dir); });
  C.update(t, { lift: L, tumble: spin, waterLift: L });
  crowd.update(t, { agitation: tau > -1.5 ? 0.6 : 0.2, lift: L, tumble: spin * 1.4 });
  if (CAMK === 'pov') { hero.root.position.set(-9.5, L - 0.6 - 0.25 * Math.max(0, tau), 23.5); hero.root.rotation.set(0.5 + spin * 0.35, -1.2 + spin * 0.2, 0.35 + spin * 0.3); }
  else { hero.root.position.copy(heroP).setY(L); hero.root.rotation.set(spin * 0.6, 0.2 + spin * 0.3, spin * 0.25); }
  birds.update(t, (x) => new THREE.Vector3(-30 + x * 9, 22 + Math.sin(x) * 3 + L * 0.9, -40), 9, 1.0);
  // camera
  let pos, look, mm;
  if (CAMK === 'f1') { pos = new THREE.Vector3(-14, 1.7, 36).add(new THREE.Vector3(0, 0, -0.5 * tt)); look = new THREE.Vector3(6, 7, -50); mm = 24; }
  else if (CAMK === 'pov') {                 // the camera operator falls up too: the crowd floats around us, the plaza drops away below
    pos = new THREE.Vector3(-12, 1.7 + L, 30); const pd = +(Q.get('pd') ?? -38) * D2R;
    const d = new THREE.Vector3(0.18, 0, -1).normalize(); d.y = Math.tan(pd); look = pos.clone().add(d); mm = +(Q.get('mm') ?? 20); }
  else if (CAMK === 'up') { pos = new THREE.Vector3(10, 1.4, 40); look = new THREE.Vector3(0, 10 + L * 1.1, -10); mm = 20; }
  else { pos = new THREE.Vector3(70, 40 + L * 0.6, 110); look = new THREE.Vector3(0, L * 0.9, -20); mm = 24; }
  applyCam(camera, { pos, look, mm, roll: 0 }, shake(t, tau > 0 ? 0.12 : 0.02, 0.8, 2));
  sun.position.copy(SUN).multiplyScalar(400).add(new THREE.Vector3(0, L, 0)); sun.target.position.set(0, L, 0);
  sky.U.sunDir.value.copy(SUN); sky.update(S, t);
});
