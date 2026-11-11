// s12_rise (film 53–58, storyT 50–55): the camera leaves the ground. From the hero at the pier's end it cranes up at an
// accelerating rate and tilts into a sky of entry streaks and the ring arc; rubble whips past; the sky fades to black.
// 57.0–58.0 is TRUE SILENCE in the mix; a fragment crosses the lens at the very end (foreground wipe) -> space reveal.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createCrowd, createHero } from '@engine/crowd.js';
import { createMeteors, meteorShower, createRingArc, createStreams, rockGeometry } from '@engine/debris.js';
import { clamp, lerp, rng, ease, smoother } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
const S = createStudio({ samples: 12, post: { exposure: 1.05, bloom: 0.22, bloomThreshold: 1.3, vignette: 0.5, grain: 0.03, sat: 1.05 } });
const PIER_YAW = 3 * D2R;
const W = bayWorld(S, { pierYaw: PIER_YAW, pierLights: 3 });
const P = W.bay.pier, DECK = P.deckY;
const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
const hero = createHero(S, { pose: 'point', rimI: 1.4 }); const heroW = P.toWorld(0.0, DECK, -146); hero.root.position.copy(heroW); hero.root.rotation.y = PIER_YAW;
const R = rng(12); const people = [];
for (let i = 0; i < 20; i++) { const side = i % 2 ? 1 : -1; const w = P.toWorld(side * (1 + R() * 1.2), DECK, -120 - R() * 22); people.push({ x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + (R() - 0.5) }); }
const crowd = createCrowd(S, people, { poses: ['point', 'handsHead', 'phoneUp', 'shade'], rimI: 1.2 });
const ring = createRingArc(S, { face: fwd, lat: 24, r0: 1.3, r1: 1.62, I: 0.7 });
const eye = P.toWorld(0, DECK + 60, -110);
const shower = meteorShower({ seed: 4, eye, look: new THREE.Vector3(0, 0.75, 0).addScaledVector(fwd, 0.66).normalize(), dir: new THREE.Vector3(0.25, -0.55, 0).addScaledVector(fwd, 0.8).normalize(),
  t0: -1.5, t1: 10, rate: 18, d0: 3000, d1: 26000, fanX: 40, fanY: 34, speed: 7000, w: 22, I: 1.1 });
const meteors = createMeteors(S, shower, { gain: 1.0 });
// rubble streams the rising camera flies through (positions are fixed in the world; the camera passes them)
const streams = createStreams(S, [
  { o: P.toWorld(0, 700, -400), d: new THREE.Vector3(0.6, -0.15, 0).addScaledVector(fwd, 0.7).normalize(), n: 70, speed: 900, spread: 260, len: 4000, size: [1.5, 9], tail: 0.18 },
  { o: P.toWorld(-80, 1500, -300), d: new THREE.Vector3(-0.7, -0.2, 0).addScaledVector(fwd, 0.6).normalize(), n: 60, speed: 1200, spread: 300, len: 5000, size: [2, 14], tail: 0.2 },
], { seed: 5 });
const wipeRock = new THREE.Mesh(rockGeometry(2, 9), new THREE.MeshStandardMaterial({ color: 0x2a2725, roughness: 0.95 })); wipeRock.frustumCulled = false; S.scene.add(wipeRock);
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = SHOT.s12_rise - 3 + tt;
  const climb = ease.inCubic(clamp(tt / 4.6));                                    // accelerating crane / ascent
  const alt = lerp(DECK + 0.45, 2600, climb);
  const pos = P.toWorld(0.4, 0, -84).setY(alt).addScaledVector(fwd, -climb * 120);
  const pitch = lerp(2.2, 72, smoother(0.4, 3.6, tt));                              // tilt from the hero up into the sky
  const look = pos.clone().addScaledVector(fwd, Math.cos(pitch * D2R) * 100).add(new THREE.Vector3(0, Math.sin(pitch * D2R) * 100, 0));
  applyCam(S.camera, { pos, look, mm: lerp(60, 24, smoother(0, 3, tt)), roll: lerp(0, 9, climb) }, shake(t, 0.25 + 0.6 * climb, 2.2));
  const thin = clamp((alt - 300) / 2300);                                          // leaving the atmosphere: the sky fades to black
  const res = W.update(S, t, { storyT, moonVisible: false, level: 2.5, amp: 1.6, power: 0.05, flicker: 0.5, wet: 1,
    grade: { skyMoonWash: 0.32 * (1 - thin), stars: 0.15 + 0.85 * thin, hemiI: 0.4 * (1 - thin) + 0.05 } });
  W.sky.U.exposure.value = 1 - 0.85 * thin;
  ring.U.I.value = 0.6 + 0.4 * thin; ring.update(t, S.camera);
  meteors.update(t); streams.update(t, S.camera);
  crowd.material.U.rimDir.value.set(0, 0.6, -1).normalize(); crowd.update(t, { agitation: 1 });
  // foreground wipe: a dark fragment fills the lens 4.72–5.0
  const w = clamp((tt - 4.72) / 0.28);
  wipeRock.visible = w > 0 && w < 1;
  if (wipeRock.visible) { const f = S.camera.getWorldDirection(new THREE.Vector3()); const rt = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    wipeRock.position.copy(S.camera.position).addScaledVector(f, 6).addScaledVector(rt, lerp(-10, 10, w)); wipeRock.scale.setScalar(4.2); wipeRock.rotation.set(t * 2, t, 0.3); }
});
