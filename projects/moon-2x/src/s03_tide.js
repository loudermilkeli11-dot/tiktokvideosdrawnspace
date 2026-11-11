// s03_tide — rung 1 (film 8–13 s, story 5–10 s). 135 mm from the promenade at the bay's left arm, just over the heads of the
// crowd lining the beach, out through the bay mouth to the open sea where the Moon (now 2x closer, and growing) hangs low.
// The surf climbs the beach at a constant rate (level 0.3 -> 2.0 m, amp 0.7 -> 1.3); anchored boats break loose and drift;
// the crowd stirs, phones up. OUT: a blurred whip-pan right (last 0.35 s) toward the lighthouse headland.
import { createStudio, THREE } from '@engine/engine.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { applyCam, shake, whip } from '@engine/camera.js';
import { wedge, sField, groundH } from '@engine/bay.js';
import { clamp, lerp, smoother, rng } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: (t) => (t - 4 > 4.55 ? 16 : 8), shadows: false, post: { exposure: 1.12, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.6, vignette: 0.45, grain: 0.03, sat: 1.06, contrast: 1.05 } });
const { camera } = S;
const W = bayWorld(S, { pierYaw: 3 * D2R, bay: { pierLen: 152 } });
const { bay } = W;
const UP = new THREE.Vector3(0, 1, 0);
const dirB = (bDeg) => new THREE.Vector3(Math.sin(bDeg * D2R), 0, -Math.cos(bDeg * D2R));   // bearing: 0 = out to sea (-Z), + = right
// camera: on the promenade of the bay's left arm (theta -127 deg on the shore circle), looking along the beach to the mouth.
// The terrain mesh is coarse at the seawall, so stand on the highest of the 4 grid corners around the spot.
const TH = -127 * D2R, CR = 836;
const CAM = new THREE.Vector3(CR * Math.sin(TH), 0, -800 + CR * Math.cos(TH));
{ const gx = (i) => { const u = i / 380 * 2 - 1; return Math.sign(u) * Math.pow(Math.abs(u), 1.6) * 2600; }, gz = (j) => { const v = j / 300; return v < 0.1 ? 300 - (v / 0.1) * 295 : 5 - Math.pow((v - 0.1) / 0.9, 1.7) * 3400; };
  const i = Math.floor((Math.sign(CAM.x) * Math.pow(Math.abs(CAM.x) / 2600, 1 / 1.6) + 1) / 2 * 380), j = Math.floor((0.1 + 0.9 * Math.pow((5 - CAM.z) / 3400, 1 / 1.7)) * 300);
  CAM.y = Math.max(groundH(gx(i), gz(j)), groundH(gx(i + 1), gz(j)), groundH(gx(i), gz(j + 1)), groundH(gx(i + 1), gz(j + 1))) + 1.7; }
const B0 = 55.8;                                   // frame centre bearing (the bay mouth); the Moon hangs over the open sea right of it
const MOON_B = 58.6;
// crowd: a wedge scatter on the upper beach along the waterline, everyone facing the Moon
const keep = (x, z) => { const s = sField(x, z); return s > 12 && s < 26; };
const R = rng(33);
const pts = wedge(110, [CAM.x, CAM.z], 53.0 * D2R, 112, 330, 3.2, keep, 12);
const people = pts.map(([x, z]) => ({ x, z, y: groundH(x, z), yaw: -(MOON_B + (R() - 0.5) * 14) * D2R }));
const crowd = createCrowd(S, people, { poses: ['phoneUp', 'phoneUp', 'filming', 'point', 'handsHead', 'stand', 'shade', 'arms', 'phoneUp', 'filming', 'pocket', 'stand'], rimI: 1.2, seed: 9 });
// hero: small, at the front edge of the crowd by the waterline (~120 m: ~52 px tall), phone up at the Moon
let heroW = null; for (let d = 118; d < 150 && !heroW; d += 2) for (let b = 54.6; b > 52.5 && !heroW; b -= 0.2) { const p = CAM.clone().addScaledVector(dirB(b), d); const s = sField(p.x, p.z); if (s > 9 && s < 13) heroW = p; }
heroW = heroW || CAM.clone().addScaledVector(dirB(54), 125); heroW.y = groundH(heroW.x, heroW.z);
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.5 }); hero.root.position.copy(heroW);
// boats: moored in the lagoon and the mouth, in frame; from tt ~1.2 they snap loose and drift (eased), spinning slowly
const BOATS = [[56.4, 260, 0.4, -1.6, 2.2, 0.35], [58.3, 330, 2.0, 2.4, 1.0, -0.3], [59.6, 450, 1.1, 1.8, -0.6, 0.22], [61.0, 240, -0.7, 3.0, 1.4, -0.4],
  [57.5, 760, 2.6, 2.2, -1.2, 0.3], [59.0, 900, 0.2, -1.4, 0.8, 0.25], [60.5, 1050, 1.6, 1.2, 2.6, -0.45]];   // [bearing, dist, yaw, vx, vz, spin]
