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
const S = createStudio({ samples: (t) => (t - 4 > 4.62 ? 16 : 8), shadows: false, post: { exposure: 1.12, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.6, vignette: 0.45, grain: 0.03, sat: 1.06, contrast: 1.05 } });
const { camera } = S;
const W = bayWorld(S, { pierYaw: 3 * D2R, bay: { pierLen: 152 }, ocean: { reflScale: 0.35 } });   // the standard pier (as in the hook)
const { bay } = W;
const UP = new THREE.Vector3(0, 1, 0);
const dirB = (bDeg) => new THREE.Vector3(Math.sin(bDeg * D2R), 0, -Math.cos(bDeg * D2R));   // bearing: 0 = out to sea (-Z), + = right
// camera: at the head of the beach below the promenade, 14 m left of the pier's root, eye ~1.5 m over the sand: the lower
// beach and the surf fill the bottom of frame (the sea climbs toward us); the pier runs out on the right with the crowd along it,
// silhouetted against the open sea in the bay mouth.
// (Geometry note: a crowd ON the beach at <= 80 px must be >= 77 m away, which from any inner-shore promenade is open water,
//  so the waterline crowd stands along the pier, the bay's other waterline.)
const PIER_YAW = 3 * D2R, P = bay.pier, DECK = P.deckY;
const CAM = new THREE.Vector3(-74, 0, 22); CAM.y = groundH(CAM.x, CAM.z) + 1.5;
const B0 = 0.3;                                    // frame centre bearing: the bay mouth; pier end right of centre
const MOON_B = -1.2;                               // over the open sea in the mouth, left of the pier end
// crowd: wedge scatter along the pier deck from 82 m out to its end, everyone facing the Moon (<= 75 px tall)
const onPier = (x, z) => { const dx = x - P.base.x, dz = z - (P.base.z + 4); const lx = dx * Math.cos(PIER_YAW) - dz * Math.sin(PIER_YAW), lz = dx * Math.sin(PIER_YAW) + dz * Math.cos(PIER_YAW); return Math.abs(lx) < 2.05 && lz < -92 && lz > -150; };
const R = rng(33);
const pm = P.toWorld(0, DECK, -122), pierB = Math.atan2(pm.x - CAM.x, -(pm.z - CAM.z));
const pts = wedge(40, [CAM.x, CAM.z], pierB, 100, 185, 2.5, onPier, 12);
const people = pts.map(([x, z]) => ({ x, z, y: DECK, yaw: -(MOON_B + (R() - 0.5) * 16) * D2R }));
const crowd = createCrowd(S, people, { poses: ['phoneUp', 'phoneUp', 'filming', 'point', 'handsHead', 'stand', 'shade', 'arms', 'phoneUp', 'filming', 'pocket', 'rail'], rimI: 1.3, seed: 9 });
// hero: small, at the pier's left rail ~130 m from camera (~48 px tall), phone up at the Moon
const heroW = P.toWorld(-1.4, DECK, -108);
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.6 }); hero.root.position.copy(heroW);
// boats: moored in the lagoon and the mouth, in frame; from tt ~1.2 they snap loose and drift (eased), spinning slowly
const BOATS = [[-2.6, 300, 0.4, 2.2, 1.6, 0.35], [-0.6, 440, 2.0, 2.6, 1.0, -0.3], [-3.4, 580, 1.1, 1.8, 1.2, 0.22], [0.9, 700, -0.7, 3.0, 1.4, -0.4],
  [-1.9, 920, 2.6, 2.2, -1.2, 0.3], [0.2, 1180, 0.2, 1.4, 0.8, 0.25], [-1.2, 250, 1.6, 1.2, 2.6, -0.45], [3.6, 640, 2.2, -1.5, 1.8, 0.3]];   // [bearing, dist, yaw, vx, vz, spin]
const boat0 = BOATS.map(([b, d, yaw], i) => { const p = CAM.clone().addScaledVector(dirB(b), d); const bt = bay.boats[i]; bt.L = 6.5 + (i % 3) * 2.2; return { x: p.x, z: p.z, yaw }; });
for (let i = BOATS.length; i < bay.boats.length; i++) bay.boats[i].z = 600;
bay.U.lampI.value = 0.5;    // the rest wait under the land behind the camera
const birds = createBirds(S, 14, { flap: 10, seed: 8 });
const STORY0 = SHOT.s03_tide - 3;                    // 5: rung 1
S.run((t) => {
  const tt = Math.max(t - 4, 0), storyT = STORY0 + tt, u = clamp(tt / 5);
  // the sea: constant-rate climb (no easing on story-driven change)
  const level = lerp(0.3, 2.0, u), amp = lerp(0.7, 1.3, u);
  // camera: 135 mm, a slow steady drift right with the boats, handheld shake that grows with the surge; whip-pan right at the end
  // (the whip accelerates over the last 0.35 s and the cut lands at its fastest, mid-blur; 16 sub-frames there)
  const mm = 135, yH = 440, pitch = Math.atan(((yH - 480) / 480) * (18 / mm));
  const bear = B0 + 0.22 * tt + whip(tt, 5.0, 0.7, 24);
  const dir = dirB(bear); dir.y = Math.tan(pitch); dir.normalize();
  applyCam(camera, { pos: CAM, look: CAM.clone().add(dir), mm, roll: 0 }, shake(t, 0.035 + 0.05 * u, 0.6, 3));
  // boats break loose: eased drift from tt 1.2 (they are props, not the story clock)
  const loose = (k) => { const x = tt - 1.2 - k * 0.15, r = 1.5; return x <= 0 ? 0 : x < r ? x * x / (2 * r) : r / 2 + (x - r); };   // distance under a speed that ramps 0 -> 1 over 1.5 s
  BOATS.forEach(([, , , vx, vz, spin], i) => { const b = bay.boats[i], o = boat0[i], s = loose(i); b.x = o.x + 1.5 * vx * s; b.z = o.z + 1.5 * vz * s; b.yaw = o.yaw + spin * s * 0.5; });
  // Moon: world-fixed, centre 0.36 deg up over the open sea: it swells (size from the clock only) and its lower limb sinks into the sea haze
  const ang = angRadius(storyT);
  const md = dirB(MOON_B); md.y = Math.tan(0.36 * D2R); md.normalize();
  W.update(S, t, { storyT, moonDir: md, level, amp, shadowCenter: heroW, wet: u });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(md);
  crowd.update(t, { agitation: 0.25 + 0.6 * u });
  hero.root.rotation.set(0, -MOON_B * D2R + Math.sin(t * 0.9) * 0.05, Math.sin(t * 1.4) * 0.015);
  // gulls lifting off the beach and wheeling out over the water, right -> left above the horizon
  birds.update(t, (x) => CAM.clone().addScaledVector(dirB(B0 + 4.5 - (x - 4) * 1.7), 230).setY(CAM.y + 5.5 + (x - 4) * 0.3), 6, 0.9);
});
