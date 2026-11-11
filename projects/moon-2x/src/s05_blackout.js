// s05_blackout (film 18-23, storyT 15-20): 85 mm from the flooded promenade across the bay to the far town arm.
// The Moon rises behind the far skyline at a constant rate. Beat: the grid fails: windows flicker, then a blackout sweeps
// the skyline left to right (tt 1.2 -> 2.7) and the last lamps die; moonlight takes over. Hero small in the foreground,
// phone glowing. Out: match cut on the Moon's disc into s06 (ends with the disc centred at (270, 485), r = 127 px).
import { THREE, createStudio } from '@engine/engine.js';
import { applyCam, shake } from '@engine/camera.js';
import { createCrowd, createHero, createBirds } from '@engine/crowd.js';
import { onContour, groundH, sField } from '@engine/bay.js';
import { rng, clamp, ease, lerp } from '@engine/util.js';
import { bayWorld, D2R, SHOT } from './kit.js';
import { angRadius } from './story.js';
const S = createStudio({ samples: 8, shadows: false, post: { exposure: 1.15, bloom: 0.18, bloomThreshold: 1.5, bloomRadius: 0.65, vignette: 0.45, grain: 0.03, sat: 1.05, contrast: 1.05 } });
const { scene, camera } = S;
const W = bayWorld(S, { pierLights: 0, ocean: { amp: 1.0, level: 4.8 } });
const R = rng(55);
// soften the window glass so the low Moon behind the town doesn't throw lamp-like glints during the blackout
{ const m = W.bay.buildings.material, prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { prev(sh, r); sh.fragmentShader = sh.fragmentShader.replace('roughnessFactor = mix(roughnessFactor, 0.15, win);', 'roughnessFactor = mix(roughnessFactor, 0.55, win);'); }; }
// hero on the flooded promenade (left inner shore), camera ~58 m behind on a low terrace, looking NE across the bay
const hp = onContour(Math.sin(-30 * D2R) * 834, -800 + Math.cos(-30 * D2R) * 834, 34);
const heroP = new THREE.Vector3(hp.x, groundH(hp.x, hp.z), hp.z);
const TOWN = new THREE.Vector3(713, 0, -1299);
const heading = new THREE.Vector3(TOWN.x - heroP.x, 0, TOWN.z - heroP.z).normalize(), right = new THREE.Vector3(-heading.z, 0, heading.x);
const CAM0 = heroP.clone().addScaledVector(heading, -58).addScaledVector(right, 2.0); CAM0.y = groundH(CAM0.x, CAM0.z) + 4.2;
const LOOK = CAM0.clone().addScaledVector(heading, 1700); LOOK.y = CAM0.y + Math.tan(2.6 * D2R) * 1700;
// clear the town between the camera and the promenade (buildings inside the narrow view wedge, near the camera)
{ const wedge = (x, z) => { const rx = x - CAM0.x, rz = z - CAM0.z, al = rx * heading.x + rz * heading.z, la = rx * right.x + rz * right.z; return al > -15 && al < 70 && Math.abs(la) < al * 0.14 + 16; };
  const bm = W.bay.buildings, aS = bm.geometry.attributes.aSize, m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < bm.count; i++) { bm.getMatrixAt(i, m4); m4.decompose(p, q, sc); if (!wedge(p.x, p.z)) continue; sc.set(0, 0, 0); m4.compose(p, q, sc); bm.setMatrixAt(i, m4); aS.setY(i, 0.01); }
  bm.instanceMatrix.needsUpdate = true; aS.needsUpdate = true;
  const rt = W.bay.group.children[2];
  for (let i = 0; i < rt.count; i++) { rt.getMatrixAt(i, m4); m4.decompose(p, q, sc); if (!wedge(p.x, p.z)) continue; sc.setScalar(0); m4.compose(p, q, sc); rt.setMatrixAt(i, m4); }
  rt.instanceMatrix.needsUpdate = true;
  const gl = W.bay.glow; for (let i = 0; i < gl.count; i++) { gl.getMatrixAt(i, m4); p.setFromMatrixPosition(m4); if (!wedge(p.x, p.z) || p.y < 9) continue; m4.makeTranslation(p.x, -1e4, p.z); gl.setMatrixAt(i, m4); }
  gl.instanceMatrix.needsUpdate = true; }
const HYAW = Math.atan2(-heading.x, -heading.z);
const hero = createHero(S, { pose: 'phoneUp', rimI: 1.7, phoneI: 9 });
hero.root.position.copy(heroP); hero.root.rotation.y = HYAW;
// crowd on the flooded promenade beside the hero (55-62 m from the camera: <= 80 design px), all facing the bay, phones up
const people = [];
for (const [lat, s0] of [[1.2, 35], [2.4, 33.5], [3.3, 36], [4.6, 34], [5.6, 35.5], [6.8, 33.5], [-5.6, 34.5], [-6.9, 36], [-8.0, 33.5], [8.2, 35]]) {
  let p = null; for (let al = 48; al < 66; al += 0.25) { const g = CAM0.clone().addScaledVector(heading, al).addScaledVector(right, lat); if (sField(g.x, g.z) <= s0) { p = g; break; } }
  if (p) people.push({ x: p.x, z: p.z, y: groundH(p.x, p.z), yaw: HYAW + (R() - 0.5) * 0.4 }); }
const crowd = createCrowd(S, people, { rimI: 1.3, phoneI: 8, poses: ['phoneUp', 'filming', 'phoneUp', 'point', 'handsHead', 'filming', 'stand', 'phoneUp', 'shade', 'filming'] });
const birds = createBirds(S, 24, { flap: 8 });
const STORY0 = SHOT.s05_blackout - 3;
// the Moon rises behind the skyline at a constant rate and lands where s06 opens: centre (270, 485)
const MOON_END = [270, 485];
const BX0 = 430, BX1 = 1130, TB0 = 1.2, TB1 = 2.7;      // blackout sweep: world-x range of the far town, constant speed
S.run((t) => {
  const tt = clamp(t - 4, 0, 5.2), u = tt / 5, storyT = STORY0 + tt;
  const e = ease.inOutSine(u);
  const pos = CAM0.clone().addScaledVector(right, -0.8 + 1.6 * e); pos.y += 0.3 * e;
  applyCam(camera, { pos, look: LOOK, mm: 85 }, shake(t, 0.12, 0.8, 9));
  const my = MOON_END[1] + (5 - tt) * 11;                 // constant rise (11 design px/s) while the disc grows
  // grid failure: flicker builds before the sweep, the sweep runs at constant speed, then everything left is dark
  const flicker = tt < TB0 ? 0.85 * clamp((tt - 0.5) / 0.7) : tt < TB1 ? 0.6 : 0;
  const blackX = tt < TB0 ? -1e5 : tt < TB1 ? lerp(BX0, BX1, (tt - TB0) / (TB1 - TB0)) : 1e5;
  const level = 4.8 - 0.06 * tt;
  W.update(S, t, { storyT, moonScreen: [MOON_END[0], my], level, amp: 1.1, flicker, blackX, wet: 0.8, shadowCenter: heroP });
  for (const m of [crowd.material, hero.material]) m.U.rimDir.value.copy(W.md);
  crowd.update(t, { agitation: tt < TB0 ? 0.5 : 0.8 });
  hero.root.rotation.set(0, HYAW + Math.sin(t * 0.7) * 0.03, Math.sin(t * 1.2) * 0.01);
  birds.update(t, (x) => heroP.clone().addScaledVector(heading, 420).addScaledVector(right, -120 + x * 16).setY(38 + Math.sin(x * 0.5) * 3), 10, 1.5);
});