const boat0 = BOATS.map(([b, d, yaw], i) => { const p = CAM.clone().addScaledVector(dirB(b), d); const bt = bay.boats[i]; bt.L = 6.5 + (i % 3) * 2.2; return { x: p.x, z: p.z, yaw }; });
for (let i = BOATS.length; i < bay.boats.length; i++) bay.boats[i].z = 600;    // the rest wait under the land behind the camera
const birds = createBirds(S, 14, { flap: 10, seed: 8 });
const STORY0 = SHOT.s03_tide - 3;                    // 5: rung 1
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = STORY0 + tt, u = clamp(tt / 5);
  // the sea: constant-rate climb (no easing on story-driven change)
  const level = lerp(0.3, 2.0, u), amp = lerp(0.7, 1.3, u);
  // camera: 135 mm, a slow steady drift right with the boats, handheld shake that grows with the surge; whip-pan right at the end
  const mm = 135, yH = 480, pitch = Math.atan(((yH - 480) / 480) * (18 / mm));
  const bear = B0 + 0.22 * tt + whip(tt, 5 - 0.175, 0.35, 16);
  const dir = dirB(bear); dir.y = Math.tan(pitch); dir.normalize();
  applyCam(camera, { pos: CAM, look: CAM.clone().add(dir), mm, roll: 0 }, shake(t, 0.035 + 0.05 * u, 0.6, 3));
  // boats break loose: eased drift from tt 1.2 (they are props, not the story clock)
  const loose = (k) => { const x = tt - 1.2 - k * 0.15, r = 1.5; return x <= 0 ? 0 : x < r ? x * x / (2 * r) : r / 2 + (x - r); };   // distance under a speed that ramps 0 -> 1 over 1.5 s
  BOATS.forEach(([, , , vx, vz, spin], i) => { const b = bay.boats[i], o = boat0[i], s = loose(i); b.x = o.x + 1.5 * vx * s; b.z = o.z + 1.5 * vz * s; b.yaw = o.yaw + spin * s * 0.5; });
  // Moon: world-fixed bearing over the open sea, low; size from the clock only; lower limb a touch into the haze
  const ang = angRadius(storyT);
  const md = dirB(MOON_B); md.y = Math.tan(ang * 0.85 + 0.02 * D2R); md.normalize();
  W.update(S, t, { storyT, moonDir: md, level, amp, shadowCenter: heroW, wet: u });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.25 + 0.6 * u });
  hero.root.rotation.set(0, -MOON_B * D2R + Math.sin(t * 0.9) * 0.05, Math.sin(t * 1.4) * 0.015);
  // gulls lifting off the beach and wheeling out over the water, right -> left above the horizon
  birds.update(t, (x) => CAM.clone().addScaledVector(dirB(B0 + 3.5 - (x - 4) * 1.6), 190).setY(CAM.y + 3.2 + (x - 4) * 0.35), 5, 0.9);
});
