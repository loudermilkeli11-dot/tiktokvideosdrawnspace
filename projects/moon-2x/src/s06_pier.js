// s06_pier (film 23-28, storyT 20-25): the hook's pier from a new angle. 85 mm crane over the water just off the pier's
// left rail, ~55-65 m behind the crowd at the pier end, rising slowly; past the crowd (all filming) and the hero to the Moon
// over the bay mouth. Opens on the s05 match cut (disc centre (270, 485), r ~125 px) and ends in the hook's state (storyT 25).
import { THREE, createStudio } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { rng, clamp, ease } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: 8, shadows: true, post: { exposure: 1.1, bloom: 0.16, bloomThreshold: 1.6, bloomRadius: 0.6, vignette: 0.5, grain: 0.03, sat: 1.08, contrast: 1.05 } });
const { scene, camera } = S;
const W = bayWorld(S, { shadows: true, pierLights: 6, ocean: { amp: 1.0, level: 1.1 }, bay: { winI: 0.75 } });
const P = W.bay.pier, DECK = P.deckY, PIER_YAW = P.yaw;
// the hook's people, same layout (rng 21): clusters at the rails near the end, a lane down the middle to the hero; all filming
const R = rng(21); const people = [];
for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1; const lx = side * (1.25 + R() * 0.95), lz = -138 - R() * 11;
  const w = P.toWorld(lx, DECK, lz); const rail = Math.abs(lx) > 1.9 && R() < 0.5;
  people.push({ x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + (rail ? -side * 0.35 : (R() - 0.5) * 0.4) }); }
const crowd = createCrowd(S, people, { poses: ['phoneUp', 'filming', 'phoneUp', 'point', 'filming', 'phoneUp', 'handsHead', 'filming', 'phoneUp', 'filming'], rimI: 1.2, phoneI: 7 });
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.4 });
const heroW = P.toWorld(0.1, DECK, -145); hero.root.position.copy(heroW); hero.root.rotation.y = PIER_YAW;
const birds = createBirds(S, 22, { flap: 8 });
// crane: off the left rail over the water, behind the crowd; rises DECK+3 -> DECK+5.5 (eased), drifts 2 m toward the end
const C0 = P.toWorld(-4.6, DECK + 3.0, -84), C1 = P.toWorld(-4.3, DECK + 5.5, -86);
const AIM = P.toWorld(-0.9, DECK, -145);
const PITCH = 3.4 * D2R;                       // horizon ~y 615: crowd below it, against the moon path on the water
const STORY0 = SHOT.s06_pier - 3;
const RPX = (st) => Math.tan(angRadius(st)) * 85 / 18 * 480;   // disc radius, design px at 85 mm
S.run((t) => {
  const tt = clamp(t - 4, 0, 5.2), u = tt / 5, storyT = STORY0 + tt;
  const e = ease.inOutSine(u);
  const pos = C0.clone().lerp(C1, e);
  const h = AIM.clone().sub(pos).setY(0).normalize(); const look = pos.clone().addScaledVector(h, 1000); look.y += Math.tan(PITCH - 0.25 * D2R * e) * 1000;
  applyCam(camera, { pos, look, mm: 85 }, shake(t, 0.1, 0.7, 6));
  // Moon: centre x fixed, top edge held just under the caption band (y 360) so it grows down toward the crowd, as in the hook
  const r = RPX(storyT);
  // the hook's sea, continued backward at its own constant rates (level +0.2 m/s, amp +0.117/s): level 1.1, amp 1.0 at storyT 25
  const level = 1.1 + 0.2 * (tt - 5), amp = 1.0 + 0.117 * (tt - 5);
  W.update(S, t, { storyT, moonScreen: [270, 360 + r], level, amp, flicker: 0.15, shadowCenter: heroW });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(W.md);
  crowd.update(t, { agitation: 0.3 + 0.15 * u });
  hero.root.rotation.set(0, PIER_YAW + Math.sin(t * 0.9) * 0.03, Math.sin(t * 1.3) * 0.012);
  const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
  birds.update(t, (x) => P.toWorld(0, DECK, -140).addScaledVector(fwd, 230).addScaledVector(right, -70 + x * 8).setY(DECK + 17 + Math.sin(x * 0.7) * 1.5), 7, 1.3);
});
