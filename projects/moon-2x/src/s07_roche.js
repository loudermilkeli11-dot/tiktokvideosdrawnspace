// s07_roche (film 28–33, storyT 25–30): the ROCHE LIMIT. From beside the pier base, elevated, 85 mm down the pier.
// The fluid Roche limit (18,400 km between centres) passes at storyT 25.96 (tt 0.96): fracture lines start spreading
// from the tidal axis at a constant rate; by the end the chunks just begin to part. Crowd silhouettes along the pier.
import { createStudio, THREE } from '@engine/engine.js';
import { applyCam, shake, kick } from '@engine/camera.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { createBreakup } from '@engine/breakup.js';
import { clamp, rng } from '@engine/util.js';
import { bayWorld, D2R, SHOT, dirThroughScreen } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: 8, shadows: true, post: { exposure: 1.05, bloom: 0.16, bloomThreshold: 1.6, bloomRadius: 0.6, vignette: 0.5, grain: 0.03, sat: 1.06, contrast: 1.05 } });
const PIER_YAW = 3 * D2R;
const W = bayWorld(S, { shadows: true, pierYaw: PIER_YAW, pierLights: 4 });
const P = W.bay.pier, DECK = P.deckY;
const B = createBreakup(S, { moon: { sunI: 1.3, normalScale: 2.0 } });
const R = rng(77); const people = [];
for (let i = 0; i < 34; i++) { const side = i % 2 ? 1 : -1; const lz = -55 - R() * 95; const lx = side * (0.9 + R() * 1.3);
  const w = P.toWorld(lx, DECK, lz); people.push({ x: w.x, z: w.z, y: DECK, yaw: PIER_YAW + (R() - 0.5) * 0.5 }); }
const crowd = createCrowd(S, people, { poses: ['handsHead', 'phoneUp', 'point', 'filming', 'shade', 'handsHead', 'stand', 'arms'], rimI: 1.4 });
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.5 }); const heroW = P.toWorld(0.0, DECK, -146); hero.root.position.copy(heroW); hero.root.rotation.y = PIER_YAW;
const birds = createBirds(S, 30, { flap: 11 });
const camP = P.toWorld(-6.5, DECK + 2.6, 12);
const fwd = new THREE.Vector3(-Math.sin(PIER_YAW), 0, -Math.cos(PIER_YAW)), right = new THREE.Vector3(Math.cos(PIER_YAW), 0, -Math.sin(PIER_YAW));
const MM = 85, PX_PER_DEG = 960 / (2 * Math.atan(18 / MM) / D2R), TOP = 368, HORIZON_Y = 690;
const ROCHE_TT = 0.96;
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = SHOT.s07_roche - 3 + tt, ang = angRadius(storyT);
  const rpx = ang / D2R * PX_PER_DEG, cy = TOP + rpx;                        // top edge held under the caption band
  const pitch = (HORIZON_Y - 480) / PX_PER_DEG;                              // horizon at y = 690
  const shk = shake(t, 0.07 + 0.25 * kick(tt, ROCHE_TT, 1.6), 1.1);
  const look = camP.clone().addScaledVector(fwd, 1000).addScaledVector(right, 14); look.y += Math.tan(pitch * D2R) * 1000;
  applyCam(S.camera, { pos: camP, look, mm: MM }, shk);
  const md = dirThroughScreen(S.camera, 300, cy);
  const crack = clamp((tt - ROCHE_TT) / 4.0), sep = 0.07 * clamp((tt - 2.2) / 2.8);
  const res = W.update(S, t, { storyT, moonDir: md, moonVisible: false, level: 2.2, amp: 1.5, shadowCenter: heroW, power: 0.35, flicker: 0.35 });
  const sun = W.moon.U.sunDir.value.clone();
  B.update(t, { centre: S.camera.position.clone().addScaledVector(md, W.DIST), radius: W.DIST * Math.sin(ang), md, sunDir: sun, crack, sep, stretch: sep * 0.6, tail: 0,
    airCol: new THREE.Color(0.045, 0.07, 0.14), hot: 0.1 });
  B.U.sunI.value = res.g.moonSunI;
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.5 + 0.4 * crack });
  hero.root.rotation.set(0, PIER_YAW + Math.sin(t * 0.9) * 0.03, 0);
  birds.update(t, (x) => camP.clone().addScaledVector(fwd, 220).addScaledVector(right, 60 - x * 14).setY(DECK + 26 + Math.sin(x) * 2), 9, 1.6);
});
